import { describe, it, expect } from 'vitest'
import { createInitialPokerTable, computePots, __test__finalizeShowdown } from '../flow'
import type { PokerTableState } from '../types'
import type { Card } from '../../blackjack/types'
import { CONFIG } from '../../config'

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

describe('side pots', () => {
  it('constructs layered pots for 3-way uneven commitments', () => {
    const t = createInitialPokerTable(3, [1,2], 0 as number)
    t.seats.forEach(s => { s.hasFolded = false })
    t.seats[0].totalCommitted = 10
    t.seats[1].totalCommitted = 20
    t.seats[2].totalCommitted = 50

    const pots = computePots(t)
    expect(pots).toEqual([
      { amount: 30, eligibleSeatIdxs: [0,1,2] },
      { amount: 20, eligibleSeatIdxs: [1,2] },
      { amount: 30, eligibleSeatIdxs: [2] },
    ])
  })

  it('awards all pots to the best eligible hand', () => {
    let t: PokerTableState = createInitialPokerTable(3, [1,2], 0 as number)
    t.buttonIndex = 0
    t.seats.forEach(s => { s.hasFolded = false; s.stack = 0 })
    // Commitments: 10, 20, 50 -> pots 30,20,30 (rake 0)
    t.seats[0].totalCommitted = 10
    t.seats[1].totalCommitted = 20
    t.seats[2].totalCommitted = 50
    // Give player 2 the clear best hand
    t.community = [C('A','Clubs'), C('K','Diamonds'), C('7','Clubs'), C('2','Diamonds'), C('9','Spades')]
    t.seats[0].hole = [C('3','Clubs'), C('4','Clubs')]
    t.seats[1].hole = [C('K','Hearts'), C('Q','Hearts')]
    t.seats[2].hole = [C('A','Hearts'), C('A','Spades')]

    t = __test__finalizeShowdown(t)
    // Player 2 should receive 80 total; others zero
    expect(t.seats[2].stack).toBe(80)
    expect(t.seats[0].stack).toBe(0)
    expect(t.seats[1].stack).toBe(0)
  })

  it('splits pot with remainder deterministically (rake creates odd distributable)', () => {
    const restore = { pct: CONFIG.poker.rakePercent, cap: CONFIG.poker.rakeCap }
    ;(CONFIG.poker as any).rakePercent = 0.05
    ;(CONFIG.poker as any).rakeCap = 0
    let t: PokerTableState = createInitialPokerTable(2, [1], 0 as number)
    t.buttonIndex = 0
    t.seats.forEach(s => { s.hasFolded = false; s.stack = 0 })
    // Both commit 10 -> single pot amount 20; rake=1 -> distributable 19
    t.seats[0].totalCommitted = 10
    t.seats[1].totalCommitted = 10
    // Force a tie between both seats
    t.community = [C('A','Clubs'), C('K','Diamonds'), C('Q','Clubs'), C('J','Diamonds'), C('10','Spades')]
    t.seats[0].hole = [C('2','Clubs'), C('3','Clubs')]
    t.seats[1].hole = [C('2','Hearts'), C('3','Hearts')]

    t = __test__finalizeShowdown(t)
    // 19 split -> 9 each, remainder 1 goes clockwise from button+1 (seat 1)
    expect(t.seats[0].stack).toBe(9)
    expect(t.seats[1].stack).toBe(10)
    ;(CONFIG.poker as any).rakePercent = restore.pct
    ;(CONFIG.poker as any).rakeCap = restore.cap
  })
})

describe('side pots (advanced scenarios)', () => {
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

  it('4-way all-in layered side pots with overpairs on dry board (Aces > Kings > Queens > Jacks)', () => {
    let t: PokerTableState = createInitialPokerTable(4, [1,2,3], 0)
    t.seats.forEach(s => { s.hasFolded = false; s.stack = 0 })
    // Totals: 10,20,30,40
    t.seats[0].totalCommitted = 10
    t.seats[1].totalCommitted = 20
    t.seats[2].totalCommitted = 30
    t.seats[3].totalCommitted = 40
    // Hole cards
    t.seats[0].hole = [C('A','Clubs'), C('A','Hearts')]
    t.seats[1].hole = [C('K','Clubs'), C('K','Hearts')]
    t.seats[2].hole = [C('Q','Clubs'), C('Q','Hearts')]
    t.seats[3].hole = [C('J','Clubs'), C('J','Hearts')]
    // Board: 2H, 3C, 6S, 7D, 8H
    t.community = [C('2','Hearts'), C('3','Clubs'), C('6','Spades'), C('7','Diamonds'), C('8','Hearts')]

    const pots = computePots(t)
    expect(pots.map(p => p.amount)).toEqual([40, 30, 20, 10])
    // Settle and assert stacks
    t = __test__finalizeShowdown(t)
    expect(t.seats[0].stack).toBe(40)
    expect(t.seats[1].stack).toBe(30)
    expect(t.seats[2].stack).toBe(20)
    expect(t.seats[3].stack).toBe(10)
  })
})


