import { describe, it, expect } from 'vitest'
import type { Card } from '../../blackjack/types'
import { createInitialPokerTable, startHand, applyAction, getAvailableActions } from '../flow'
import type { PokerTableState } from '../types'

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

describe('street-by-street closures', () => {
  it('preflop check-around closes when no aggression (heads-up after blinds)', () => {
    let t: PokerTableState = createInitialPokerTable(2, [1], 200 as number)
    t = startHand(t)
    // Assuming SB posts 1, BB posts 2; preflop starts at UTG (SB when 2 players)
    // SB calls 1, BB checks → go to flop
    t = applyAction(t, { type: 'call' })
    t = applyAction(t, { type: 'check' })
    expect(['flop','turn','river'].includes(t.street as any) || t.status === 'hand_over').toBe(true)
  })

  it('flop bet and one raise then calls -> advances off flop', () => {
    let t: PokerTableState = createInitialPokerTable(3, [1,2], 200 as number)
    t = startHand(t)
    // close preflop quickly: fold, call, check
    // UTG folds
    t = applyAction(t, { type: 'fold' })
    // MP calls the BB
    t = applyAction(t, { type: 'call' })
    // BB checks
    t = applyAction(t, { type: 'check' })
    expect(['flop','turn','river'].includes(t.street as any) || t.status === 'hand_over').toBe(true)
    // On flop: force a bet (pot ~ small), then ensure a single raise occurs
    t = applyAction(t, { type: 'bet', amount: 6 })
    const a1 = getAvailableActions(t)
    t = applyAction(t, a1.includes('raise') ? { type: 'raise', amount: 6 } : { type: 'call' })
    // Now, drain remaining calls/checks until the street advances or hand ends
    let guard = 50
    while (t.status === 'in_hand' && t.street === 'flop' && guard-- > 0) {
      const a = getAvailableActions(t)
      if (a.includes('call')) t = applyAction(t, { type: 'call' })
      else if (a.includes('check')) t = applyAction(t, { type: 'check' })
      else break
    }
    expect(t.street !== 'flop' || t.status === 'hand_over').toBe(true)
  })

  it('all-in fast-forwards remaining streets to showdown (preflop shove)', () => {
    let t: PokerTableState = createInitialPokerTable(2, [1], 10 as number)
    t = startHand(t)
    // SB (to act) shoves preflop, BB calls
    t = applyAction(t, { type: 'raise', amount: 100 })
    t = applyAction(t, { type: 'call' })
    // Now everyone is all-in; streets should auto-advance to showdown on closure
    expect(t.status === 'hand_over').toBe(true)
  })
})


