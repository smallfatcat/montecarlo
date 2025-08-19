import { z } from 'zod'

/**
 * Server to Client message schemas
 */
export const S2C = {
  // Connection
  ready: z.object({ 
    serverTime: z.number().int() 
  }),
  
  pong: z.object({ 
    ts: z.number().int() 
  }),
  
  error: z.object({ 
    message: z.string() 
  }),
  
  // Table state
  seatUpdate: z.object({ 
    seatIndex: z.number().int().nonnegative(), 
    isCPU: z.boolean(), 
    playerId: z.string().nullable(), 
    playerName: z.string().nullable() 
  }),
  
  // Identity
  identity: z.object({ 
    token: z.string(), 
    name: z.string().nullable() 
  }),
  
  // Lobby and table management
  tableList: z.object({ 
    tables: z.array(z.object({
      tableId: z.string(),
      seats: z.number().int().positive(),
      humans: z.number().int().nonnegative(),
      cpus: z.number().int().nonnegative(),
      status: z.string(),
      handId: z.number().int().nonnegative().nullable(),
      updatedAt: z.number().int().nonnegative(),
      reserved: z.array(z.object({ 
        seatIndex: z.number().int().nonnegative(), 
        playerName: z.string().nullable(), 
        expiresAt: z.number().int().nonnegative() 
      })).default([]),
    })) 
  }),
  
  tableUpdate: z.object({
    tableId: z.string(),
    seats: z.number().int().positive(),
    humans: z.number().int().nonnegative(),
    cpus: z.number().int().nonnegative(),
    status: z.string(),
    handId: z.number().int().nonnegative().nullable(),
    updatedAt: z.number().int().nonnegative(),
    reserved: z.array(z.object({ 
      seatIndex: z.number().int().nonnegative(), 
      playerName: z.string().nullable(), 
      expiresAt: z.number().int().nonnegative() 
    })).default([]),
  }),
  
  tableRemoved: z.object({ 
    tableId: z.string() 
  }),
} as const

export type S2C = typeof S2C
