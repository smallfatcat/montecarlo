/**
 * Integrated Poker State Machine
 * Combines game-level state management with detailed hand progression
 */

import { SimplePokerStateMachine } from './simplePokerMachine.js'
import { HandProgressionStateMachine } from './handProgressionMachine.js'
import { BettingRoundManager } from './bettingRoundManager.js'
import type { 
  GameState, 
  GameEvent, 
  PokerContext,
  ActionResult 
} from './types.js'

// Custom result type for integrated machine operations
export interface IntegratedActionResult {
  success: boolean
  error?: string
  message?: string
  currentState: GameState
  newContext?: Partial<IntegratedPokerContext>
}
import type { 
  HandProgressionState,
  HandProgressionEvent,
  BettingRules
} from './handProgressionTypes.js'
import type { BettingAction } from '../types.js'

export interface IntegratedPokerContext extends PokerContext {
  handMachine?: HandProgressionStateMachine
  bettingManager: BettingRoundManager
  handHistory: Array<{
    handId: number
    startTime: number
    endTime?: number
    result?: 'showdown' | 'fold_out'
    finalPot?: number
    players: number[]
  }>
  // Additional properties for integrated machine
  activePlayers: Set<number>
  playerStacks: Map<number, number>
  lastAction?: {
    playerId: number
    action: BettingAction
    timestamp: number
  }
}

export class IntegratedPokerStateMachine {
  private gameStateMachine: SimplePokerStateMachine
  private bettingManager: BettingRoundManager
  private context: IntegratedPokerContext

  constructor(
    playerIds: number[],
    initialStacks: Map<number, number>,
    bettingRules: Partial<BettingRules> = {}
  ) {
    this.bettingManager = new BettingRoundManager(bettingRules)
    
    // Initialize context
    this.context = {
      players: playerIds.map(id => ({
        id,
        isCPU: false,
        stack: initialStacks.get(id) || 0,
        committedThisStreet: 0,
        totalCommitted: 0,
        hasFolded: false,
        isAllIn: false,
        hole: []
      })),
      activePlayers: new Set(playerIds),
      playerStacks: new Map(initialStacks),
      currentHand: null,
      pot: 0,
      deck: [],
      community: [],
      betToCall: 0,
      lastRaiseAmount: 2,
      lastAggressorIndex: null,
      bettingManager: this.bettingManager,
      handHistory: []
    }

    // Initialize game state machine
    this.gameStateMachine = new SimplePokerStateMachine(this.context)
  }

  /**
   * Get current game state
   */
  getGameState(): GameState {
    return this.gameStateMachine.getState()
  }

  /**
   * Get current hand state (if in hand)
   */
  getHandState(): HandProgressionState | null {
    return this.context.handMachine?.getCurrentState() || null
  }

  /**
   * Get complete context
   */
  getContext(): Readonly<IntegratedPokerContext> {
    return this.context
  }

  /**
   * Get hand progression context (if in hand)
   */
  getHandContext() {
    return this.context.handMachine?.getContext() || null
  }

  /**
   * Process a high-level game event
   */
  processGameEvent(event: GameEvent): IntegratedActionResult {
    const newState = this.gameStateMachine.transition(event)
    
    // Update our context with any changes from the game machine
    // Note: SimplePokerStateMachine doesn't return context changes
    // so we need to handle this differently

    // Handle game state transitions that affect hand machine
    if (event.type === 'START_HAND') {
      this.initializeNewHand()
    } else if (event.type === 'HAND_COMPLETE') {
      this.finalizeHand()
    }

    return {
      success: true,
      currentState: this.getGameState(),
      message: `Processed ${event.type} event`
    }
  }

