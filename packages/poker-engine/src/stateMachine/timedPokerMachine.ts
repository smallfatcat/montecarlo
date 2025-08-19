/**
 * Timed Poker State Machine
 * Enhanced version with integrated timer management and advanced features
 */

import { IntegratedPokerStateMachine } from './integratedPokerMachine.js'
import { StateMachineTimerManager } from './timerManager.js'
import type { 
  GameState, 
  GameEvent
} from './types.js'
import type { 
  BettingAction 
} from '../types.js'
import type { 
  HandProgressionState,
  HandProgressionContext
} from './handProgressionTypes.js'
import type { 
  TimerType, 
  TimerCallbacks,
  TimerConfig 
} from './timerTypes.js'
import type { 
  HandProgressionEvent,
  BettingRoundContext 
} from './handProgressionTypes.js'

export interface TimedPokerContext {
  // Core game state
  gameState: GameState
  handState: HandProgressionState | null
  handContext: HandProgressionContext | null
  
  // Timer management
  timerManager: StateMachineTimerManager
  activeTimers: Set<TimerType>
  
  // Game configuration
  autoPlayEnabled: boolean
  autoDealEnabled: boolean
  playerTimeouts: Map<number, number>
  
  // Performance tracking
  lastActionTime: number
  averageActionTime: number
  actionCount: number
}

export interface TimedActionResult {
  success: boolean
  error?: string
  message?: string
  currentState: GameState
  timerEvents?: Array<{ type: TimerType; action: 'started' | 'cancelled' | 'completed' }>
  performance?: {
    actionTime: number
    averageActionTime: number
    activeTimers: number
  }
}

export class TimedPokerStateMachine {
  private baseMachine: IntegratedPokerStateMachine
  private timerManager: StateMachineTimerManager
  private context: TimedPokerContext

  constructor(
    playerIds: number[],
    initialStacks: Map<number, number>,
    timerCallbacks: TimerCallbacks = {},
    autoPlayEnabled: boolean = true,
    autoDealEnabled: boolean = true
  ) {
    this.baseMachine = new IntegratedPokerStateMachine(playerIds, initialStacks)
    
    this.timerManager = new StateMachineTimerManager({
      onCpuAction: (playerId) => this.handleCpuAction(playerId),
      onPlayerAction: (playerId) => this.handlePlayerTimeout(playerId),
      onAutoDeal: () => this.handleAutoDeal(),
      onWatchdog: (playerId) => this.handleWatchdog(playerId),
      onStreetTimeout: (street) => this.handleStreetTimeout(street),
      onHandTimeout: () => this.handleHandTimeout(),
      ...timerCallbacks
    })

    this.context = {
      gameState: this.baseMachine.getGameState(),
      handState: this.baseMachine.getHandState(),
      handContext: this.baseMachine.getHandContext(),
      timerManager: this.timerManager,
      activeTimers: new Set(),
      autoPlayEnabled,
      autoDealEnabled,
      playerTimeouts: new Map(),
      lastActionTime: Date.now(),
      averageActionTime: 0,
      actionCount: 0
    }
  }

  /**
   * Get current game state
   */
  getGameState(): GameState {
    return this.context.gameState
  }

  /**
   * Get current hand state
   */
  getHandState(): HandProgressionState | null {
    return this.context.handState
  }

  /**
   * Get complete context
   */
  getContext(): Readonly<TimedPokerContext> {
    return this.context
  }

  /**
   * Get timer statistics
   */
  getTimerStats() {
    return this.timerManager.getTimerStats()
  }

  /**
   * Process a game event with timer integration
   */
  processGameEvent(event: GameEvent): TimedActionResult {
    const startTime = Date.now()
    
    // Process the event in the base machine
    const result = this.baseMachine.processGameEvent(event)
    
    // Update our context
    this.context.gameState = this.baseMachine.getGameState()
    this.context.handState = this.baseMachine.getHandState()
    this.context.handContext = this.baseMachine.getHandContext()
    
    // Handle timer-related events
    const timerEvents = this.handleGameEventTimers(event)
    
    // Update performance metrics
    const actionTime = Date.now() - startTime
    this.updatePerformanceMetrics(actionTime)
    
    return {
      success: result.success,
      error: result.error,
      message: result.message,
      currentState: this.context.gameState,
      timerEvents,
      performance: {
        actionTime,
        averageActionTime: this.context.averageActionTime,
        activeTimers: this.timerManager.getAllActiveTimers().length
      }
    }
  }

