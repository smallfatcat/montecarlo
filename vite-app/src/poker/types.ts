import type { Card } from "../blackjack/types";

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";

export type TableStatus = "idle" | "in_hand" | "hand_over";

export type BettingActionType = "fold" | "check" | "call" | "bet" | "raise";

export interface BettingAction {
  type: BettingActionType;
  /** For no-limit, amount is required for bet/raise and is the additional chips to put in now (not total). */
  amount?: number;
}

export interface SeatState {
  seatIndex: number;
  isCPU: boolean;
  hole: Card[]; // 0,1,2 length depending on state
  stack: number; // chips available to act
  committedThisStreet: number; // amount committed on current street
  totalCommitted: number; // lifetime committed this hand
  hasFolded: boolean;
  isAllIn: boolean;
}

export interface Pot {
  /** Total chips in the main pot (side pots not yet implemented in v1) */
  main: number;
}

export interface RulesNoLimit {
  smallBlind: number;
  bigBlind: number;
}

export const DEFAULT_RULES: RulesNoLimit = {
  smallBlind: 1,
  bigBlind: 2,
};

export interface PokerTableState {
  handId: number;
  deck: Card[];
  community: Card[]; // up to 5
  seats: SeatState[];
  buttonIndex: number; // index into seats
  street: Street | null;
  status: TableStatus;
  currentToAct: number | null; // seat index or null if none
  lastAggressorIndex: number | null; // last player who bet/raised this street
  betToCall: number; // current highest committedThisStreet among active seats
  lastRaiseAmount: number; // size of last raise (for NL min-raise calculation); equals opening bet on bet
  pot: Pot;
  rules: RulesNoLimit;
  gameOver?: boolean;
}

export function isSeatActive(seat: SeatState): boolean {
  return !seat.hasFolded && !seat.isAllIn && seat.hole.length > 0;
}

export function cloneState(state: PokerTableState): PokerTableState {
  return {
    ...state,
    deck: [...state.deck],
    community: [...state.community],
    seats: state.seats.map((s) => ({ ...s, hole: [...s.hole] })),
    pot: { ...state.pot },
    rules: { ...state.rules },
  };
}

export function getStreetBetSize(state: PokerTableState): number {
  // For no-limit, this returns the big blind as the minimum open bet size preflop, else 1 chip baseline
  return state.rules.bigBlind;
}

export function nextSeatIndex(seats: SeatState[], startExclusive: number): number | null {
  const n = seats.length;
  for (let i = 1; i <= n; i += 1) {
    const idx = (startExclusive + i) % n;
    const s = seats[idx];
    if (!s.hasFolded && !s.isAllIn && s.stack > 0) return idx;
  }
  return null;
}

// Finds the next seat to the right (clockwise) with chips, regardless of current hand fold/all-in status.
// Useful for moving the dealer button between hands.
export function nextSeatIndexWithChips(seats: SeatState[], startExclusive: number): number | null {
  const n = seats.length;
  for (let i = 1; i <= n; i += 1) {
    const idx = (startExclusive + i) % n;
    if (seats[idx].stack > 0) return idx;
  }
  return null;
}

export function countActiveSeats(seats: SeatState[]): number {
  return seats.filter((s) => !s.hasFolded && s.stack > 0).length;
}


