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
    hole: Card[];
    stack: number;
    committedThisStreet: number;
    totalCommitted: number;
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
export declare const DEFAULT_RULES: RulesNoLimit;
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
export declare function isSeatActive(seat: SeatState): boolean;
export declare function cloneState(state: PokerTableState): PokerTableState;
export declare function getStreetBetSize(state: PokerTableState): number;
export declare function nextSeatIndex(seats: SeatState[], startExclusive: number): number | null;
export declare function nextSeatIndexWithChips(seats: SeatState[], startExclusive: number): number | null;
export declare function countActiveSeats(seats: SeatState[]): number;
//# sourceMappingURL=types.d.ts.map