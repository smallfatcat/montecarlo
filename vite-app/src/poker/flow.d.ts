import type { Card } from "../blackjack/types";
import type { PokerTableState, BettingAction } from "./types";
export declare function createInitialPokerTable(numSeats: number, cpuSeats: number[], startingStack?: number, shoe?: Card[]): PokerTableState;
export declare function startHand(state: PokerTableState): PokerTableState;
export declare function getAvailableActions(state: PokerTableState): BettingAction["type"][];
export declare function applyAction(state: PokerTableState, action: BettingAction): PokerTableState;
export declare function computePots(state: PokerTableState): {
    amount: number;
    eligibleSeatIdxs: number[];
}[];
export declare function getTotalPot(state: PokerTableState): number;
export declare function __test__advanceStreet(state: PokerTableState): PokerTableState;
export declare function __test__finalizeShowdown(state: PokerTableState): PokerTableState;
//# sourceMappingURL=flow.d.ts.map