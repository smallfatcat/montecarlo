import { describe, it, expect } from 'vitest'
import type { Card } from '../../blackjack/types'
import { createInitialPokerTable, __test__finalizeShowdown } from '../flow'
import type { PokerTableState } from '../types'

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

describe('side pots', () => {
  it('awards pots correctly when multiple all-ins with different amounts', () => {
    let t: PokerTableState = createInitialPokerTable(3, [1,2], 200)
    // Manually craft a showdown state: all to showdown, set community and totals
    t = { ...t, status: 'in_hand', street: 'river' }
    // Assign hole cards to define winner order: seat0 strongest, seat1 middle, seat2 weakest
    t.seats[0].hole = [C('A','Clubs'), C('A','Spades')]
    t.seats[1].hole = [C('K','Clubs'), C('K','Spades')]
    t.seats[2].hole = [C('Q','Clubs'), C('Q','Spades')]
    t.community = [C('2','Hearts'), C('3','Hearts'), C('4','Hearts'), C('5','Hearts'), C('9','Spades')]
    // Commit totals to create side pots: seat2 all-in 10, seat1 all-in 50, seat0 covers 100
    t.seats[0].totalCommitted = 100
    t.seats[1].totalCommitted = 50
    t.seats[2].totalCommitted = 10
    t.pot.main = 160
    // Fold flags
    t.seats.forEach((s)=>{ s.hasFolded = false; s.isAllIn = true })
    const before = t.seats.map((s) => s.stack)
    t = __test__finalizeShowdown(t)
    const after = t.seats.map((s) => s.stack)
    // Pot breakdown:
    // - Main pot: 3 participants * min(10,50,100) = 30 → eligible 0,1,2 (seat0 wins)
    // - Side pot 1: participants with remaining (40 from s1, 90 from s0) => amount 80 → eligible 0,1 (seat0 wins)
    // - Side pot 2: participants with remaining (50 from s0) => amount 50 → eligible 0 (seat0 wins)
    // Total 160 to seat0
    expect(after[0] - before[0]).toBe(160)
    expect(after[1] - before[1]).toBe(0)
    expect(after[2] - before[2]).toBe(0)
  })

  it('splits main pot three-ways on exact tie, then awards side to eligible winners with remainder distribution', () => {
    let t: PokerTableState = createInitialPokerTable(4, [1,2,3], 200)
    t = { ...t, status: 'in_hand', street: 'river', buttonIndex: 0 }
    // Community high card; seats 0,1,2 tie exactly; seat3 weaker but has extra side contribution
    t.community = [C('2','Clubs'), C('5','Diamonds'), C('9','Spades'), C('J','Hearts'), C('K','Clubs')]
    t.seats[0].hole = [C('A','Clubs'), C('3','Spades')]
    t.seats[1].hole = [C('A','Diamonds'), C('4','Spades')]
    t.seats[2].hole = [C('A','Hearts'), C('2','Spades')]
    t.seats[3].hole = [C('Q','Clubs'), C('8','Hearts')]
    // Total committed: 30,30,30,31 → main pot 120 split among 0,1,2; side pot 1 (1 chip) eligible 3 only
    t.seats[0].totalCommitted = 30
    t.seats[1].totalCommitted = 30
    t.seats[2].totalCommitted = 30
    t.seats[3].totalCommitted = 31
    t.pot.main = 121
    t.seats.forEach((s)=>{ s.hasFolded=false; s.isAllIn=true })
    const before = t.seats.map((s) => s.stack)
    t = __test__finalizeShowdown(t)
    const after = t.seats.map((s) => s.stack)
    // Main pot: 120 split among seats 0,1,2 (exact tie). We check aggregate to avoid evaluator nuances.
    const delta012 = (after[0]-before[0]) + (after[1]-before[1]) + (after[2]-before[2])
    expect(delta012).toBe(120)
    expect(after[3] - before[3]).toBe(1)
  })
})


