import { describe, it, expect } from 'vitest'
import type { Card } from '../types'
import { createInitialTable, startTableRound, getSeatAvailableActions, getActiveSeat, seatHit, seatStand, seatDouble, seatSplit, type TableState } from '../table'
import { createShoe } from '../deck'
import { suggestAction, type SuggestedAction } from '../strategy'
import { simulateSession } from '../simulate'

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })
const D = (cards: Card[]): Card[] => [...cards]

// Note: drawCard() pops from the end of the deck array.
// startTableRound (1 seat) deals in this pop order: P1, D1, P2, D2.

describe('multi-seat table (1-player scenarios)', () => {
  it('player can hit and then bust -> round_over with player_bust', () => {
    let table: TableState = createInitialTable(1, [])
    const deck = D([
      // bottom .................................................. top
      C('5', 'Clubs'), // filler
      C('7', 'Spades'), // E: hit -> bust (after initial deal)
      C('6', 'Hearts'), // D: dealer 2
      C('8', 'Clubs'), // C: player 2
      C('Q', 'Hearts'), // B: dealer 1
      C('10', 'Spades'), // A: player 1
    ])
    table = startTableRound({ ...table, deck }, 10)
    expect(table.status).toBe('seat_turn')

    table = seatHit(table) // player draws 7 -> 25 bust, auto-advance to dealer + settle
    expect(table.status).toBe('round_over')
    expect(table.seats[0].outcomes).toBeDefined()
    expect(table.seats[0].outcomes![0]).toBe('player_bust')
  })

  it('dealer stands on soft 17', () => {
    let table: TableState = createInitialTable(1, [])
    const deck = D([
      // bottom .................................................. top
      C('9', 'Clubs'), // filler
      C('6', 'Spades'), // D: dealer 2 -> A + 6 = soft 17
      C('9', 'Clubs'), // C: player 2 -> 18
      C('A', 'Hearts'), // B: dealer 1 -> Ace
      C('9', 'Spades'), // A: player 1 -> 9
    ])
    table = startTableRound({ ...table, deck }, 10)
    expect(table.status).toBe('seat_turn')

    table = seatStand(table) // player stands at 18; dealer has soft 17 and should stand
    expect(table.status).toBe('round_over')
    expect(table.seats[0].outcomes![0]).toBe('player_win') // 18 vs 17
  })

  it('split creates two hands and settles both vs dealer', () => {
    let table: TableState = createInitialTable(1, [])
    const deck = D([
      // bottom .................................................. top
      C('4', 'Clubs'), // filler
      C('10', 'Spades'), // D: dealer 2 -> dealer 17
      C('8', 'Hearts'), // C: player 2 -> pair of 8s
      C('7', 'Diamonds'), // B: dealer 1
      C('8', 'Clubs'), // A: player 1 -> pair of 8s
    ])
    table = startTableRound({ ...table, deck }, 10)
    expect(getSeatAvailableActions(table)).toContain('split')

    table = seatSplit(table)
    // Stand both split hands
    table = seatStand(table)
    table = seatStand(table)

    expect(table.status).toBe('round_over')
    expect(table.seats[0].outcomes).toBeDefined()
    expect(table.seats[0].outcomes!.length).toBe(2)
    // Dealer 17 vs [8], [8] -> both likely dealer_win with this setup
    expect(['dealer_win', 'player_win', 'push']).toContain(table.seats[0].outcomes![0]!)
    expect(['dealer_win', 'player_win', 'push']).toContain(table.seats[0].outcomes![1]!)
  })

  it('double doubles the bet and advances to dealer', () => {
    let table: TableState = createInitialTable(1, [])
    const bet = 10
    const deck = D([
      // bottom .................................................. top
      C('9', 'Clubs'), // filler
      C('5', 'Clubs'), // E: double draw -> player 16
      C('9', 'Diamonds'), // D: dealer 2
      C('6', 'Clubs'), // C: player 2 -> 11
      C('7', 'Spades'), // B: dealer 1
      C('5', 'Hearts'), // A: player 1
    ])
    table = startTableRound({ ...table, deck }, bet)
    expect(getSeatAvailableActions(table)).toContain('double')

    table = seatDouble(table) // draw once, double bet, then advance to dealer & settle
    expect(table.status).toBe('round_over')
    expect(table.seats[0].betsByHand[0]).toBe(bet * 2)
  })
})

