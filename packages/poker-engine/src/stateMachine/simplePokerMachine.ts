import type { PokerContext, GameEvent, GameState } from './types.js'
import type { BettingAction } from '../types.js'

// Simple state machine implementation
export class SimplePokerStateMachine {
  private currentState: GameState = { type: 'idle' }
  private context: PokerContext
  
  constructor(initialContext: Partial<PokerContext> = {}) {
    this.context = {
      players: [],
      currentHand: null,
      pot: 0,
      deck: [],
      community: [],
      betToCall: 0,
      lastRaiseAmount: 2,
      lastAggressorIndex: null,
      ...initialContext
    }
  }
  
  // Get current state
  getState(): GameState {
    return this.currentState
  }
  
  // Get current context
  getContext(): PokerContext {
    return { ...this.context }
  }
  
  // Transition to new state
  transition(event: GameEvent): GameState {
    const nextState = this.computeNextState(this.currentState, event)
    if (nextState) {
      this.currentState = nextState
      this.updateContext(event)
    }
    return this.currentState
  }
  
  // Compute the next state based on current state and event
  private computeNextState(currentState: GameState, event: GameEvent): GameState | null {
    switch (currentState.type) {
      case 'idle':
        if (event.type === 'PLAYERS_READY' && this.hasEnoughPlayers()) {
          return { type: 'waiting_for_players' }
        }
        break
        
      case 'waiting_for_players':
        if (event.type === 'START_HAND' && this.canStartHand()) {
          return { type: 'hand_in_progress' }
        }
        break
        
      case 'hand_in_progress':
        if (event.type === 'HAND_COMPLETE') {
          return { type: 'hand_complete' }
        }
        break
        
      case 'hand_complete':
        if (event.type === 'START_NEXT_HAND' && this.canStartHand()) {
          return { type: 'hand_in_progress' }
        }
        if (event.type === 'GAME_OVER') {
          return { type: 'game_over' }
        }
        break
        
      case 'game_over':
        // Terminal state, no transitions
        break
    }
    
    return null
  }
  
  // Update context based on event
  private updateContext(event: GameEvent): void {
    switch (event.type) {
      case 'START_HAND':
        this.startHand()
        break
      case 'PLAYER_ACTION':
        this.processPlayerAction(event.playerIndex, event.action)
        break
      case 'HAND_COMPLETE':
        this.settleHand()
        break
    }
  }
  
  // Helper methods
  private hasEnoughPlayers(): boolean {
    const activePlayers = this.context.players.filter(p => p.stack > 0)
    return activePlayers.length >= 2
  }
  
  private canStartHand(): boolean {
    return this.hasEnoughPlayers() && this.context.currentHand === null
  }
  
  private startHand(): void {
    this.context.currentHand = {
      id: (this.context.currentHand?.id ?? 0) + 1,
      buttonIndex: this.context.currentHand ? (this.context.currentHand.buttonIndex + 1) % this.context.players.length : 0,
      smallBlind: 1,
      bigBlind: 2
    }
    this.context.pot = 0
    this.context.betToCall = 0
    this.context.lastRaiseAmount = 2
    this.context.lastAggressorIndex = null
    this.context.community = []
    this.context.players = this.context.players.map(p => ({
      ...p,
      committedThisStreet: 0,
      totalCommitted: 0,
      hasFolded: false,
      isAllIn: false,
      hole: []
    }))
  }
  
  private processPlayerAction(playerIndex: number, action: BettingAction): void {
    const player = this.context.players[playerIndex]
    if (!player) return
    
    switch (action.type) {
      case 'fold':
        player.hasFolded = true
        break
      case 'check':
        // No state change needed
        break
      case 'call':
        const toCall = this.context.betToCall - player.committedThisStreet
        const callAmount = Math.min(toCall, player.stack)
        player.stack -= callAmount
        player.committedThisStreet += callAmount
        player.totalCommitted += callAmount
        if (player.stack === 0) player.isAllIn = true
        break
      case 'bet':
      case 'raise':
        const amount = action.amount || 0
        const betAmount = Math.min(amount, player.stack)
        player.stack -= betAmount
        player.committedThisStreet += betAmount
        player.totalCommitted += betAmount
        if (player.stack === 0) player.isAllIn = true
        break
    }
  }
  
  private settleHand(): void {
    this.context.currentHand = null
    this.context.pot = 0
    this.context.betToCall = 0
    this.context.lastRaiseAmount = 2
    this.context.lastAggressorIndex = null
    this.context.community = []
    this.context.players = this.context.players.map(p => ({
      ...p,
      committedThisStreet: 0,
      totalCommitted: 0,
      hasFolded: false,
      isAllIn: false,
      hole: []
    }))
  }
  
  // Public methods for external use
  canTransition(event: GameEvent): boolean {
    const nextState = this.computeNextState(this.currentState, event)
    return nextState !== null
  }
  
  getValidEvents(): GameEvent['type'][] {
    const events: GameEvent['type'][] = []
    
    switch (this.currentState.type) {
      case 'idle':
        if (this.hasEnoughPlayers()) events.push('PLAYERS_READY')
        break
      case 'waiting_for_players':
        if (this.canStartHand()) events.push('START_HAND')
        break
      case 'hand_in_progress':
        events.push('HAND_COMPLETE')
        break
      case 'hand_complete':
        if (this.canStartHand()) events.push('START_NEXT_HAND')
        events.push('GAME_OVER')
        break
    }
    
    return events
  }
}

// Export the simple state machine
