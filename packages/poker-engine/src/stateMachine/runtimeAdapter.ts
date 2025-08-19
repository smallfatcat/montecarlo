/**
 * Runtime Adapter for State Machine Integration
 * Bridges the gap between our state machines and the existing PokerRuntime
 */

import { TimedPokerStateMachine } from './timedPokerMachine.js'
import type { 
  GameState, 
  GameEvent
} from './types.js'
import type { 
  BettingAction 
} from '../types.js'
import type { 
  TimedActionResult 
} from './timedPokerMachine.js'
import type { 
  PokerTableState, 
  SeatState
} from '../types.js'
import type { 
  RuntimeCallbacks,
  RuntimeOptions 
} from '../runtime/PokerRuntime.js'
import type { TimerCallbacks } from './timerTypes.js'

export interface StateMachineRuntimeOptions extends RuntimeOptions {
  // State machine specific options
  enableStateMachine: boolean
  enableTimerIntegration: boolean
  enablePerformanceMonitoring: boolean
  // Timer configuration
  defaultPlayerTimeout: number
  defaultCpuTimeout: number
  defaultAutoDealDelay: number
}

export interface StateMachineRuntimeCallbacks extends RuntimeCallbacks {
  // State machine specific callbacks
  onStateMachineEvent?: (event: GameEvent, result: TimedActionResult) => void
  onTimerEvent?: (timerType: string, action: 'started' | 'cancelled' | 'completed') => void
  onPerformanceUpdate?: (metrics: {
    actionTime: number
    averageActionTime: number
    activeTimers: number
  }) => void
}

export class StateMachineRuntimeAdapter {
  private stateMachine: TimedPokerStateMachine | null = null
  private originalRuntime: any = null
  private options: StateMachineRuntimeOptions
  private callbacks: StateMachineRuntimeCallbacks
  private isEnabled: boolean = false

  constructor(
    originalRuntime: any,
    options: StateMachineRuntimeOptions,
    callbacks: StateMachineRuntimeCallbacks
  ) {
    this.originalRuntime = originalRuntime
    this.options = options
    this.callbacks = callbacks
    this.isEnabled = options.enableStateMachine

    if (this.isEnabled) {
      this.initializeStateMachine()
    }
  }

  /**
   * Initialize the state machine with current runtime state
   */
  private initializeStateMachine(): void {
    if (!this.originalRuntime) return

    const currentState = this.originalRuntime.state
    if (!currentState) return

    // Extract player information from current runtime
    const playerIds = currentState.seats
      .filter((seat: SeatState) => seat.stack > 0)
      .map((seat: SeatState) => seat.seatIndex)

    const playerStacks = new Map<number, number>(
      currentState.seats
        .filter((seat: SeatState) => seat.stack > 0)
        .map((seat: SeatState) => [seat.seatIndex, seat.stack])
    )

    // Create timer callbacks
    const timerCallbacks: TimerCallbacks = {
      onCpuAction: (playerId) => this.handleCpuAction(playerId),
      onPlayerAction: (playerId) => this.handlePlayerTimeout(playerId),
      onAutoDeal: () => this.handleAutoDeal(),
      onWatchdog: (playerId) => this.handleWatchdog(playerId),
      onStreetTimeout: (street) => this.handleStreetTimeout(street),
      onHandTimeout: () => this.handleHandTimeout(),
    }

    // Initialize state machine
    this.stateMachine = new TimedPokerStateMachine(
      playerIds,
      playerStacks,
      timerCallbacks,
      this.options.enableTimerIntegration,
      this.options.enableTimerIntegration
    )

    // Configure timeouts
    this.stateMachine.setPlayerTimeout(0, this.options.defaultPlayerTimeout)
    this.stateMachine.setPlayerTimeout(1, this.options.defaultPlayerTimeout)
    this.stateMachine.setPlayerTimeout(2, this.options.defaultPlayerTimeout)

    // Sync initial state
    this.syncStateToStateMachine()
  }

  /**
   * Sync current runtime state to state machine
   */
  private syncStateToStateMachine(): void {
    if (!this.stateMachine || !this.originalRuntime) return

    const currentState = this.originalRuntime.state
    if (!currentState) return

    // Map runtime state to state machine events
    if (currentState.status === 'idle') {
      this.stateMachine.processGameEvent({ type: 'PLAYERS_READY' })
    } else if (currentState.status === 'in_hand') {
      this.stateMachine.processGameEvent({ type: 'START_HAND' })
    }
  }

  /**
   * Process a betting action through the state machine
   */
  processAction(seatIndex: number, action: BettingAction): TimedActionResult | null {
    if (!this.isEnabled || !this.stateMachine) {
      return null
    }

    try {
      // Process action through state machine
      const result = this.stateMachine.processPlayerAction(seatIndex, action)
      
              // Notify callbacks
        this.callbacks.onStateMachineEvent?.(
          { type: 'PLAYER_ACTION', playerIndex: seatIndex, action },
          result
        )

      if (this.options.enablePerformanceMonitoring && result.performance) {
        this.callbacks.onPerformanceUpdate?.(result.performance)
      }

      // Sync state back to runtime if needed
      this.syncStateFromStateMachine()

      return result
    } catch (error) {
      console.error('Error processing action through state machine:', error)
      return null
    }
  }

  /**
   * Process a game event through the state machine
   */
  processGameEvent(event: GameEvent): TimedActionResult | null {
    if (!this.isEnabled || !this.stateMachine) {
      return null
    }

    try {
      const result = this.stateMachine.processGameEvent(event)
      
      // Notify callbacks
      this.callbacks.onStateMachineEvent?.(event, result)

      if (this.options.enablePerformanceMonitoring && result.performance) {
        this.callbacks.onPerformanceUpdate?.(result.performance)
      }

      // Sync state back to runtime if needed
      this.syncStateFromStateMachine()

      return result
    } catch (error) {
      console.error('Error processing game event through state machine:', error)
      return null
    }
  }

