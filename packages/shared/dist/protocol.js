import { z } from 'zod';
export const BettingActionType = z.enum(['fold', 'check', 'call', 'bet', 'raise']);
export const BettingAction = z.object({
    type: BettingActionType,
    amount: z.number().int().nonnegative().optional(),
});
// Client -> Server messages
export const C2S = {
    joinTable: z.object({ tableId: z.string().default('table-1') }),
    beginHand: z.object({ tableId: z.string().default('table-1') }),
    act: z.object({ tableId: z.string().default('table-1'), action: BettingAction }),
    setAuto: z.object({ tableId: z.string().default('table-1'), auto: z.boolean() }),
    sit: z.object({ tableId: z.string().default('table-1'), seatIndex: z.number().int().nonnegative(), name: z.string().min(1).max(32).default('Player') }),
    leave: z.object({ tableId: z.string().default('table-1') }),
    ping: z.object({ ts: z.number().int() }),
    resetTable: z.object({ tableId: z.string().default('table-1') }),
};
// Server -> Client messages
export const S2C = {
    ready: z.object({ serverTime: z.number().int() }),
    pong: z.object({ ts: z.number().int() }),
    error: z.object({ message: z.string() }),
    seatUpdate: z.object({ seatIndex: z.number().int().nonnegative(), isCPU: z.boolean(), playerId: z.string().nullable(), playerName: z.string().nullable() }),
};
