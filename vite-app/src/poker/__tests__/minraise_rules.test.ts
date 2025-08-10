import { describe, it, expect } from 'vitest'
import { createInitialPokerTable, startHand, applyAction, __test__advanceStreet } from '../flow'
import type { PokerTableState } from '../types'

describe('no-limit min-raise rules', () => {
  it('preflop min-open is 2x big blind (1/2 -> to 4)', () => {
    let t: PokerTableState = createInitialPokerTable(3, [1,2], 200)
    t.rules.smallBlind = 1
    t.rules.bigBlind = 2
    t = startHand(t)
    // UTG to act; toCall = 2, minRaiseExtra = 2 → total to 4
    const afterOpen = applyAction(t, { type: 'raise', amount: 2 })
    const utg = (t.currentToAct as number) // original actor index
    expect(afterOpen.seats[utg].committedThisStreet).toBe(4)
    expect(afterOpen.betToCall).toBe(afterOpen.seats[utg].committedThisStreet)
  })

  it('postflop bet of 6 requires min-raise to 12 (extra 6)', () => {
    let t: PokerTableState = createInitialPokerTable(3, [1,2], 200)
    t.rules.smallBlind = 1
    t.rules.bigBlind = 2
    t = startHand(t)
    // Jump to flop for this test
    t = __test__advanceStreet(t) // flop
    // First to act bets 6
    const bettorIdx = t.currentToAct as number
    t = applyAction(t, { type: 'bet', amount: 6 })
    // Next player makes a min-raise: extra 6 → total to 12
    const raiserIdx = t.currentToAct as number
    const afterRaise = applyAction(t, { type: 'raise', amount: 6 })
    expect(afterRaise.seats[raiserIdx].committedThisStreet).toBe(12)
    // Check table betToCall reflects 12
    expect(afterRaise.betToCall).toBe(12)
  })

  it('short all-in below min-raise does not re-open action', () => {
    let t: PokerTableState = createInitialPokerTable(4, [1,2,3], 200)
    t.rules.smallBlind = 1
    t.rules.bigBlind = 2
    t = startHand(t)
    t = __test__advanceStreet(t) // flop
    // Seat A bets 6
    const a = t.currentToAct as number
    t = applyAction(t, { type: 'bet', amount: 6 })
    const lastRaiseBefore = t.lastRaiseAmount
    expect(lastRaiseBefore).toBe(6)
    // Seat B has only 8 total; toCall 6, extra 2 < minRaise (6)
    const b = t.currentToAct as number
    t.seats[b].stack = Math.min(t.seats[b].stack, 8)
    t = applyAction(t, { type: 'raise', amount: 2 }) // short all-in
    // lastRaiseAmount should remain 6 (not reopened)
    expect(t.lastRaiseAmount).toBe(6)
  })
})


