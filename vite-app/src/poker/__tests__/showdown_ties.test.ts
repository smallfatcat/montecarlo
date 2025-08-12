import { describe, it, expect } from 'vitest'
import type { Card } from '../../blackjack/types'
import { __test__finalizeShowdown, createInitialPokerTable } from '../flow'
import type { PokerTableState } from '../types'

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

describe('showdown ties and splits', () => {
  it('splits pot evenly on exact tie between two hands', () => {
    let t: PokerTableState = createInitialPokerTable(2, [1], 200 as number)
    t = { ...t, status: 'in_hand', street: 'river' }
    // Both players have same best five cards: community straight
    t.community = [C('5','Hearts'), C('6','Spades'), C('7','Clubs'), C('8','Diamonds'), C('9','Clubs')]
    t.seats[0].hole = [C('A','Clubs'), C('K','Spades')]
    t.seats[1].hole = [C('A','Diamonds'), C('K','Hearts')]
    t.seats[0].totalCommitted = 50
    t.seats[1].totalCommitted = 50
    t.pot.main = 100
    t.seats.forEach((s)=>{ s.hasFolded=false; s.isAllIn=true })
    const before = t.seats.map((s) => s.stack)
    t = __test__finalizeShowdown(t)
    const after = t.seats.map((s) => s.stack)
    expect(after[0] - before[0]).toBe(50)
    expect(after[1] - before[1]).toBe(50)
  })
})