  /**
   * Sync state machine state back to runtime
   */
  private syncStateFromStateMachine(): void {
    if (!this.stateMachine || !this.originalRuntime) return

    const gameState = this.stateMachine.getGameState()
    const handState = this.stateMachine.getHandState()

    // Update runtime state based on state machine
    if (gameState.type === 'game_over') {
      // Handle game over
      this.originalRuntime.state.gameOver = true
      this.originalRuntime.state.status = 'hand_over'
    } else if (gameState.type === 'hand_in_progress') {
      // Handle in-hand state
      if (handState?.type === 'hand_complete') {
        this.originalRuntime.state.status = 'hand_over'
      } else if (handState?.type === 'betting_round') {
        this.originalRuntime.state.status = 'in_hand'
        this.originalRuntime.state.street = handState.street
      }
    }

    // Notify runtime of state change
    this.originalRuntime.cb?.onState?.(this.originalRuntime.state)
  }

  /**
   * Handle CPU action timeout
   */
  private handleCpuAction(playerId: number): void {
    if (!this.originalRuntime) return

    // Use existing CPU action logic
    const suggestedAction = this.originalRuntime.suggestCpuAction?.()
    if (suggestedAction) {
      this.originalRuntime.act(suggestedAction)
    }
  }

  /**
   * Handle player action timeout
   */
  private handlePlayerTimeout(playerId: number): void {
    if (!this.originalRuntime) return

    // Auto-fold on timeout
    this.originalRuntime.act({ type: 'fold' })
  }

  /**
   * Handle auto-deal timeout
   */
  private handleAutoDeal(): void {
    if (!this.originalRuntime) return

    // Start next hand
    this.originalRuntime.beginHand?.()
  }

  /**
   * Handle watchdog timeout
   */
  private handleWatchdog(playerId: number): void {
    if (!this.originalRuntime) return

    // Force CPU action
    const suggestedAction = this.originalRuntime.suggestCpuAction?.()
    if (suggestedAction) {
      this.originalRuntime.act(suggestedAction)
    }
  }

  /**
   * Handle street timeout
   */
  private handleStreetTimeout(street: string): void {
    if (!this.originalRuntime) return

    // Force street completion
    // This would need to be implemented based on the specific street logic
    console.log(`Street timeout for ${street} - forcing completion`)
  }

  /**
   * Handle hand timeout
   */
  private handleHandTimeout(): void {
    if (!this.originalRuntime) return

    // Force hand completion
    this.originalRuntime.state.status = 'hand_over'
    this.originalRuntime.cb?.onState?.(this.originalRuntime.state)
  }

  /**
   * Get current state machine state
   */
  getStateMachineState(): GameState | null {
    return this.stateMachine?.getGameState() ?? null
  }

  /**
   * Get current hand state
   */
  getHandState(): any {
    return this.stateMachine?.getHandState() ?? null
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): any {
    return this.stateMachine?.getPerformanceSummary() ?? null
  }

  /**
   * Get timer statistics
   */
  getTimerStats(): any {
    return this.stateMachine?.getTimerStats() ?? null
  }

  /**
   * Enable/disable state machine
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (enabled && !this.stateMachine) {
      this.initializeStateMachine()
    } else if (!enabled && this.stateMachine) {
      this.stateMachine.dispose()
      this.stateMachine = null
    }
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<StateMachineRuntimeOptions>): void {
    this.options = { ...this.options, ...newOptions }
    
    if (this.stateMachine) {
      this.stateMachine.setAutoPlay(this.options.enableTimerIntegration)
      this.stateMachine.setAutoDeal(this.options.enableTimerIntegration)
    }
  }

  /**
   * Dispose of the adapter
   */
  dispose(): void {
    if (this.stateMachine) {
      this.stateMachine.dispose()
      this.stateMachine = null
    }
  }

  /**
   * Check if state machine is enabled
   */
  isStateMachineEnabled(): boolean {
    return this.isEnabled && this.stateMachine !== null
  }

  /**
   * Get adapter status
   */
  getStatus(): {
    enabled: boolean
    stateMachineActive: boolean
    timerIntegration: boolean
    performanceMonitoring: boolean
  } {
    return {
      enabled: this.isEnabled,
      stateMachineActive: this.stateMachine !== null,
      timerIntegration: this.options.enableTimerIntegration,
      performanceMonitoring: this.options.enablePerformanceMonitoring
    }
  }
}

/**
 * Factory function to create a state machine runtime adapter
 */
export function createStateMachineRuntimeAdapter(
  originalRuntime: any,
  options: Partial<StateMachineRuntimeOptions> = {},
  callbacks: Partial<StateMachineRuntimeCallbacks> = {}
): StateMachineRuntimeAdapter {
  const defaultOptions: StateMachineRuntimeOptions = {
    seats: 6,
    cpuSeats: [],
    startingStack: 1000,
    enableStateMachine: true,
    enableTimerIntegration: true,
    enablePerformanceMonitoring: true,
    defaultPlayerTimeout: 30000,
    defaultCpuTimeout: 1000,
    defaultAutoDealDelay: 2000,
    ...options
  }

  const defaultCallbacks: StateMachineRuntimeCallbacks = {
    onState: () => {},
    ...callbacks
  }

  return new StateMachineRuntimeAdapter(originalRuntime, defaultOptions, defaultCallbacks)
}
