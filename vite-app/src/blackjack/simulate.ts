import { createShoe, shuffleInPlace } from './deck'
import { CONFIG } from '../config'
import type { Card } from './types'
import type { TableState } from './table'
import { createInitialTable, startTableRound, getSeatAvailableActions, getActiveSeat, seatHit, seatStand, seatDouble, seatSplit } from './table'
import { suggestAction, type SuggestedAction } from './strategy'

export interface SimulationOptions {
  numHands: number
  numPlayers: number
  deckCount: number
  reshuffleCutoffRatio: number
  initialBankrolls: number[]
  casinoInitial: number
  betsBySeat: number[]
  existingShoe?: Card[]
}

export interface SimulationResult {
  finalBankrolls: number[]
  finalCasinoBank: number
  handsPlayed: number
  remainingShoe: Card[]
}

export function simulateSession(opts: SimulationOptions): SimulationResult {
  const {
    numHands,
    numPlayers,
    deckCount,
    reshuffleCutoffRatio,
    initialBankrolls,
    casinoInitial,
    betsBySeat,
    existingShoe,
  } = opts

  const cpuSeats = Array.from({ length: Math.max(0, numPlayers - 1) }, (_, i) => i + 1)
  let shoe: Card[] = existingShoe ? [...existingShoe] : shuffleInPlace(createShoe(deckCount))
  let table: TableState = createInitialTable(numPlayers, cpuSeats, shoe)
  let bankrolls = Array.from({ length: numPlayers }, (_, i) => initialBankrolls[i] ?? 0)
  let casinoBank = casinoInitial

  const cutoff = Math.floor(deckCount * CONFIG.shoe.cardsPerDeck * reshuffleCutoffRatio)

  for (let handIdx = 0; handIdx < numHands; handIdx += 1) {
    const needNewShoe = !shoe || shoe.length <= cutoff
    if (needNewShoe) {
      shoe = shuffleInPlace(createShoe(deckCount))
    }
    table = { ...table, deck: shoe }
    const betVector = Array.from({ length: numPlayers }, (_, i) => betsBySeat[i] ?? betsBySeat[0] ?? 0)
    table = startTableRound(table, betVector)

    // Act seats to completion
    while (table.status === 'seat_turn') {
      const seat = getActiveSeat(table)
      const idx = seat.activeHandIndex
      const hand = seat.hands[idx]
      const available = new Set(getSeatAvailableActions(table)) as Set<SuggestedAction | 'surrender'>
      const canSplit = available.has('split') && seat.hands.length === 1 && hand.length === 2 && hand[0].rank === hand[1].rank
      const action = suggestAction({ hand, dealerUp: table.dealerHand[0], available, canSplit }) || 'stand'
      switch (action) {
        case 'hit':
          table = seatHit(table)
          break
        case 'double':
          table = seatDouble(table)
          break
        case 'split':
          table = seatSplit(table)
          break
        case 'surrender':
        case 'stand':
        default:
          table = seatStand(table)
          break
      }
    }

    // Settle bankrolls
    if (table.status === 'round_over') {
      const deltas = table.seats.map((seat, i) => {
        if (!seat.outcomes) return 0
        let d = 0
        seat.outcomes.forEach((o, hi) => {
          const bet = seat.betsByHand[hi] ?? betVector[i]
          switch (o) {
          case 'player_blackjack':
            d += bet * CONFIG.rules.blackjackPayout
              break
            case 'player_win':
            case 'dealer_bust':
              d += bet
              break
            case 'push':
              break
            case 'player_bust':
            case 'dealer_win':
              d -= bet
              break
            default:
              break
          }
        })
        return d
      })
      bankrolls = bankrolls.map((b, i) => b + (deltas[i] ?? 0))
      const totalDelta = deltas.reduce((a, b) => a + b, 0)
      casinoBank -= totalDelta
      shoe = table.deck
      // Prepare table for next hand keeping seat meta
      table = { ...table, dealerHand: [], status: 'idle' as TableState['status'] }
    }
  }

  return {
    finalBankrolls: bankrolls,
    finalCasinoBank: casinoBank,
    handsPlayed: numHands,
    remainingShoe: shoe,
  }
}


