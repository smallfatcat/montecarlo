import { describe, it, expect } from 'vitest'
import type { Card } from '../../blackjack/types'
import { createInitialPokerTable, startHand, applyAction } from '../flow'
import type { PokerTableState } from '../types'

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

describe('poker flow: blinds, preflop to flop, simple actions', () => {
  it('posts blinds, deals, advances to flop when betting round closes', () => {
    let t: PokerTableState = createInitialPokerTable(3, [1,2], 200, [
      // bottom ........................................ top
      C('2','Clubs'), C('3','Clubs'), C('4','Clubs'), C('5','Clubs'), C('6','Clubs'),
      C('7','Clubs'), C('8','Clubs'), C('9','Clubs'), C('10','Clubs'), C('J','Clubs'),
      C('Q','Clubs'), C('K','Clubs'), C('A','Clubs'),
    ])
    t = startHand(t)
    expect(t.street).toBe('preflop')
    // UTG folds, MP calls, BTN (bb) checks -> close preflop
    t = applyAction(t, { type: 'fold' })
    t = applyAction(t, { type: 'call' })
    t = applyAction(t, { type: 'check' })
    expect(['flop','turn','river'].includes(t.street as any) || t.status === 'hand_over').toBe(true)
  })
})


