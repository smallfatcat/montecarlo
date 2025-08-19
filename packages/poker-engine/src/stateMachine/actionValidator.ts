/**
 * Action Validator - Standalone validation logic for poker actions
 * Can be used independently or integrated with state machines
 */

import type { BettingAction, Street } from '../types.js'
import type { ActionValidationResult, BettingRoundContext } from './handProgressionTypes.js'

export class ActionValidator {
  /**
   * Validate a player action in the context of a betting round
   */
  static validateAction(
    playerId: number,
    action: BettingAction,
    context: BettingRoundContext,
    rules: {
      bigBlind: number
      minRaise?: number
    } = { bigBlind: 2 }
  ): ActionValidationResult {
    // Check if player is active
    if (!context.activePlayers.includes(playerId)) {
      return { valid: false, error: 'Player is not active in this hand' }
    }

    // Check if it's player's turn
    if (context.currentPlayer !== playerId) {
      return { valid: false, error: 'Not your turn to act' }
    }

    const playerStack = context.playerChips[playerId] ?? 0
    const playerCommitted = context.playerCommittedThisStreet[playerId] ?? 0
    const toCall = Math.max(0, context.betToCall - playerCommitted)
    const minBet = rules.bigBlind
    const minRaise = rules.minRaise ?? context.lastRaiseAmount

    switch (action.type) {
      case 'fold':
        return this.validateFold()

      case 'check':
        return this.validateCheck(toCall)

      case 'call':
        return this.validateCall(toCall, playerStack)

      case 'bet':
        return this.validateBet(action.amount, toCall, playerStack, minBet)

      case 'raise':
        return this.validateRaise(action.amount, toCall, playerStack, minRaise)

      default:
        return { valid: false, error: 'Invalid action type' }
    }
  }

  /**
   * Get available actions for a player in the current context
   */
  static getAvailableActions(
    playerId: number,
    context: BettingRoundContext,
    rules: { bigBlind: number; minRaise?: number } = { bigBlind: 2 }
  ): BettingAction['type'][] {
    if (!context.activePlayers.includes(playerId) || context.currentPlayer !== playerId) {
      return []
    }

    const playerStack = context.playerChips[playerId] ?? 0
    const playerCommitted = context.playerCommittedThisStreet[playerId] ?? 0
    const toCall = Math.max(0, context.betToCall - playerCommitted)
    const minBet = rules.bigBlind
    const minRaise = rules.minRaise ?? context.lastRaiseAmount

    const actions: BettingAction['type'][] = ['fold']

    if (toCall === 0) {
      actions.push('check')
      if (playerStack >= minBet) {
        actions.push('bet')
      }
    } else {
      if (playerStack >= toCall) {
        actions.push('call')
        if (playerStack >= toCall + minRaise) {
          actions.push('raise')
        }
      }
    }

    return actions
  }

  /**
   * Calculate betting limits for a player
   */
  static getBettingLimits(
    playerId: number,
    context: BettingRoundContext,
    rules: { bigBlind: number; minRaise?: number } = { bigBlind: 2 }
  ): {
    minBet: number
    maxBet: number
    minRaise: number
    maxRaise: number
    toCall: number
  } {
    const playerStack = context.playerChips[playerId] ?? 0
    const playerCommitted = context.playerCommittedThisStreet[playerId] ?? 0
    const toCall = Math.max(0, context.betToCall - playerCommitted)
    const minBet = rules.bigBlind
    const minRaise = rules.minRaise ?? context.lastRaiseAmount

    return {
      minBet,
      maxBet: playerStack,
      minRaise: toCall + minRaise,
      maxRaise: playerStack,
      toCall
    }
  }

  private static validateFold(): ActionValidationResult {
    return { valid: true, allowedActions: ['fold'] }
  }