  /**
   * Process a player action (delegates to hand machine if appropriate)
   */
  processPlayerAction(playerId: number, action: BettingAction): IntegratedActionResult {
    if (!this.context.handMachine) {
      return {
        success: false,
        error: 'No active hand',
        currentState: this.getGameState()
      }
    }

    const handState = this.context.handMachine.getCurrentState()
    
    // Only process actions during betting rounds
    if (handState.type !== 'betting_round') {
      return {
        success: false,
        error: 'Not currently in a betting round',
        currentState: this.getGameState()
      }
    }

    // Validate and process the action
    const validation = this.context.handMachine.validateAction(playerId, action)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        currentState: this.getGameState()
      }
    }

    // Process the action in hand machine
    const handEvent: HandProgressionEvent = {
      type: 'player_action',
      playerId,
      action,
      amount: action.amount
    }

    const processed = this.context.handMachine.processEvent(handEvent)
    if (!processed) {
      return {
        success: false,
        error: 'Failed to process action',
        currentState: this.getGameState()
      }
    }

    // Check if hand is complete
    const newHandState = this.context.handMachine.getCurrentState()
    if (newHandState.type === 'hand_complete') {
      // Process end of hand at game level
      this.processGameEvent({ type: 'HAND_COMPLETE' })
    }

    // Update last action in context
    this.context.lastAction = {
      playerId,
      action,
      timestamp: Date.now()
    }

    return {
      success: true,
      currentState: this.getGameState(),
      message: `Player ${playerId} ${action.type}${action.amount ? ` ${action.amount}` : ''}`
    }
  }

  /**
   * Get available actions for a player
   */
  getAvailableActions(playerId: number): BettingAction['type'][] {
    if (!this.context.handMachine) {
      return []
    }

    const handContext = this.context.handMachine.getContext()
    const street = handContext.street
    if (!street) {
      return []
    }

    return this.bettingManager.getAvailableActions(playerId, handContext, street)
  }

  /**
   * Get betting limits for a player
   */
  getBettingLimits(playerId: number) {
    if (!this.context.handMachine) {
      return null
    }

    const handContext = this.context.handMachine.getContext()
    const street = handContext.street
    if (!street) {
      return null
    }

    return this.bettingManager.getBettingLimits(playerId, handContext, street)
  }

  /**
   * Advance hand to next street (for external control)
   */
  advanceStreet(): IntegratedActionResult {
    if (!this.context.handMachine) {
      return {
        success: false,
        error: 'No active hand',
        currentState: this.getGameState()
      }
    }

    const handState = this.context.handMachine.getCurrentState()
    
    if (handState.type === 'street_complete') {
      const event: HandProgressionEvent = {
        type: 'advance_street',
        fromStreet: handState.street,
        toStreet: handState.nextStreet
      }
      
      const processed = this.context.handMachine.processEvent(event)
      
      return {
        success: processed,
        currentState: this.getGameState(),
        message: processed ? `Advanced to ${handState.nextStreet}` : 'Failed to advance street'
      }
    }

    return {
      success: false,
      error: 'Cannot advance street in current state',
      currentState: this.getGameState()
    }
  }

  /**
   * Deal community cards (for external control)
   */
  dealCommunityCards(cards: string[]): IntegratedActionResult {
    if (!this.context.handMachine) {
      return {
        success: false,
        error: 'No active hand',
        currentState: this.getGameState()
      }
    }

    const handState = this.context.handMachine.getCurrentState()
    
    if (handState.type === 'dealing_community') {
      const event: HandProgressionEvent = {
        type: 'community_dealt',
        street: handState.street,
        cards
      }
      
      const processed = this.context.handMachine.processEvent(event)
      
      return {
        success: processed,
        currentState: this.getGameState(),
        message: processed ? `Dealt ${cards.join(', ')} on ${handState.street}` : 'Failed to deal cards'
      }
    }

    return {
      success: false,
      error: 'Not in community dealing state',
      currentState: this.getGameState()
    }
  }

  /**
   * Get summary of current situation
   */
  getGameSummary() {
    const gameState = this.getGameState()
    const handState = this.getHandState()
    const handContext = this.getHandContext()

    return {
      gameState: gameState.type,
      handState: handState?.type || null,
      activePlayers: Array.from(this.context.activePlayers),
      currentPlayer: handContext?.currentPlayer || null,
      pot: handContext?.pot || 0,
      betToCall: handContext?.betToCall || 0,
      street: handContext?.street || null,
      communityCards: handContext?.communityCards || [],
      playerStacks: Object.fromEntries(this.context.playerStacks),
      handHistory: this.context.handHistory.length
    }
  }

  private initializeNewHand(): void {
    const handId = Date.now() // Simple hand ID
    const activePlayers = Array.from(this.context.activePlayers)
    
    // Create new hand machine
    this.context.handMachine = new HandProgressionStateMachine(
      handId,
      activePlayers as number[],
      this.context.playerStacks
    )

    // Add to hand history
    this.context.handHistory.push({
      handId,
      startTime: Date.now(),
      players: activePlayers
    })

    // Update context
    this.context.currentHand = {
      id: handId,
      buttonIndex: 0,
      smallBlind: 1,
      bigBlind: 2
    }

    // Start the hand
    this.context.handMachine.processEvent({
      type: 'cards_dealt',
      playersCount: activePlayers.length
    })
  }

  private finalizeHand(): void {
    if (!this.context.handMachine || !this.context.currentHand) {
      return
    }

    const handContext = this.context.handMachine.getContext()
    const handState = this.context.handMachine.getCurrentState()
    
    // Update hand history
    const lastHand = this.context.handHistory[this.context.handHistory.length - 1]
    if (lastHand) {
      lastHand.endTime = Date.now()
      lastHand.finalPot = handContext.pot
      if (handState.type === 'hand_complete') {
        lastHand.result = handState.result
      }
    }

    // Update player stacks from hand result
    handContext.playerStacks.forEach((stack, playerId) => {
      this.context.playerStacks.set(playerId, stack)
    })

    // Remove players with no chips
    this.context.playerStacks.forEach((stack, playerId) => {
      if (stack <= 0) {
        this.context.activePlayers.delete(playerId)
      }
    })

    // Clear hand-specific state
    this.context.handMachine = undefined
    this.context.currentHand = null

    // Check if game should end
    if (this.context.activePlayers.size <= 1) {
      this.processGameEvent({ type: 'GAME_OVER' })
    }
  }
}
