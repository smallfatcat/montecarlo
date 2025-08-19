/**
 * Betting Round Manager
 * Integrates betting logic with hand progression state machine
 */

import type { BettingAction, Street } from '../types.js'
import type {
  HandProgressionContext,
  BettingRoundContext,
  ActionValidationResult
} from './handProgressionTypes.js'
import { ActionValidator, StreetActionValidator } from './actionValidator.js'

export interface BettingRules {
  bigBlind: number
  smallBlind: number
  minRaise?: number
  maxBet?: number
  allowCheckRaise: boolean
  allowStringBets: boolean
}

export interface BettingRoundResult {
  success: boolean
  newContext: Partial<HandProgressionContext>
  nextPlayer?: number
  roundComplete: boolean
  handComplete: boolean
  error?: string
}

export class BettingRoundManager {
  private rules: BettingRules

  constructor(rules: Partial<BettingRules> = {}) {
    this.rules = {
      bigBlind: 2,
      smallBlind: 1,
      allowCheckRaise: true,
      allowStringBets: false,
      ...rules
    }
  }

  /**
   * Process a player action in the context of a betting round
   */
  processAction(
    playerId: number,
    action: BettingAction,
    context: HandProgressionContext,
    street: Street
  ): BettingRoundResult {
    // Create betting round context for validation
    const bettingContext = this.createBettingContext(context, street)
    
    // Validate the action
    const validation = StreetActionValidator.validateForStreet(
      playerId,
      action,
      street,
      bettingContext,
      this.rules
    )

    if (!validation.valid) {
      return {
        success: false,
        newContext: {},
        roundComplete: false,
        handComplete: false,
        error: validation.error
      }
    }

    // Apply the action
    const newContext = this.applyAction(playerId, action, context)
    
    // Determine next state
    const nextPlayer = this.getNextPlayer(newContext)
    const roundComplete = this.isBettingRoundComplete(newContext)
    const handComplete = this.isHandComplete(newContext)

    return {
      success: true,
      newContext,
      nextPlayer: nextPlayer ?? undefined,
      roundComplete,
      handComplete
    }
  }

  /**
   * Initialize a new betting round for a street
   */
  initializeBettingRound(
    context: HandProgressionContext,
    street: Street,
    buttonPosition: number = 0
  ): Partial<HandProgressionContext> {
    const activePlayers = Array.from(context.activePlayers)
    
    // Reset street-specific betting state
    const newContext: Partial<HandProgressionContext> = {
      street,
      betToCall: 0,
      playerCommittedThisStreet: new Map(),
      bettingComplete: false
    }

    // Initialize committed amounts for this street
    activePlayers.forEach(playerId => {
      newContext.playerCommittedThisStreet!.set(playerId, 0)
    })

    // Set initial player to act based on street and position
    if (street === 'preflop') {
      // Preflop: first player after big blind acts first
      newContext.currentPlayer = this.getPlayerAfterBlinds(activePlayers, buttonPosition)
    } else {
      // Postflop: first active player acts first (usually small blind or next active)
      newContext.currentPlayer = this.getFirstActivePlayer(activePlayers, buttonPosition)
    }

    // Handle blinds for preflop
    if (street === 'preflop') {
      this.postBlinds(newContext as HandProgressionContext, activePlayers, buttonPosition)
    }

    return newContext
  }

  /**
   * Get available actions for a player in current betting context
   */
  getAvailableActions(
    playerId: number,
    context: HandProgressionContext,
    street: Street
  ): BettingAction['type'][] {
    const bettingContext = this.createBettingContext(context, street)
    return ActionValidator.getAvailableActions(playerId, bettingContext, this.rules)
  }

  /**
   * Get betting limits for a player
   */
  getBettingLimits(
    playerId: number,
    context: HandProgressionContext,
    street: Street
  ) {
    const bettingContext = this.createBettingContext(context, street)
    return ActionValidator.getBettingLimits(playerId, bettingContext, this.rules)
  }

