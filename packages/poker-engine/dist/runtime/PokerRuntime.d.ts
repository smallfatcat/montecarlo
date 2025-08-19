import type { PokerTableState, BettingAction } from '../types';
export type RuntimeCallbacks = {
    onState: (state: PokerTableState) => void;
    onAction?: (handId: number, seat: number, action: BettingAction, toCall: number, street: PokerTableState['street']) => void;
    onDeal?: (handId: number, street: Exclude<PokerTableState['street'], 'preflop' | 'showdown' | null>, cardCodes: string[]) => void;
    onHandStart?: (handId: number, buttonIndex: number, smallBlind: number, bigBlind: number) => void;
    onPostBlind?: (seat: number, amount: number) => void;
    onHandSetup?: (setup: {
        handId: number;
        buttonIndex: number;
        rules: {
            smallBlind: number;
            bigBlind: number;
        };
        deck: string[];
        deckRemaining: number;
        deckTotal: number;
        seats: Array<{
            stack: number;
            committedThisStreet: number;
            totalCommitted: number;
            hasFolded: boolean;
            isAllIn: boolean;
            hole: string[];
        }>;
    }) => void;
};
export interface RuntimeOptions {
    seats: number;
    cpuSeats: number[];
    startingStack: number;
    shouldAutoplaySeat?: (seatIndex: number) => boolean;
}
export declare class PokerRuntime {
    private state;
    private autoPlay;
    private timers;
    private readonly cb;
    private delayBumpOnceMs;
    private readonly shouldAutoplaySeatFn;
    constructor(opts: RuntimeOptions, cb: RuntimeCallbacks);
    dispose(): void;
    setAutoPlay(v: boolean): void;
    rearmTimers(): void;
    /**
     * Toggle whether a given seat should be driven by CPU logic.
     * When set to false, the runtime will not schedule an automatic CPU action when it is this seat's turn.
     */
    setSeatCpu(seatIndex: number, isCpu: boolean): void;
    /**
     * Check if autodeal is currently enabled (i.e., if at least one seat has autoplay enabled).
     * When autodeal is disabled, the next hand must be started manually by calling beginHand().
     */
    isAutodealEnabled(): boolean;
    beginHand(): void;
    act(action: BettingAction): void;
    private clearAllTimers;
    private armTimers;
    private suggestCpuAction;
}
//# sourceMappingURL=PokerRuntime.d.ts.map