  /**
   * Process a player action with timer management
   */
  processPlayerAction(playerId: number, action: BettingAction): TimedActionResult {
    const startTime = Date.now()
    
    // Cancel any active timers for this player
    this.cancelPlayerTimers(playerId)
    
    // Process the action
    const result = this.baseMachine.processPlayerAction(playerId, action)
    
    // Update context
    this.context.gameState = this.baseMachine.getGameState()
    this.context.handState = this.baseMachine.getHandState()
    this.context.handContext = this.baseMachine.getHandContext()
    
    // Start new timers if needed
    const timerEvents = this.handlePlayerActionTimers(playerId, action)
    
    // Update performance metrics
    const actionTime = Date.now() - startTime
    this.updatePerformanceMetrics(actionTime)
    
    return {
      success: result.success,
      error: result.error,
      message: result.message,
      currentState: this.context.gameState,
      timerEvents,
      performance: {
        actionTime,
        averageActionTime: this.context.averageActionTime,
        activeTimers: this.timerManager.getAllActiveTimers().length
      }
    }
  }

  /**
   * Start a specific timer
   */
  startTimer(config: TimerConfig): number | null {
    const timerId = this.timerManager.startTimer(config)
    if (timerId !== null) {
      this.context.activeTimers.add(config.type)
    }
    return timerId
  }

  /**
   * Start player action timer
   */
  startPlayerActionTimer(playerId: number, delayMs?: number): number | null {
    const timerId = this.timerManager.startPlayerActionTimer(playerId, delayMs)
    if (timerId !== null) {
      this.context.activeTimers.add('player_action')
    }
    return timerId
  }

  /**
   * Start CPU action timer
   */
  startCpuActionTimer(playerId: number, delayMs?: number): number | null {
    const timerId = this.timerManager.startCpuActionTimer(playerId, delayMs)
    if (timerId !== null) {
      this.context.activeTimers.add('cpu_action')
    }
    return timerId
  }

  /**
   * Restart a timer with optional new delay
   */
  restartTimer(timerType: TimerType, newDelayMs?: number): boolean {
    return this.timerManager.restartTimer(timerType, newDelayMs)
  }

  /**
   * Cancel a specific timer
   */
  cancelTimer(timerType: TimerType): boolean {
    const cancelled = this.timerManager.cancelTimer(timerType)
    if (cancelled) {
      this.context.activeTimers.delete(timerType)
    }
    return cancelled
  }

  /**
   * Cancel all timers
   */
  cancelAllTimers(): void {
    this.timerManager.cancelAllTimers()
    this.context.activeTimers.clear()
  }

  /**
   * Get remaining time for a timer
   */
  getTimerRemainingTime(timerType: TimerType): number {
    return this.timerManager.getRemainingTime(timerType)
  }

  /**
   * Check if a timer is active
   */
  isTimerActive(timerType: TimerType): boolean {
    return this.timerManager.isTimerActive(timerType)
  }

  /**
   * Update auto-play settings
   */
  setAutoPlay(enabled: boolean): void {
    this.context.autoPlayEnabled = enabled
    if (!enabled) {
      this.cancelAllTimers()
    } else {
      this.rearmTimers()
    }
  }

  /**
   * Update auto-deal settings
   */
  setAutoDeal(enabled: boolean): void {
    this.context.autoDealEnabled = enabled
    if (!enabled) {
      this.timerManager.cancelTimer('auto_deal')
      this.context.activeTimers.delete('auto_deal')
    } else if (this.context.handState?.type === 'hand_complete') {
      this.startAutoDealTimer()
    }
  }

  /**
   * Set player timeout
   */
  setPlayerTimeout(playerId: number, timeoutMs: number): void {
    this.context.playerTimeouts.set(playerId, timeoutMs)
  }

  /**
   * Get player timeout
   */
  getPlayerTimeout(playerId: number): number {
    return this.context.playerTimeouts.get(playerId) ?? 30000 // Default 30 seconds
  }

