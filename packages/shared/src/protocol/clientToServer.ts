import { z } from 'zod'
import { BettingAction } from './common.js'

/**
 * Client to Server message schemas
 */
export const C2S = {
  // Table management
  joinTable: z.object({ 
    tableId: z.string().default('table-1') 
  }),
  
  beginHand: z.object({ 
    tableId: z.string().default('table-1') 
  }),
  
  act: z.object({ 
    tableId: z.string().default('table-1'), 
    action: BettingAction 
  }),
  
  setAuto: z.object({ 
    tableId: z.string().default('table-1'), 
    seatIndex: z.number().int().nonnegative(), 
    auto: z.boolean() 
  }),
  
  sit: z.object({ 
    tableId: z.string().default('table-1'), 
    seatIndex: z.number().int().nonnegative(), 
    name: z.string().min(1).max(32).default('Player') 
  }),
  
  leave: z.object({ 
    tableId: z.string().default('table-1') 
  }),
  
  resetTable: z.object({ 
    tableId: z.string().default('table-1') 
  }),
  
  // Identity and lobby
  identify: z.object({ 
    token: z.string().optional(), 
    name: z.string().min(1).max(32) 
  }),
  
  joinLobby: z.object({}),
  
  listTables: z.object({}),
  
  createTable: z.object({ 
    tableId: z.string().optional(), 
    seats: z.number().int().min(2).max(9).optional(), 
    startingStack: z.number().int().positive().optional() 
  }),
  
  // Utility
  ping: z.object({ 
    ts: z.number().int() 
  }),
  
  // State Machine Debug Control
  toggleDebugMode: z.object({ 
    tableId: z.string().default('table-1'), 
    enabled: z.boolean() 
  }),
} as const

export type C2S = typeof C2S
