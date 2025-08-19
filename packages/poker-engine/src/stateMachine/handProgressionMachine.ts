/**
 * Hand Progression State Machine
 * Manages detailed poker hand flow through streets and betting rounds
 */

import type { BettingAction, Street } from '../types.js'
import type {
  HandProgressionState,
  HandProgressionEvent,
  HandProgressionContext,
  ActionValidationResult,
  StreetConfig,
  BettingRoundContext
} from './handProgressionTypes.js'
import {
  STREET_CONFIGS,
  getNextStreet,
  isValidStreetTransition
} from './handProgressionTypes.js'

export class HandProgressionStateMachine {
  private currentState: HandProgressionState
  private context: HandProgressionContext

  constructor(
    handId: number,
    initialPlayers: number[],
    playerStacks: Map<number, number>,
    bigBlind: number = 2
  ) {
    this.currentState = { type: 'hand_starting', stage: 'dealing_cards' }
    this.context = {
      handId,
      street: null,
      currentPlayer: null,
      betToCall: 0,
      lastRaiseAmount: bigBlind,
      playersInHand: new Set(initialPlayers),
      activePlayers: new Set(initialPlayers),
      playerStacks: new Map(playerStacks),
      playerCommitted: new Map(),
      playerCommittedThisStreet: new Map(),
      pot: 0,
      communityCards: [],
      bettingComplete: false,
      handComplete: false
    }

    // Initialize committed amounts to 0
    initialPlayers.forEach(playerId => {
      this.context.playerCommitted.set(playerId, 0)
      this.context.playerCommittedThisStreet.set(playerId, 0)
    })
  }

  getCurrentState(): HandProgressionState {
    return { ...this.currentState }
  }

  getContext(): Readonly<HandProgressionContext> {
    return this.context
  }

  getBettingRoundContext(): BettingRoundContext | null {
    if (this.currentState.type !== 'betting_round' || !this.context.street) {
      return null
    }

    return {
      street: this.context.street,
      currentPlayer: this.context.currentPlayer ?? -1,
      betToCall: this.context.betToCall,
      lastRaiseAmount: this.context.lastRaiseAmount,
      playersInHand: Array.from(this.context.playersInHand),
      activePlayers: Array.from(this.context.activePlayers),
      playerChips: Object.fromEntries(this.context.playerStacks),
      playerCommittedThisStreet: Object.fromEntries(this.context.playerCommittedThisStreet),
      pot: this.context.pot,
      communityCards: [...this.context.communityCards]
    }
  }

  /**
   * Process an event and transition to the next state
   */
  processEvent(event: HandProgressionEvent): boolean {
    const nextState = this.getNextState(event)
    if (!nextState) {
      return false
    }

    this.updateContext(event)
    this.currentState = nextState
    return true
  }