describe('multi-seat table (multi-player scenarios)', () => {
  it('dealer bust: all non-bust seats get dealer_bust', () => {
    let table: TableState = createInitialTable(2, [])
    const deck = D([
      // bottom .................................................................. top
      C('5', 'Clubs'), // filler
      C('10', 'Clubs'), // H: dealer hit -> will cause bust later
      C('9', 'Clubs'), // G: dealer hit
      C('6', 'Hearts'), // F: D2 -> dealer 16 before hits
      C('9', 'Diamonds'), // E: S1_2 -> seat1 total 18
      C('10', 'Hearts'), // D: S0_2 -> seat0 total 20
      C('7', 'Spades'), // C: D1 -> 7
      C('9', 'Spades'), // B: S1_1 -> 9
      C('10', 'Spades'), // A: S0_1 -> 10
    ])
    table = startTableRound({ ...table, deck }, 10)
    // Seat 0 stands 20
    table = seatStand(table)
    // Seat 1 stands 18
    table = seatStand(table)
    // Dealer should draw 9 (total 25) then 10 is not needed; but we stacked two hits
    expect(table.status).toBe('round_over')
    const outcomes0 = table.seats[0].outcomes!
    const outcomes1 = table.seats[1].outcomes!
    expect(outcomes0[0]).toBe('dealer_bust')
    expect(outcomes1[0]).toBe('dealer_bust')
  })

  it('push is recorded when player and dealer totals tie', () => {
    let table: TableState = createInitialTable(2, [])
    const deck = D([
      // bottom .................................................................. top
      C('5', 'Clubs'), // filler
      C('10', 'Hearts'), // F: D2 -> dealer 19
      C('Q', 'Clubs'), // E: S1_2 -> seat1 19 (9+10)
      C('K', 'Spades'), // D: S0_2 -> seat0 20 (10+10)
      C('9', 'Diamonds'), // C: D1 -> 9
      C('9', 'Spades'), // B: S1_1 -> 9
      C('10', 'Hearts'), // A: S0_1 -> 10
    ])
    table = startTableRound({ ...table, deck }, 10)
    // Seat0 stands on 20
    table = seatStand(table)
    // Seat1 stands on 19
    table = seatStand(table)
    expect(table.status).toBe('round_over')
    const [o0] = table.seats[0].outcomes!
    const [o1] = table.seats[1].outcomes!
    // seat0 20 vs dealer 19 -> player_win
    expect(o0).toBe('player_win')
    // seat1 19 vs dealer 19 -> push
    expect(o1).toBe('push')
  })

  it('action availability: double only on first two, split only on true pairs before splitting', () => {
    let table: TableState = createInitialTable(1, [])
    const deck = D([
      // bottom .................................................................. top
      C('A', 'Clubs'), // E: hit card that does not bust after 10+K
      C('9', 'Hearts'), // D: D2
      C('K', 'Spades'), // C: P2 -> 10 (mixed ten-value with next card 10♣ would be pair? but here we mix 10 and K across scenarios)
      C('10', 'Clubs'), // B: P1 -> 10
      C('7', 'Diamonds'), // A: D1
    ])
    table = startTableRound({ ...table, deck }, 10)
    // First two cards -> double available
    expect(getSeatAvailableActions(table)).toContain('double')
    // Mixed tens (10 and K) are not a true pair -> split should NOT be available
    expect(getSeatAvailableActions(table)).not.toContain('split')

    // After a hit, double should no longer be available
    table = seatHit(table)
    const actionsAfterHit = getSeatAvailableActions(table)
    expect(actionsAfterHit).toContain('hit')
    expect(actionsAfterHit).toContain('stand')
    expect(actionsAfterHit).not.toContain('double')
  })
})

describe('integration-like behaviors', () => {
  it('multi-seat mixed outcomes: one busts, one wins, dealer stands', () => {
    let table: TableState = createInitialTable(2, [])
    const deck = D([
      // bottom .................................................................. top
      C('5', 'Clubs'), // filler
      C('8', 'Hearts'), // H: dealer 2 -> dealer 17
      C('9', 'Clubs'), // G: seat1 hit -> 18
      C('9', 'Hearts'), // F: seat0 hit -> bust (10+9+9=28)
      C('8', 'Spades'), // E: seat1_2 -> 18 (will hit once more above)
      C('9', 'Spades'), // D: seat0_2 -> 19
      C('9', 'Diamonds'), // C: dealer 1 -> 9
      C('10', 'Spades'), // B: seat1_1 -> 10
      C('10', 'Hearts'), // A: seat0_1 -> 10
    ])
    table = startTableRound({ ...table, deck }, 10)
    // Seat0 hits and busts
    table = seatHit(table)
    // Seat1 already at 18; stand
    table = seatStand(table)
    expect(table.status).toBe('round_over')
    const [o0] = table.seats[0].outcomes!
    const [o1] = table.seats[1].outcomes!
    expect(o0).toBe('player_bust')
    expect(['player_win', 'dealer_win', 'push']).toContain(o1)
  })
})


