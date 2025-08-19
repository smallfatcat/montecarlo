import type { PokerTableState } from '../types.js'
import { collectBets } from './bettingLogic.js'
import { dealCards } from './handManagement.js'

/**
 * Advances the game to the next street
 */
export function advanceStreet(state: PokerTableState): void {
  const s = state
  
  // Collect all bets from current street
  collectBets(s)
  
  // Advance to next street
  switch (s.street) {
    case 'preflop':
      s.street = 'flop'
      dealCommunityCards(s, 3)
      break
    case 'flop':
      s.street = 'turn'
      dealCommunityCards(s, 1)
      break
    case 'turn':
      s.street = 'river'
      dealCommunityCards(s, 1)
      break
    case 'river':
      s.street = 'showdown'
      break
    default:
      break
  }
  
  // Reset betting state for new street
  s.betToCall = 0
  s.seats.forEach(seat => {
    seat.committedThisStreet = 0
  })
}

/**
 * Deals community cards for the current street
 */
function dealCommunityCards(state: PokerTableState, count: number): void {
  for (let i = 0; i < count; i++) {
    const card = state.deck.pop()
    if (card) {
      state.community.push(card)
    }
  }
}

/**
 * Checks if the current street is complete
 */
export function isStreetComplete(state: PokerTableState): boolean {
  const activeSeats = state.seats.filter(seat => !seat.hasFolded && !seat.isAllIn)
  
  if (activeSeats.length <= 1) return true
  
  // Check if all active players have matched the bet
  return activeSeats.every(seat => 
    seat.committedThisStreet >= state.betToCall || seat.isAllIn
  )
}

/**
 * Determines if the hand should end
 */
export function shouldEndHand(state: PokerTableState): boolean {
  const activeSeats = state.seats.filter(seat => !seat.hasFolded && !seat.isAllIn)
  
  // End if only one player remains
  if (activeSeats.length <= 1) return true
  
  // End if we've reached showdown
  if (state.street === 'showdown') return true
  
  return false
}
