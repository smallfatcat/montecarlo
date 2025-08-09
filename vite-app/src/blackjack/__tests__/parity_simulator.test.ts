import { describe, it, expect } from 'vitest'
import type { Card } from '../types'
import { createInitialTable, startTableRound, getSeatAvailableActions, getActiveSeat, seatHit, seatStand, seatDouble, seatSplit, type TableState } from '../table'
import { createShoe } from '../deck'
import { suggestAction, type SuggestedAction } from '../strategy'
import { simulateSession } from '../simulate'

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })
const D = (cards: Card[]): Card[] => [...cards]

describe('parity: simulator vs manual engine run', () => {
  it('produces identical bankroll deltas and casino bank for a deterministic deck (1 hand, 2 seats)', () => {
    // Deck (top=end): S0_1=10♣, S1_1=9♣, D1=7♦, S0_2=10♠, S1_2=9♦, D2=Q♣
    // Outcomes: seat0 20 vs dealer 17 -> player_win; seat1 18 vs 17 -> player_win
    const deck = D([
      C('5', 'Clubs'), // filler bottom
      C('Q', 'Clubs'), // D2 -> dealer 17
      C('9', 'Diamonds'), // S1_2 -> 18
      C('10', 'Spades'), // S0_2 -> 20
      C('7', 'Diamonds'), // D1 -> 7
      C('9', 'Clubs'), // S1_1 -> 9
      C('10', 'Clubs'), // S0_1 -> 10
    ])

    const numPlayers = 2
    const betsBySeat = [10, 25]
    const initialBankrolls = [100, 100]
    const casinoInitial = 10000

    // Manual engine path
    const cpuSeats = [1]
    let table: TableState = createInitialTable(numPlayers, cpuSeats, deck)
    table = startTableRound(table, betsBySeat)
    while (table.status === 'seat_turn') {
      const seat = getActiveSeat(table)
      const idx = seat.activeHandIndex
      const hand = seat.hands[idx]
      const available = new Set(getSeatAvailableActions(table)) as Set<SuggestedAction | 'surrender'>
      const canSplit = available.has('split') && seat.hands.length === 1 && hand.length === 2 && hand[0].rank === hand[1].rank
      const action = suggestAction({ hand, dealerUp: table.dealerHand[0], available, canSplit }) || 'stand'
      switch (action) {
        case 'hit': table = seatHit(table); break
        case 'double': table = seatDouble(table); break
        case 'split': table = seatSplit(table); break
        case 'surrender':
        case 'stand':
        default: table = seatStand(table); break
      }
    }

    const manualDeltas = table.seats.map((seat, i) => {
      if (!seat.outcomes) return 0
      let d = 0
      seat.outcomes.forEach((o, hi) => {
        const bet = seat.betsByHand[hi] ?? betsBySeat[i]
        switch (o) {
          case 'player_blackjack': d += bet * 1.5; break
          case 'player_win':
          case 'dealer_bust': d += bet; break
          case 'push': break
          case 'player_bust':
          case 'dealer_win': d -= bet; break
        }
      })
      return d
    })
    const manualFinalBankrolls = initialBankrolls.map((b, i) => b + manualDeltas[i])
    const manualCasinoBank = casinoInitial - manualDeltas.reduce((a, b) => a + b, 0)

    // Simulator path
    const sim = simulateSession({
      numHands: 1,
      numPlayers,
      deckCount: 6,
      reshuffleCutoffRatio: 0, // no reshuffle
      initialBankrolls,
      casinoInitial,
      betsBySeat,
      existingShoe: deck,
    })

    expect(sim.finalBankrolls).toEqual(manualFinalBankrolls)
    expect(sim.finalCasinoBank).toEqual(manualCasinoBank)
  })

  it('multiple hands parity with larger deterministic shoe (no reshuffle)', () => {
    const numPlayers = 3
    const betsBySeat = [10, 15, 20]
    const initialBankrolls = [100, 100, 100]
    const casinoInitial = 10000
    const numHands = 20
    // Build a large deterministic shoe: 8 decks to ensure enough cards
    const existingShoe = createShoe(8)

    // Manual engine path
    const cpuSeats = [1, 2]
    let shoe: Card[] = [...existingShoe]
    let table: TableState = createInitialTable(numPlayers, cpuSeats, shoe)
    let manualBankrolls = [...initialBankrolls]
    let manualCasino = casinoInitial
    for (let h = 0; h < numHands; h += 1) {
      table = { ...table, deck: [...shoe] }
      table = startTableRound(table, betsBySeat)
      while (table.status === 'seat_turn') {
        const seat = getActiveSeat(table)
        const idx = seat.activeHandIndex
        const hand = seat.hands[idx]
        const available = new Set(getSeatAvailableActions(table)) as Set<SuggestedAction | 'surrender'>
        const canSplit = available.has('split') && seat.hands.length === 1 && hand.length === 2 && hand[0].rank === hand[1].rank
        const action = suggestAction({ hand, dealerUp: table.dealerHand[0], available, canSplit }) || 'stand'
        switch (action) {
          case 'hit': table = seatHit(table); break
          case 'double': table = seatDouble(table); break
          case 'split': table = seatSplit(table); break
          case 'surrender':
          case 'stand':
          default: table = seatStand(table); break
        }
      }
      const deltas = table.seats.map((seat, i) => {
        if (!seat.outcomes) return 0
        let d = 0
        seat.outcomes.forEach((o, hi) => {
          const bet = seat.betsByHand[hi] ?? betsBySeat[i]
          switch (o) {
            case 'player_blackjack': d += bet * 1.5; break
            case 'player_win':
            case 'dealer_bust': d += bet; break
            case 'push': break
            case 'player_bust':
            case 'dealer_win': d -= bet; break
          }
        })
        return d
      })
      manualBankrolls = manualBankrolls.map((b, i) => b + (deltas[i] ?? 0))
      manualCasino -= deltas.reduce((a, b) => a + b, 0)
      shoe = [...table.deck]
    }

    // Simulator path
    const sim = simulateSession({
      numHands,
      numPlayers,
      deckCount: 6,
      reshuffleCutoffRatio: 0,
      initialBankrolls,
      casinoInitial,
      betsBySeat,
      existingShoe,
    })

    expect(sim.finalBankrolls).toEqual(manualBankrolls)
    expect(sim.finalCasinoBank).toEqual(manualCasino)
  })
})


