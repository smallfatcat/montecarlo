import { describe, it, expect } from 'vitest'
import type { Card } from '../types'
import {
  createInitialTable,
  startTableRound,
  seatHit,
  seatStand,
  seatSplit,
  getSeatAvailableActions,
  getActiveSeat,
  type TableState,
} from '../table'

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })
const D = (cards: Card[]): Card[] => [...cards]

describe('table seat progression and split restrictions', () => {
  it('advances from seat 0 to seat 1 after stand/bust, then to dealer', () => {
    let table: TableState = createInitialTable(2, [])
    const deck = D([
      // bottom .................................................................. top
      C('5', 'Clubs'), // filler
      C('9', 'Spades'), // F: D2
      C('9', 'Clubs'), // E: S1_2 -> 18
      C('9', 'Hearts'), // D: S0_2 -> 19
      C('7', 'Diamonds'), // C: D1
      C('10', 'Spades'), // B: S1_1 -> 10
      C('10', 'Hearts'), // A: S0_1 -> 10
    ])
    table = startTableRound({ ...table, deck }, 10)
    expect(table.activeSeatIndex).toBe(0)
    table = seatStand(table) // seat0 stands -> move to seat1
    expect(table.activeSeatIndex).toBe(1)
    table = seatStand(table) // seat1 stands -> dealer plays -> round_over
    expect(table.status).toBe('round_over')
  })

  it('split restricted to true pairs and one split per seat', () => {
    let table: TableState = createInitialTable(1, [])
    const deck = D([
      // bottom .................................................................. top
      C('5', 'Clubs'), // filler
      C('9', 'Spades'), // D: D2
      C('8', 'Hearts'), // C: P2 -> pair of 8s
      C('7', 'Diamonds'), // B: D1
      C('8', 'Clubs'), // A: P1 -> pair of 8s
    ])
    table = startTableRound({ ...table, deck }, 10)
    expect(getSeatAvailableActions(table)).toContain('split')
    table = seatSplit(table)
    // Now already split; even if next active hand is a pair, do not allow another split
    // Simulate a non-pair draw to ensure only hit/stand remain
    table = seatHit(table)
    const actions = getSeatAvailableActions(table)
    expect(actions).toContain('hit')
    expect(actions).toContain('stand')
    expect(actions).not.toContain('split')
  })
})


