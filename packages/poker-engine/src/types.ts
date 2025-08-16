import type { Card } from './blackjack/types'

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";

export type TableStatus = "idle" | "in_hand" | "hand_over";

export type BettingActionType = "fold" | "check" | "call" | "bet" | "raise";

export interface BettingAction {
  type: BettingActionType;
  amount?: number;
}

export interface SeatState {
  seatIndex: number;
  isCPU: boolean;
  hole: Card[];
  stack: number;
  committedThisStreet: number;
  totalCommitted: number;
  hasFolded: boolean;
  isAllIn: boolean;
}

export interface Pot {
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
  community: Card[];
  seats: SeatState[];
  buttonIndex: number;
  street: Street | null;
  status: TableStatus;
  currentToAct: number | null;
  lastAggressorIndex: number | null;
  betToCall: number;
  lastRaiseAmount: number;
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



