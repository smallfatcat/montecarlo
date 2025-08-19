import { createStandardDeck, shuffleInPlace, makeXorShift32 } from '../blackjack/deck.js'
import type { Card } from '../blackjack/types'
import type { PokerTableState, SeatState } from '../types.js'
import { CONFIG } from '../localConfig.js'

/**
 * Creates a new poker table with the specified configuration
 */
export function createInitialPokerTable(
  numSeats: number,
  cpuSeats: number[],
  startingStack: number = CONFIG.poker.startingStack,
  shoe?: Card[],
): PokerTableState {
  const seats: SeatState[] = Array.from({ length: numSeats }, (_, i) => ({
    seatIndex: i,
    isCPU: cpuSeats.includes(i),
    hole: [],
    stack: startingStack,
    committedThisStreet: 0,
    totalCommitted: 0,
    hasFolded: false,
    isAllIn: false,
  }))

  return {
    handId: 0,
    deck: shoe ? [...shoe] : shuffleInPlace(createStandardDeck()),
    community: [],
    seats,
    buttonIndex: 0,
    street: null,
    status: 'idle',
    currentToAct: null,
    lastAggressorIndex: null,
    betToCall: 0,
    lastRaiseAmount: CONFIG.poker.blinds.startingBigBlind,
    pot: { main: 0 },
    rules: {
      smallBlind: CONFIG.poker.blinds.startingSmallBlind,
      bigBlind: CONFIG.poker.blinds.startingBigBlind,
    },
    gameOver: false,
  }
}

/**
 * Prepares a fresh deck for a new hand
 */
export function prepareDeckForHand(handId: number, useSeeded: boolean = false, baseSeed?: number): Card[] {
  if (useSeeded && baseSeed) {
    const inc = CONFIG.poker.random?.perHandIncrement ?? 1
    const seed = (baseSeed + (handId + 1) * inc) >>> 0
    const rng = makeXorShift32(seed)
    return shuffleInPlace(createStandardDeck(), rng)
  }
  return shuffleInPlace(createStandardDeck())
}
