import { z } from 'zod'

export const BettingActionType = z.enum(['fold', 'check', 'call', 'bet', 'raise'])
export type BettingActionType = z.infer<typeof BettingActionType>

export const BettingAction = z.object({
  type: BettingActionType,
  amount: z.number().int().nonnegative().optional(),
})
export type BettingAction = z.infer<typeof BettingAction>

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
  // Identity and lobby
  identify: z.object({ token: z.string().min(1).optional(), name: z.string().min(1).max(32).optional() }).default({}),
  joinLobby: z.object({}).default({}),
  listTables: z.object({}).default({}),
  createTable: z.object({ tableId: z.string().min(1).optional(), seats: z.number().int().positive().max(9).optional(), startingStack: z.number().int().positive().optional() }).default({}),
}

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
  })) }),
  tableUpdate: z.object({
    tableId: z.string(),
    seats: z.number().int().positive(),
    humans: z.number().int().nonnegative(),
    cpus: z.number().int().nonnegative(),
    status: z.string(),
    handId: z.number().int().nonnegative().nullable(),
    updatedAt: z.number().int().nonnegative(),
  }),
  tableRemoved: z.object({ tableId: z.string() }),
}