  /**
   * Calculate side pots when players are all-in
   */
  calculateSidePots(context: HandProgressionContext): Array<{
    amount: number
    eligiblePlayers: number[]
  }> {
    const pots: Array<{ amount: number; eligiblePlayers: number[] }> = []
    const playerCommittments = new Map<number, number>()
    
    // Get total commitments for each player
    context.playersInHand.forEach(playerId => {
      const committed = context.playerCommitted.get(playerId) ?? 0
      playerCommittments.set(playerId, committed)
    })

    // Sort by commitment amount to create side pots
    const sortedCommitments = Array.from(playerCommittments.entries())
      .sort((a, b) => a[1] - b[1])

    let previousLevel = 0
    let remainingPlayers = Array.from(context.playersInHand)

    for (const [playerId, commitment] of sortedCommitments) {
      if (commitment > previousLevel) {
        const potAmount = (commitment - previousLevel) * remainingPlayers.length
        pots.push({
          amount: potAmount,
          eligiblePlayers: [...remainingPlayers]
        })
        previousLevel = commitment
      }
      
      // Remove this player from subsequent pots if they're all-in
      const playerStack = context.playerStacks.get(playerId) ?? 0
      if (playerStack === 0) {
        remainingPlayers = remainingPlayers.filter(id => id !== playerId)
      }
    }

    return pots
  }

  private createBettingContext(context: HandProgressionContext, street: Street): BettingRoundContext {
    return {
      street,
      currentPlayer: context.currentPlayer ?? -1,
      betToCall: context.betToCall,
      lastRaiseAmount: context.lastRaiseAmount,
      playersInHand: Array.from(context.playersInHand),
      activePlayers: Array.from(context.activePlayers),
      playerChips: Object.fromEntries(context.playerStacks),
      playerCommittedThisStreet: Object.fromEntries(context.playerCommittedThisStreet),
      pot: context.pot,
      communityCards: [...context.communityCards]
    }
  }

  private applyAction(
    playerId: number,
    action: BettingAction,
    context: HandProgressionContext
  ): Partial<HandProgressionContext> {
    const newContext: Partial<HandProgressionContext> = {
      playerStacks: new Map(context.playerStacks),
      playerCommitted: new Map(context.playerCommitted),
      playerCommittedThisStreet: new Map(context.playerCommittedThisStreet),
      activePlayers: new Set(context.activePlayers),
      pot: context.pot,
      betToCall: context.betToCall,
      lastRaiseAmount: context.lastRaiseAmount,
      lastAction: {
        playerId,
        action,
        timestamp: Date.now()
      }
    }

    const currentCommittedThisStreet = newContext.playerCommittedThisStreet!.get(playerId) ?? 0
    const currentTotalCommitted = newContext.playerCommitted!.get(playerId) ?? 0
    const playerStack = newContext.playerStacks!.get(playerId) ?? 0

    switch (action.type) {
      case 'fold':
        newContext.activePlayers!.delete(playerId)
        break

      case 'check':
        // No chips committed
        break

      case 'call':
        const toCall = Math.max(0, newContext.betToCall! - currentCommittedThisStreet)
        const callAmount = Math.min(toCall, playerStack)
        this.commitChips(newContext, playerId, callAmount)
        break

      case 'bet':
        if (action.amount && action.amount > 0) {
          newContext.betToCall = Math.max(newContext.betToCall!, action.amount)
          newContext.lastRaiseAmount = action.amount
          this.commitChips(newContext, playerId, action.amount)
        }
        break

      case 'raise':
        if (action.amount && action.amount > 0) {
          const raiseAmount = action.amount - currentCommittedThisStreet
          newContext.betToCall = action.amount
          newContext.lastRaiseAmount = raiseAmount
          this.commitChips(newContext, playerId, raiseAmount)
        }
        break
    }

    return newContext
  }

  private commitChips(
    context: Partial<HandProgressionContext>,
    playerId: number,
    amount: number
  ): void {
    const currentStack = context.playerStacks!.get(playerId) ?? 0
    const currentCommittedThisStreet = context.playerCommittedThisStreet!.get(playerId) ?? 0
    const currentTotalCommitted = context.playerCommitted!.get(playerId) ?? 0

    const actualAmount = Math.min(amount, currentStack)

    // Update stacks and commitments
    context.playerStacks!.set(playerId, currentStack - actualAmount)
    context.playerCommittedThisStreet!.set(playerId, currentCommittedThisStreet + actualAmount)
    context.playerCommitted!.set(playerId, currentTotalCommitted + actualAmount)
    context.pot = (context.pot ?? 0) + actualAmount
  }

