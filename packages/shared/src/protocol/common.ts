import { z } from 'zod'

/**
 * Common protocol types and schemas
 */

export const BettingActionType = z.enum(['fold', 'check', 'call', 'bet', 'raise'])
export type BettingActionType = z.infer<typeof BettingActionType>

export const BettingAction = z.object({
  type: BettingActionType,
  amount: z.number().int().nonnegative().optional(),
})
export type BettingAction = z.infer<typeof BettingAction>
