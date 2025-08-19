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
    setAuto: z.object({ tableId: z.string().default('table-1'), seatIndex: z.number().int().nonnegative(), auto: z.boolean() }),
    sit: z.object({ tableId: z.string().default('table-1'), seatIndex: z.number().int().nonnegative(), name: z.string().min(1).max(32).default('Player') }),
    leave: z.object({ tableId: z.string().default('table-1') }),
    ping: z.object({ ts: z.number().int() }),
    resetTable: z.object({ tableId: z.string().default('table-1') }),
    // Identity and lobby
    identify: z.object({ token: z.string().optional(), name: z.string().min(1).max(32) }),
    joinLobby: z.object({}),
    listTables: z.object({}),
    createTable: z.object({ tableId: z.string().optional(), seats: z.number().int().min(2).max(9).optional(), startingStack: z.number().int().positive().optional() }),
    // State Machine Debug Control
    toggleDebugMode: z.object({
        tableId: z.string().default('table-1'),
        enabled: z.boolean()
    }),
};
// Server -> Client messages
export const S2C = {
    ready: z.object({ serverTime: z.number().int() }),
    pong: z.object({ ts: z.number().int() }),
    error: z.object({ message: z.string() }),
    seatUpdate: z.object({ seatIndex: z.number().int().nonnegative(), isCPU: z.boolean(), playerId: z.string().nullable(), playerName: z.string().nullable() }),
    identity: z.object({ token: z.string(), name: z.string().nullable() }),
    tableList: z.object({ tables: z.array(z.object({
            tableId: z.string(),
            seats: z.number().int().positive(),
            humans: z.number().int().nonnegative(),
            cpus: z.number().int().nonnegative(),
            status: z.string(),
            handId: z.number().int().nonnegative().nullable(),
            updatedAt: z.number().int().nonnegative(),
            reserved: z.array(z.object({ seatIndex: z.number().int().nonnegative(), playerName: z.string().nullable(), expiresAt: z.number().int().nonnegative() })).default([]),
        })) }),
    tableUpdate: z.object({
        tableId: z.string(),
        seats: z.number().int().positive(),
        humans: z.number().int().nonnegative(),
        cpus: z.number().int().nonnegative(),
        status: z.string(),
        handId: z.number().int().nonnegative().nullable(),
        updatedAt: z.number().int().nonnegative(),
        reserved: z.array(z.object({ seatIndex: z.number().int().nonnegative(), playerName: z.string().nullable(), expiresAt: z.number().int().nonnegative() })).default([]),
    }),
    tableRemoved: z.object({ tableId: z.string() }),
};