  private getNextPlayer(context: Partial<HandProgressionContext>): number | null {
    const activePlayers = Array.from(context.activePlayers ?? [])
    if (activePlayers.length <= 1) {
      return null
    }

    // Simple rotation - in a real implementation, this would consider position
    const currentPlayer = context.currentPlayer ?? activePlayers[0]
    const currentIndex = activePlayers.indexOf(currentPlayer)
    const nextIndex = (currentIndex + 1) % activePlayers.length
    return activePlayers[nextIndex]
  }

  private isBettingRoundComplete(context: Partial<HandProgressionContext>): boolean {
    const activePlayers = Array.from(context.activePlayers ?? [])
    if (activePlayers.length <= 1) {
      return true
    }

    const betToCall = context.betToCall ?? 0
    
    // All active players must have committed the same amount
    return activePlayers.every(playerId => {
      const committed = context.playerCommittedThisStreet?.get(playerId) ?? 0
      const stack = context.playerStacks?.get(playerId) ?? 0
      return committed >= betToCall || stack === 0 // All-in players are considered matched
    })
  }

  private isHandComplete(context: Partial<HandProgressionContext>): boolean {
    return (context.activePlayers?.size ?? 0) <= 1
  }

  private postBlinds(
    context: HandProgressionContext,
    activePlayers: number[],
    buttonPosition: number
  ): void {
    if (activePlayers.length < 2) return

    // In heads-up, button posts small blind
    const isHeadsUp = activePlayers.length === 2
    const smallBlindPlayer = isHeadsUp 
      ? activePlayers[buttonPosition % activePlayers.length]
      : activePlayers[(buttonPosition + 1) % activePlayers.length]
    const bigBlindPlayer = isHeadsUp
      ? activePlayers[(buttonPosition + 1) % activePlayers.length]
      : activePlayers[(buttonPosition + 2) % activePlayers.length]

    // Post small blind
    const sbAmount = Math.min(this.rules.smallBlind, context.playerStacks.get(smallBlindPlayer) ?? 0)
    context.playerStacks.set(smallBlindPlayer, (context.playerStacks.get(smallBlindPlayer) ?? 0) - sbAmount)
    context.playerCommittedThisStreet.set(smallBlindPlayer, sbAmount)
    context.playerCommitted.set(smallBlindPlayer, (context.playerCommitted.get(smallBlindPlayer) ?? 0) + sbAmount)
    context.pot += sbAmount

    // Post big blind
    const bbAmount = Math.min(this.rules.bigBlind, context.playerStacks.get(bigBlindPlayer) ?? 0)
    context.playerStacks.set(bigBlindPlayer, (context.playerStacks.get(bigBlindPlayer) ?? 0) - bbAmount)
    context.playerCommittedThisStreet.set(bigBlindPlayer, bbAmount)
    context.playerCommitted.set(bigBlindPlayer, (context.playerCommitted.get(bigBlindPlayer) ?? 0) + bbAmount)
    context.pot += bbAmount

    // Set bet to call as big blind
    context.betToCall = bbAmount
  }

  private getPlayerAfterBlinds(activePlayers: number[], buttonPosition: number): number {
    if (activePlayers.length === 2) {
      // Heads-up: big blind acts first preflop
      return activePlayers[(buttonPosition + 1) % activePlayers.length]
    } else {
      // Multi-way: first player after big blind
      return activePlayers[(buttonPosition + 3) % activePlayers.length]
    }
  }

  private getFirstActivePlayer(activePlayers: number[], buttonPosition: number): number {
    // Postflop: first active player after button
    for (let i = 1; i <= activePlayers.length; i++) {
      const playerIndex = (buttonPosition + i) % activePlayers.length
      if (activePlayers.includes(playerIndex)) {
        return playerIndex
      }
    }
    return activePlayers[0] // Fallback
  }
}