  private static validateCheck(toCall: number): ActionValidationResult {
    if (toCall > 0) {
      return {
        valid: false,
        error: 'Cannot check when there is a bet to call',
        allowedActions: ['call', 'raise', 'fold']
      }
    }
    return { valid: true, allowedActions: ['check', 'bet', 'fold'] }
  }

  private static validateCall(toCall: number, playerStack: number): ActionValidationResult {
    if (toCall === 0) {
      return {
        valid: false,
        error: 'Nothing to call',
        allowedActions: ['check', 'bet', 'fold']
      }
    }
    if (toCall > playerStack) {
      return {
        valid: false,
        error: 'Insufficient chips to call',
        allowedActions: ['fold']
      }
    }
    return { valid: true, allowedActions: ['call', 'raise', 'fold'] }
  }

  private static validateBet(
    amount: number | undefined,
    toCall: number,
    playerStack: number,
    minBet: number
  ): ActionValidationResult {
    if (toCall > 0) {
      return {
        valid: false,
        error: 'Cannot bet when there is a bet to call',
        allowedActions: ['call', 'raise', 'fold']
      }
    }
    if (!amount || amount <= 0) {
      return { valid: false, error: 'Bet amount must be positive' }
    }
    if (amount > playerStack) {
      return { valid: false, error: 'Insufficient chips to bet' }
    }
    if (amount < minBet) {
      return { valid: false, error: `Minimum bet is ${minBet}` }
    }
    return { valid: true, allowedActions: ['bet', 'check', 'fold'] }
  }

  private static validateRaise(
    amount: number | undefined,
    toCall: number,
    playerStack: number,
    minRaise: number
  ): ActionValidationResult {
    if (toCall === 0) {
      return {
        valid: false,
        error: 'Nothing to raise',
        allowedActions: ['check', 'bet', 'fold']
      }
    }
    if (!amount || amount <= toCall) {
      return { valid: false, error: `Raise must be more than ${toCall}` }
    }
    if (amount > playerStack) {
      return { valid: false, error: 'Insufficient chips to raise' }
    }
    if (amount < minRaise) {
      return { valid: false, error: `Minimum raise is ${minRaise}` }
    }
    return { valid: true, allowedActions: ['raise', 'call', 'fold'] }
  }
}

/**
 * Street-specific action validation
 */
export class StreetActionValidator {
  /**
   * Validate action considering street-specific rules
   */
  static validateForStreet(
    playerId: number,
    action: BettingAction,
    street: Street,
    context: BettingRoundContext,
    rules: { bigBlind: number; minRaise?: number } = { bigBlind: 2 }
  ): ActionValidationResult {
    // Base validation
    const baseResult = ActionValidator.validateAction(playerId, action, context, rules)
    if (!baseResult.valid) {
      return baseResult
    }

    // Street-specific validation
    switch (street) {
      case 'preflop':
        return this.validatePreflopAction(action, context, rules)
      case 'flop':
      case 'turn':
      case 'river':
        return this.validatePostflopAction(action, context, rules)
      case 'showdown':
        return { valid: false, error: 'No actions allowed during showdown' }
      default:
        return baseResult
    }
  }

  private static validatePreflopAction(
    action: BettingAction,
    context: BettingRoundContext,
    rules: { bigBlind: number }
  ): ActionValidationResult {
    // Preflop has blinds, so minimum raise might be different
    if (action.type === 'raise' && action.amount) {
      const minRaise = rules.bigBlind * 2 // Standard 2x raise
      if (action.amount < minRaise) {
        return { valid: false, error: `Minimum preflop raise is ${minRaise}` }
      }
    }
    return { valid: true }
  }

  private static validatePostflopAction(
    action: BettingAction,
    context: BettingRoundContext,
    rules: { bigBlind: number }
  ): ActionValidationResult {
    // Standard postflop validation
    if (action.type === 'bet' && action.amount) {
      const minBet = rules.bigBlind
      if (action.amount < minBet) {
        return { valid: false, error: `Minimum bet is ${minBet}` }
      }
    }
    return { valid: true }
  }
}
