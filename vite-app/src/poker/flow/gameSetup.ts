import { createStandardDeck, shuffleInPlace, makeXorShift32 } from "../../blackjack/deck";
import type { Card } from "../../blackjack/types";
import { CONFIG } from "../../config";
import type { PokerTableState, SeatState } from "../types";

/**
 * Create initial poker table with specified configuration
 */
export function createInitialPokerTable(
  numSeats: number, 
  cpuSeats: number[], 
  startingStack: number = CONFIG.poker.startingStack, 
  shoe?: Card[]
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
  }));
  
  return {
    handId: 0,
    deck: shoe ? [...shoe] : shuffleInPlace(createStandardDeck()),
    community: [],
    seats,
    buttonIndex: 0,
    street: null,
    status: "idle",
    currentToAct: null,
    lastAggressorIndex: null,
    betToCall: 0,
    lastRaiseAmount: CONFIG.poker.blinds.startingBigBlind,
    pot: { main: 0 },
    rules: { 
      smallBlind: CONFIG.poker.blinds.startingSmallBlind, 
      bigBlind: CONFIG.poker.blinds.startingBigBlind 
    },
    gameOver: false,
  };
}

/**
 * Prepare deck for a new hand with proper shuffling and seeding
 */
export function prepareDeckForHand(handId: number): Card[] {
  if (CONFIG.poker.random?.useSeeded) {
    // Derive per-hand seed to vary hands while remaining deterministic
    const base = CONFIG.poker.random.seed ?? 1;
    const inc = CONFIG.poker.random.perHandIncrement ?? 1;
    const seed = (base + (handId + 1) * inc) >>> 0;
    const rng = makeXorShift32(seed);
    return shuffleInPlace(createStandardDeck(), rng);
  } else {
    return shuffleInPlace(createStandardDeck());
  }
}

/**
 * Increase blind levels based on hand count configuration
 */
export function calculateBlindLevels(
  handId: number,
  currentSmallBlind: number,
  currentBigBlind: number
): { smallBlind: number; bigBlind: number } {
  const incEvery = CONFIG.poker.blinds?.increaseEveryHands ?? 0;
  const incFactor = CONFIG.poker.blinds?.increaseFactor ?? 1;
  
  if (incEvery > 0 && incFactor > 1 && handId > 0 && handId % incEvery === 0) {
    return {
      smallBlind: Math.max(1, currentSmallBlind * incFactor),
      bigBlind: Math.max(1, currentBigBlind * incFactor)
    };
  }
  
  return { smallBlind: currentSmallBlind, bigBlind: currentBigBlind };
}

/**
 * Reset seat state for a new hand
 */
export function resetSeatsForNewHand(
  seats: SeatState[]
): SeatState[] {
  return seats.map((seat) => ({
    ...seat,
    hole: [],
    committedThisStreet: 0,
    totalCommitted: 0,
    hasFolded: seat.stack <= 0,
    isAllIn: false,
  }));
}

/**
 * Check if there are enough funded players to continue
 */
export function hasEnoughFundedPlayers(seats: SeatState[]): boolean {
  const funded = seats.filter((x) => x.stack > 0).length;
  return funded >= 2;
}