  /**
   * Validate if a player action is legal in the current state
   */
  validateAction(playerId: number, action: BettingAction): ActionValidationResult {
    if (this.currentState.type !== 'betting_round') {
      return { valid: false, error: 'Not currently in a betting round' }
    }

    if (this.context.currentPlayer !== playerId) {
      return { valid: false, error: 'Not your turn to act' }
    }

    if (!this.context.activePlayers.has(playerId)) {
      return { valid: false, error: 'Player is not active in this hand' }
    }

    const playerStack = this.context.playerStacks.get(playerId) ?? 0
    const playerCommitted = this.context.playerCommittedThisStreet.get(playerId) ?? 0
    const toCall = Math.max(0, this.context.betToCall - playerCommitted)

    switch (action.type) {
      case 'fold':
        return { valid: true, allowedActions: ['fold'] }

      case 'check':
        if (toCall > 0) {
          return { valid: false, error: 'Cannot check when there is a bet to call', allowedActions: ['call', 'raise', 'fold'] }
        }
        return { valid: true, allowedActions: ['check', 'bet', 'fold'] }

      case 'call':
        if (toCall === 0) {
          return { valid: false, error: 'Nothing to call', allowedActions: ['check', 'bet', 'fold'] }
        }
        if (toCall > playerStack) {
          return { valid: false, error: 'Insufficient chips to call', allowedActions: ['fold'] }
        }
        return { valid: true, allowedActions: ['call', 'raise', 'fold'] }

      case 'bet':
        if (toCall > 0) {
          return { valid: false, error: 'Cannot bet when there is a bet to call', allowedActions: ['call', 'raise', 'fold'] }
        }
        if (!action.amount || action.amount <= 0) {
          return { valid: false, error: 'Bet amount must be positive' }
        }
        if (action.amount > playerStack) {
          return { valid: false, error: 'Insufficient chips to bet' }
        }
        if (action.amount < this.context.lastRaiseAmount) {
          return { valid: false, error: `Minimum bet is ${this.context.lastRaiseAmount}` }
        }
        return { valid: true, allowedActions: ['bet', 'check', 'fold'] }

      case 'raise':
        if (toCall === 0) {
          return { valid: false, error: 'Nothing to raise', allowedActions: ['check', 'bet', 'fold'] }
        }
        if (!action.amount || action.amount <= toCall) {
          return { valid: false, error: `Raise must be more than ${toCall}` }
        }
        if (action.amount > playerStack) {
          return { valid: false, error: 'Insufficient chips to raise' }
        }
        const minRaise = toCall + this.context.lastRaiseAmount
        if (action.amount < minRaise) {
          return { valid: false, error: `Minimum raise is ${minRaise}` }
        }
        return { valid: true, allowedActions: ['raise', 'call', 'fold'] }

      default:
        return { valid: false, error: 'Invalid action type' }
    }
  }

  /**
   * Get the next player to act
   */
  getNextPlayerToAct(): number | null {
    const activePlayersList = Array.from(this.context.activePlayers).sort((a, b) => a - b)
    if (activePlayersList.length <= 1) {
      return null
    }

    const currentPlayerIndex = this.context.currentPlayer !== null 
      ? activePlayersList.indexOf(this.context.currentPlayer)
      : -1

    if (currentPlayerIndex === -1) {
      return activePlayersList[0]
    }

    const nextIndex = (currentPlayerIndex + 1) % activePlayersList.length
    return activePlayersList[nextIndex]
  }

  /**
   * Check if betting round is complete
   */
  isBettingComplete(): boolean {
    const activePlayers = Array.from(this.context.activePlayers)
    if (activePlayers.length <= 1) {
      return true
    }

    // All active players must have committed the same amount (betToCall)
    return activePlayers.every(playerId => {
      const committed = this.context.playerCommittedThisStreet.get(playerId) ?? 0
      return committed >= this.context.betToCall
    })
  }

  /**
   * Check if hand should end (only one player remaining)
   */
  shouldEndHand(): boolean {
    return this.context.activePlayers.size <= 1
  }

  /**
   * Determine the next state based on current state and event
   */
  private getNextState(event: HandProgressionEvent): HandProgressionState | null {
    switch (this.currentState.type) {
      case 'hand_starting':
        if (event.type === 'cards_dealt') {
          return {
            type: 'betting_round',
            street: 'preflop',
            currentPlayer: Array.from(this.context.activePlayers)[0],
            betToCall: 0,
            lastRaiseAmount: this.context.lastRaiseAmount
          }
        }
        break

      case 'betting_round':
        if (event.type === 'player_action') {
          if (this.shouldEndHand()) {
            return { type: 'hand_complete', result: 'fold_out' }
          }
          
          if (this.isBettingComplete()) {
            const nextStreet = getNextStreet(this.currentState.street)
            if (!nextStreet || nextStreet === 'showdown') {
              return { type: 'hand_complete', result: 'showdown' }
            }
            return { type: 'street_complete', street: this.currentState.street, nextStreet }
          }

          // Continue betting round with next player
          const nextPlayer = this.getNextPlayerToAct()
          if (nextPlayer === null) {
            return { type: 'hand_complete', result: 'fold_out' }
          }

          return {
            type: 'betting_round',
            street: this.currentState.street,
            currentPlayer: nextPlayer,
            betToCall: this.context.betToCall,
            lastRaiseAmount: this.context.lastRaiseAmount
          }
        }
        break

      case 'street_complete':
        if (event.type === 'advance_street') {
          const config = STREET_CONFIGS[event.toStreet as Street]
          if (config && config.communityCardsToAdd > 0) {
            return {
              type: 'dealing_community',
              street: event.toStreet as 'flop' | 'turn' | 'river',
              cardsToAdd: config.communityCardsToAdd
            }
          } else if (event.toStreet === 'showdown') {
            return { type: 'hand_complete', result: 'showdown' }
          }
        }
        break

      case 'dealing_community':
        if (event.type === 'community_dealt') {
          const firstPlayer = Array.from(this.context.activePlayers)[0]
          return {
            type: 'betting_round',
            street: this.currentState.street,
            currentPlayer: firstPlayer,
            betToCall: 0,
            lastRaiseAmount: this.context.lastRaiseAmount
          }
        }
        break

      case 'hand_complete':
        // Terminal state
        break
    }

    return null
  }

