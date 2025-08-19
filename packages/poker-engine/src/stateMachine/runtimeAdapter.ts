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
  private debugMode: boolean = true // Temporary debug flag

  constructor(
    originalRuntime: any,
    options: StateMachineRuntimeOptions,
    callbacks: StateMachineRuntimeCallbacks
  ) {
    this.originalRuntime = originalRuntime
    this.options = options
    this.callbacks = callbacks
    this.isEnabled = options.enableStateMachine

    if (this.debugMode) {
      console.log('🔧 [StateMachine] Adapter created with options:', {
        enableStateMachine: this.isEnabled,
        enableTimerIntegration: this.options.enableTimerIntegration,
        enablePerformanceMonitoring: this.options.enablePerformanceMonitoring
      })
    }

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

    if (this.debugMode) {
      console.log('🔧 [StateMachine] Initializing with runtime state:', {
        status: currentState.status,
        handId: currentState.handId,
        street: currentState.street,
        currentToAct: currentState.currentToAct,
        seatsCount: currentState.seats.length
      })
    }

    // Extract player information from current runtime
    const playerIds = currentState.seats
      .filter((seat: SeatState) => seat.stack > 0)
      .map((seat: SeatState) => seat.seatIndex)

    const playerStacks = new Map<number, number>(
      currentState.seats
        .filter((seat: SeatState) => seat.stack > 0)
        .map((seat: SeatState) => [seat.seatIndex, seat.stack])
    )

    if (this.debugMode) {
      console.log('🔧 [StateMachine] Extracted player info:', {
        playerIds: Array.from(playerIds),
        playerStacks: Object.fromEntries(playerStacks)
      })
    }

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

    if (this.debugMode) {
      console.log('🔧 [StateMachine] State machine initialized successfully')
    }

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

    if (this.debugMode) {
      console.log('🔧 [StateMachine] Syncing runtime state to state machine:', {
        status: currentState.status,
        handId: currentState.handId,
        street: currentState.street
      })
    }

    // Map runtime state to state machine events
    if (currentState.status === 'idle') {
      if (this.debugMode) {
        console.log('🔧 [StateMachine] Sending PLAYERS_READY event')
      }
      this.stateMachine.processGameEvent({ type: 'PLAYERS_READY' })
    } else if (currentState.status === 'in_hand') {
      if (this.debugMode) {
        console.log('🔧 [StateMachine] Sending START_HAND event')
      }
      this.stateMachine.processGameEvent({ type: 'START_HAND' })
    }
  }

    /**
   * Process a betting action through the state machine
   */
  processAction(seatIndex: number, action: BettingAction): TimedActionResult | null {
    if (!this.isEnabled || !this.stateMachine) {
      if (this.debugMode) {
        console.log('🔧 [StateMachine] Action processing skipped - not enabled or no state machine')
      }
      return null
    }

    if (this.debugMode) {
      console.log('🔧 [StateMachine] Processing action:', {
        seatIndex,
        action,
        currentState: this.stateMachine.getGameState(),
        handState: this.stateMachine.getHandState()
      })
    }

    try {
      // Process action through state machine
      const result = this.stateMachine.processPlayerAction(seatIndex, action)
      
      if (this.debugMode) {
        console.log('🔧 [StateMachine] Action processed successfully:', {
          success: result.success,
          error: result.error,
          newState: result.currentState,
          timerEvents: result.timerEvents?.length || 0,
          performance: result.performance
        })
      }
      
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
      console.error('🔧 [StateMachine] Error processing action through state machine:', error)
      return null
    }
  }

  /**
   * Process a game event through the state machine
   */
  processGameEvent(event: GameEvent): TimedActionResult | null {
    if (!this.isEnabled || !this.stateMachine) {
      if (this.debugMode) {
        console.log('🔧 [StateMachine] Game event processing skipped - not enabled or no state machine')
      }
      return null
    }

    if (this.debugMode) {
      console.log('🔧 [StateMachine] Processing game event:', {
        event,
        currentState: this.stateMachine.getGameState(),
        handState: this.stateMachine.getHandState()
      })
    }

    try {
      const result = this.stateMachine.processGameEvent(event)
      
      if (this.debugMode) {
        console.log('🔧 [StateMachine] Game event processed successfully:', {
          success: result.success,
          error: result.error,
          newState: result.currentState,
          timerEvents: result.timerEvents?.length || 0,
          performance: result.performance
        })
      }
      
      // Notify callbacks
      this.callbacks.onStateMachineEvent?.(event, result)

      if (this.options.enablePerformanceMonitoring && result.performance) {
        this.callbacks.onPerformanceUpdate?.(result.performance)
      }

      // Sync state back to runtime if needed
      this.syncStateFromStateMachine()

      return result
    } catch (error) {
      console.error('🔧 [StateMachine] Error processing game event through state machine:', error)
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

    if (this.debugMode) {
      console.log('🔧 [StateMachine] Syncing state machine state to runtime:', {
        gameState: gameState.type,
        handState: handState?.type,
        runtimeStatus: this.originalRuntime.state.status
      })
    }

    // Update runtime state based on state machine
    if (gameState.type === 'game_over') {
      // Handle game over
      if (this.debugMode) {
        console.log('🔧 [StateMachine] Updating runtime to game_over status')
      }
      this.originalRuntime.state.gameOver = true
      this.originalRuntime.state.status = 'hand_over'
    } else if (gameState.type === 'hand_in_progress') {
      // Handle in-hand state
      if (handState?.type === 'hand_complete') {
        if (this.debugMode) {
          console.log('🔧 [StateMachine] Updating runtime to hand_over status')
        }
        this.originalRuntime.state.status = 'hand_over'
      } else if (handState?.type === 'betting_round') {
        if (this.debugMode) {
          console.log('🔧 [StateMachine] Updating runtime to in_hand status with street:', handState.street)
        }
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
    const summary = this.stateMachine?.getPerformanceSummary() ?? null
    
    if (this.debugMode && summary) {
      console.log('🔧 [StateMachine] Performance summary:', summary)
    }
    
    return summary
  }

  /**
   * Get timer statistics
   */
  getTimerStats(): any {
    const stats = this.stateMachine?.getTimerStats() ?? null
    
    if (this.debugMode && stats) {
      console.log('🔧 [StateMachine] Timer statistics:', stats)
    }
    
    return stats
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
   * Toggle debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled
    if (enabled) {
      console.log('🔧 [StateMachine] Debug mode enabled')
    } else {
      console.log('🔧 [StateMachine] Debug mode disabled')
    }
  }

  /**
   * Get debug mode status
   */
  isDebugModeEnabled(): boolean {
    return this.debugMode
  }

  /**
   * Log current state machine state for debugging
   */
  logCurrentState(): void {
    if (!this.debugMode || !this.stateMachine) return
    
    console.log('🔧 [StateMachine] Current state machine state:', {
      gameState: this.stateMachine.getGameState(),
      handState: this.stateMachine.getHandState(),
      context: this.stateMachine.getContext(),
      performance: this.stateMachine.getPerformanceSummary(),
      timers: this.stateMachine.getTimerStats()
    })
  }

  /**
   * Dispose of the adapter
   */
  dispose(): void {
    if (this.debugMode) {
      console.log('🔧 [StateMachine] Disposing adapter')
    }
    
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
    const status = {
      enabled: this.isEnabled,
      stateMachineActive: this.stateMachine !== null,
      timerIntegration: this.options.enableTimerIntegration,
      performanceMonitoring: this.options.enablePerformanceMonitoring
    }
    
    if (this.debugMode) {
      console.log('🔧 [StateMachine] Adapter status:', status)
    }
    
    return status
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
