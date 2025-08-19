import type { PokerTableState, BettingAction } from '../types.js'
import { CONFIG } from '../localConfig.js'

/**
 * Posts a blind bet for a specific seat
 */
export function postBlind(state: PokerTableState, seatIndex: number, amount: number): void {
  const seat = state.seats[seatIndex]
  if (seat.hasFolded || seat.stack <= 0) return

  const actualAmount = Math.min(amount, seat.stack)
  seat.committedThisStreet = actualAmount
  seat.totalCommitted += actualAmount
  seat.stack -= actualAmount
  state.pot.main += actualAmount

  // Update betting state
  if (amount > state.betToCall) {
    state.betToCall = amount
    state.lastRaiseAmount = amount
  }
}

/**
 * Validates if a betting action is legal
 */
export function validateAction(state: PokerTableState, seatIndex: number, action: BettingAction): { valid: boolean; error?: string } {
  const seat = state.seats[seatIndex]
  if (seat.hasFolded) return { valid: false, error: 'Player has folded' }
  if (seat.isAllIn) return { valid: false, error: 'Player is all-in' }

  const toCall = Math.max(0, state.betToCall - seat.committedThisStreet)
  const availableStack = seat.stack

  switch (action.type) {
    case 'fold':
      return { valid: true }

    case 'check':
      if (toCall > 0) return { valid: false, error: 'Must call to check' }
      return { valid: true }

    case 'call':
      if (toCall > availableStack) return { valid: false, error: 'Insufficient stack to call' }
      return { valid: true }

    case 'bet':
      if (toCall > 0) return { valid: false, error: 'Cannot bet when there is a bet to call' }
      if (!action.amount || action.amount <= 0) return { valid: false, error: 'Bet amount must be positive' }
      if (action.amount > availableStack) return { valid: false, error: 'Insufficient stack to bet' }
      if (action.amount < state.rules.bigBlind) return { valid: false, error: 'Bet must be at least big blind' }
      return { valid: true }

    case 'raise':
      if (!action.amount || action.amount <= 0) return { valid: false, error: 'Raise amount must be positive' }
      if (action.amount <= toCall) return { valid: false, error: 'Raise must be more than call amount' }
      if (action.amount > availableStack) return { valid: false, error: 'Insufficient stack to raise' }
      if (action.amount < state.lastRaiseAmount) return { valid: false, error: 'Raise must be at least last raise amount' }
      return { valid: true }

    default:
      return { valid: false, error: 'Invalid action type' }
  }
}

/**
 * Executes a validated betting action
 */
export function executeAction(state: PokerTableState, seatIndex: number, action: BettingAction): void {
  const seat = state.seats[seatIndex]
  const toCall = Math.max(0, state.betToCall - seat.committedThisStreet)

  switch (action.type) {
    case 'fold':
      seat.hasFolded = true
      break

    case 'check':
      // No action needed for check
      break

    case 'call':
      const callAmount = Math.min(toCall, seat.stack)
      seat.committedThisStreet += callAmount
      seat.totalCommitted += callAmount
      seat.stack -= callAmount
      state.pot.main += callAmount
      break

    case 'bet':
      const betAmount = action.amount!
      seat.committedThisStreet += betAmount
      seat.totalCommitted += betAmount
      seat.stack -= betAmount
      state.pot.main += betAmount
      state.betToCall = betAmount
      state.lastRaiseAmount = betAmount
      break

    case 'raise':
      const raiseAmount = action.amount!
      seat.committedThisStreet += raiseAmount
      seat.totalCommitted += raiseAmount
      seat.stack -= raiseAmount
      state.pot.main += raiseAmount
      state.betToCall = raiseAmount
      state.lastRaiseAmount = raiseAmount
      break
  }

  // Check if player is all-in
  if (seat.stack === 0) {
    seat.isAllIn = true
  }
}

/**
 * Collects all bets into the pot at the end of a street
 */
export function collectBets(state: PokerTableState): void {
  state.seats.forEach((seat) => {
    if (seat.committedThisStreet > 0) {
      seat.totalCommitted += seat.committedThisStreet
      seat.committedThisStreet = 0
    }
  })
  state.betToCall = 0
}