  /**
   * Update the context based on the event
   */
  private updateContext(event: HandProgressionEvent): void {
    switch (event.type) {
      case 'cards_dealt':
        this.context.street = 'preflop'
        this.context.currentPlayer = Array.from(this.context.activePlayers)[0]
        break

      case 'player_action':
        this.handlePlayerAction(event.playerId, event.action, event.amount)
        break

      case 'community_dealt':
        this.context.street = event.street
        this.context.communityCards.push(...event.cards)
        // Reset betting for new street
        this.context.betToCall = 0
        this.context.playerCommittedThisStreet.clear()
        this.context.activePlayers.forEach(playerId => {
          this.context.playerCommittedThisStreet.set(playerId, 0)
        })
        break

      case 'advance_street':
        // Context updated when community_dealt event is processed
        break

      case 'hand_ended':
        this.context.handComplete = true
        break
    }

    this.context.lastAction = {
      playerId: this.context.currentPlayer ?? -1,
      action: { type: 'fold' }, // placeholder
      timestamp: Date.now()
    }
  }

  /**
   * Handle a player action and update context accordingly
   */
  private handlePlayerAction(playerId: number, action: BettingAction, amount?: number): void {
    const currentCommitted = this.context.playerCommittedThisStreet.get(playerId) ?? 0
    const playerStack = this.context.playerStacks.get(playerId) ?? 0

    switch (action.type) {
      case 'fold':
        this.context.activePlayers.delete(playerId)
        this.context.playersInHand.delete(playerId)
        break

      case 'check':
        // No change to committed amounts
        break

      case 'call':
        const toCall = Math.max(0, this.context.betToCall - currentCommitted)
        const callAmount = Math.min(toCall, playerStack)
        this.commitChips(playerId, callAmount)
        break

      case 'bet':
        if (amount && amount > 0) {
          this.context.betToCall = Math.max(this.context.betToCall, amount)
          this.context.lastRaiseAmount = amount
          this.commitChips(playerId, amount)
        }
        break

      case 'raise':
        if (amount && amount > 0) {
          const raiseAmount = amount - currentCommitted
          this.context.betToCall = amount
          this.context.lastRaiseAmount = raiseAmount
          this.commitChips(playerId, raiseAmount)
        }
        break
    }

    this.context.lastAction = {
      playerId,
      action,
      timestamp: Date.now()
    }
  }

  /**
   * Commit chips from a player's stack to the pot
   */
  private commitChips(playerId: number, amount: number): void {
    const currentStack = this.context.playerStacks.get(playerId) ?? 0
    const currentCommitted = this.context.playerCommittedThisStreet.get(playerId) ?? 0
    const currentTotalCommitted = this.context.playerCommitted.get(playerId) ?? 0

    const actualAmount = Math.min(amount, currentStack)

    // Update player's stack
    this.context.playerStacks.set(playerId, currentStack - actualAmount)
    
    // Update committed amounts
    this.context.playerCommittedThisStreet.set(playerId, currentCommitted + actualAmount)
    this.context.playerCommitted.set(playerId, currentTotalCommitted + actualAmount)
    
    // Add to pot
    this.context.pot += actualAmount

    // Mark as all-in if stack is depleted
    if (this.context.playerStacks.get(playerId) === 0) {
      // Player is all-in but still in the hand for showdown purposes
    }
  }
}