  /**
   * Rearm timers based on current state
   */
  rearmTimers(): void {
    this.cancelAllTimers()
    
    if (!this.context.autoPlayEnabled) {
      return
    }

    const handState = this.context.handState
    const handContext = this.context.handContext
    
    if (!handState || !handContext) {
      return
    }

    // Start appropriate timers based on current state
    if (handState.type === 'betting_round') {
      const currentPlayer = handContext.currentPlayer
      if (currentPlayer !== null) {
        this.startPlayerActionTimer(currentPlayer, this.getPlayerTimeout(currentPlayer))
        
        // Start watchdog timer for CPU players
        if (this.isCpuPlayer(currentPlayer)) {
          this.startWatchdogTimer(currentPlayer)
        }
      }
    } else if (handState.type === 'hand_complete' && this.context.autoDealEnabled) {
      this.startAutoDealTimer()
    }
  }

  /**
   * Handle timer-related events for game events
   */
  private handleGameEventTimers(event: GameEvent): Array<{ type: TimerType; action: 'started' | 'cancelled' | 'completed' }> {
    const timerEvents: Array<{ type: TimerType; action: 'started' | 'cancelled' | 'completed' }> = []
    
    switch (event.type) {
      case 'START_HAND':
        // Start player action timer for first player
        if (this.context.autoPlayEnabled) {
          const handContext = this.baseMachine.getHandContext()
          if (handContext && handContext.currentPlayer !== null) {
            this.startPlayerActionTimer(handContext.currentPlayer, this.getPlayerTimeout(handContext.currentPlayer))
            timerEvents.push({ type: 'player_action', action: 'started' })
          }
        }
        break
        
      case 'HAND_COMPLETE':
        // Cancel all action timers
        this.cancelTimer('player_action')
        this.cancelTimer('cpu_action')
        this.cancelTimer('watchdog')
        timerEvents.push(
          { type: 'player_action', action: 'cancelled' },
          { type: 'cpu_action', action: 'cancelled' },
          { type: 'watchdog', action: 'cancelled' }
        )
        
        // Start auto-deal timer if enabled
        if (this.context.autoDealEnabled) {
          this.startAutoDealTimer()
          timerEvents.push({ type: 'auto_deal', action: 'started' })
        }
        break
        
      case 'GAME_OVER':
        // Cancel all timers
        this.cancelAllTimers()
        timerEvents.push(
          { type: 'player_action', action: 'cancelled' },
          { type: 'cpu_action', action: 'cancelled' },
          { type: 'auto_deal', action: 'cancelled' },
          { type: 'watchdog', action: 'cancelled' }
        )
        break
    }
    
    return timerEvents
  }

  /**
   * Handle timer-related events for player actions
   */
  private handlePlayerActionTimers(playerId: number, action: BettingAction): Array<{ type: TimerType; action: 'started' | 'cancelled' | 'completed' }> {
    const timerEvents: Array<{ type: TimerType; action: 'started' | 'cancelled' | 'completed' }> = []
    
    // Cancel current player action timer
    this.cancelTimer('player_action')
    this.cancelTimer('cpu_action')
    this.cancelTimer('watchdog')
    timerEvents.push(
      { type: 'player_action', action: 'cancelled' },
      { type: 'cpu_action', action: 'cancelled' },
      { type: 'watchdog', action: 'cancelled' }
    )
    
    // Start timer for next player if action was successful
    const handContext = this.baseMachine.getHandContext()
    if (handContext && this.context.autoPlayEnabled) {
      const nextPlayer = this.getNextPlayerToAct(handContext)
      if (nextPlayer !== null) {
        if (this.isCpuPlayer(nextPlayer)) {
          this.startCpuActionTimer(nextPlayer)
          this.startWatchdogTimer(nextPlayer)
          timerEvents.push(
            { type: 'cpu_action', action: 'started' },
            { type: 'watchdog', action: 'started' }
          )
        } else {
          this.startPlayerActionTimer(nextPlayer, this.getPlayerTimeout(nextPlayer))
          timerEvents.push({ type: 'player_action', action: 'started' })
        }
      }
    }
    
    return timerEvents
  }

