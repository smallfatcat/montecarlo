import { describe, it, expect } from 'vitest'
import type { Card } from '../types'
import {
  createInitialTable,
  startTableRound,
  seatStand,
  type TableState,
} from '../table'

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })
const D = (cards: Card[]): Card[] => [...cards]

// Helper: For N seats, startTableRound deals in this pop order (top=end):
// S0_1, S1_1, ... S(N-1)_1, D1, S0_2, S1_2, ... S(N-1)_2, D2

describe('table start with mixed bet sizes and varying table sizes', () => {
  it('assigns per-seat bets from vector', () => {
    let table: TableState = createInitialTable(3, [1, 2])
    const deck = D([
      // bottom .................................................. top
      C('5', 'Clubs'),
      C('9', 'Spades'), // D2
      C('8', 'Hearts'), // S2_2
      C('7', 'Diamonds'), // S1_2
      C('10', 'Spades'), // S0_2
      C('9', 'Hearts'), // D1
      C('6', 'Clubs'), // S2_1
      C('5', 'Hearts'), // S1_1
      C('10', 'Clubs'), // S0_1
    ])
    table = { ...table, deck }
    const next = startTableRound(table, [5, 15, 25])
    expect(next.seats[0].betsByHand[0]).toBe(5)
    expect(next.seats[1].betsByHand[0]).toBe(15)
    expect(next.seats[2].betsByHand[0]).toBe(25)
  })

  it('bet vector shorter than seats uses first element as fallback', () => {
    let table: TableState = createInitialTable(4, [1, 2, 3])
    const deck = D([
      // 4 seats * 2 + dealer 2 = 10 draws
      C('5', 'Clubs'),
      C('9', 'Spades'), // D2
      C('2', 'Clubs'), // S3_2
      C('3', 'Clubs'), // S2_2
      C('4', 'Clubs'), // S1_2
      C('5', 'Clubs'), // S0_2
      C('9', 'Hearts'), // D1
      C('6', 'Clubs'), // S3_1
      C('7', 'Clubs'), // S2_1
      C('8', 'Clubs'), // S1_1
      C('9', 'Clubs'), // S0_1
    ])
    table = { ...table, deck }
    const next = startTableRound(table, [12])
    expect(next.seats.map((s) => s.betsByHand[0])).toEqual([12, 12, 12, 12])
  })

  it('startTableRound deals two cards to each seat and dealer for sizes 1..5', () => {
    for (let n = 1; n <= 5; n += 1) {
      let table: TableState = createInitialTable(n, Array.from({ length: Math.max(0, n - 1) }, (_, i) => i + 1))
      // Build a deck with enough cards: 2*n + 2
      const cardsNeeded = 2 * n + 2
      const deck: Card[] = []
      for (let i = 0; i < cardsNeeded; i += 1) deck.push(C('9', 'Clubs'))
      table = { ...table, deck }
      const next = startTableRound(table, 10)
      expect(next.seats).toHaveLength(n)
      expect(next.dealerHand).toHaveLength(2)
      next.seats.forEach((s) => expect(s.hands[0]).toHaveLength(2))
      expect(next.status).toBe('seat_turn')
    }
  })

  it('mixed bets persist through round and resolve outcomes for each seat', () => {
    // 2-seat table: seat0 20 vs dealer 18 -> player_win; seat1 18 vs 18 -> push
    let table: TableState = createInitialTable(2, [1])
    const deck = D([
      // bottom .................................................................. top
      C('5', 'Clubs'), // filler
      C('9', 'Hearts'), // F: D2 -> dealer 19
      C('9', 'Clubs'), // E: S1_2 -> 18
      C('K', 'Spades'), // D: S0_2 -> 20
      C('9', 'Diamonds'), // C: D1 -> 9
      C('9', 'Spades'), // B: S1_1 -> 9
      C('10', 'Hearts'), // A: S0_1 -> 10
    ])
    table = { ...table, deck }
    let next = startTableRound(table, [5, 25])
    // Stand both seats
    next = seatStand(next)
    next = seatStand(next)
    expect(next.status).toBe('round_over')
    expect(next.seats[0].betsByHand[0]).toBe(5)
    expect(next.seats[1].betsByHand[0]).toBe(25)
    const [o0] = next.seats[0].outcomes!
    const [o1] = next.seats[1].outcomes!
    expect(o0).toBe('player_win')
    expect(o1).toBe('push')
  })
})


