import { describe, it, expect } from 'vitest'
import { createInitialPokerTable, startHand, applyAction, getAvailableActions } from '../flow'
import type { PokerTableState } from '../types'

describe('raise availability in no-limit', () => {
  it('keeps raises available (no cap) after multiple raises', () => {
    let t: PokerTableState = createInitialPokerTable(3, [1,2], 200 as number)
    t = startHand(t)
    // preflop close quickly: fold, call, check
    t = applyAction(t, { type: 'fold' })
    t = applyAction(t, { type: 'call' })
    t = applyAction(t, { type: 'check' })
    expect(['flop','turn','river'].includes(t.street as any) || t.status === 'hand_over').toBe(true)
    // Bet and two raises (min-raise defaults)
    t = applyAction(t, { type: 'bet', amount: 6 })
    t = applyAction(t, { type: 'raise', amount: 6 })
    t = applyAction(t, { type: 'raise', amount: 6 })
    const avail = getAvailableActions(t)
    expect(avail.includes('raise')).toBe(true)
  })
})