  /**
   * Handle CPU action timeout
   */
  private handleCpuAction(playerId: number): void {
    if (!this.context.autoPlayEnabled) {
      return
    }
    
    // Suggest and execute CPU action
    const suggestedAction = this.suggestCpuAction(playerId)
    if (suggestedAction) {
      this.processPlayerAction(playerId, suggestedAction)
    }
  }

  /**
   * Handle player action timeout
   */
  private handlePlayerTimeout(playerId: number): void {
    if (!this.context.autoPlayEnabled) {
      return
    }
    
    // Auto-fold on timeout
    this.processPlayerAction(playerId, { type: 'fold' })
  }

  /**
   * Handle auto-deal timeout
   */
  private handleAutoDeal(): void {
    if (!this.context.autoDealEnabled) {
      return
    }
    
    // Start next hand
    this.processGameEvent({ type: 'START_HAND' })
  }

  /**
   * Handle watchdog timeout
   */
  private handleWatchdog(playerId: number): void {
    if (!this.context.autoPlayEnabled) {
      return
    }
    
    // Force CPU action
    const suggestedAction = this.suggestCpuAction(playerId)
    if (suggestedAction) {
      this.processPlayerAction(playerId, suggestedAction)
    }
  }

  /**
   * Handle street timeout
   */
  private handleStreetTimeout(street: string): void {
    // Force street completion
    this.baseMachine.advanceStreet()
  }

  /**
   * Handle hand timeout
   */
  private handleHandTimeout(): void {
    // Force hand completion
    this.processGameEvent({ type: 'HAND_COMPLETE' })
  }

  /**
   * Cancel all timers for a specific player
   */
  private cancelPlayerTimers(playerId: number): void {
    // This is a simplified version - in a real implementation,
    // you might want to track which timers belong to which players
    if (this.isTimerActive('player_action')) {
      this.cancelTimer('player_action')
    }
    if (this.isTimerActive('cpu_action')) {
      this.cancelTimer('cpu_action')
    }
    if (this.isTimerActive('watchdog')) {
      this.cancelTimer('watchdog')
    }
  }

  /**
   * Start auto-deal timer
   */
  private startAutoDealTimer(): void {
    if (this.context.autoDealEnabled) {
      this.timerManager.startAutoDealTimer()
      this.context.activeTimers.add('auto_deal')
    }
  }

  /**
   * Start watchdog timer
   */
  private startWatchdogTimer(playerId: number): void {
    this.timerManager.startWatchdogTimer(playerId)
    this.context.activeTimers.add('watchdog')
  }

  /**
   * Get next player to act
   */
  private getNextPlayerToAct(handContext: HandProgressionContext): number | null {
    // This is a simplified version - you'd want to implement proper
    // player rotation logic based on your game rules
    const activePlayers = Array.from(handContext.activePlayers) as number[]
    if (activePlayers.length === 0) return null
    
    const currentPlayer = handContext.currentPlayer
    if (currentPlayer === null) return activePlayers[0]
    
    const currentIndex = activePlayers.indexOf(currentPlayer)
    const nextIndex = (currentIndex + 1) % activePlayers.length
    return activePlayers[nextIndex]
  }

  /**
   * Check if a player is a CPU player
   */
  private isCpuPlayer(playerId: number): boolean {
    // This is a simplified check - you'd want to implement proper
    // CPU player detection based on your game logic
    return false // For now, assume all players are human
  }

  /**
   * Suggest CPU action
   */
  private suggestCpuAction(playerId: number): BettingAction | null {
    // This is a simplified version - you'd want to implement proper
    // CPU action suggestion logic
    return { type: 'fold' } // Default to fold for now
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(actionTime: number): void {
    this.context.lastActionTime = Date.now()
    this.context.actionCount++
    
    // Update running average
    const total = this.context.averageActionTime * (this.context.actionCount - 1) + actionTime
    this.context.averageActionTime = total / this.context.actionCount
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    return {
      lastActionTime: this.context.lastActionTime,
      averageActionTime: this.context.averageActionTime,
      actionCount: this.context.actionCount,
      activeTimers: this.timerManager.getAllActiveTimers().length,
      timerStats: this.timerManager.getTimerStats()
    }
  }

  /**
   * Dispose of the machine
   */
  dispose(): void {
    this.timerManager.dispose()
    this.cancelAllTimers()
  }
}
