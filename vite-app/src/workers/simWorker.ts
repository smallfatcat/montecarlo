// Web Worker to run high-speed blackjack simulations with progress updates
import { createShoe, shuffleInPlace } from '../blackjack/deck'
import { 
  createInitialTable, 
  startTableRound, 
  getSeatAvailableActions, 
  getActiveSeat, 
  seatHit, 
  seatStand, 
  seatDouble, 
  seatSplit 
} from '../blackjack/table'
import { suggestAction, type SuggestedAction } from '../blackjack/strategy'
import { CONFIG } from '../config'
import type { Card } from '../blackjack/types'
import type { TableState } from '../blackjack/table'

type RunMessage = {
  type: 'run'
  options: {
    numHands: number
    numPlayers: number
    deckCount: number
    reshuffleCutoffRatio: number
    initialBankrolls: number[]
    casinoInitial: number
    betsBySeat: number[]
    existingShoe?: Card[]
    rules?: Partial<{
      dealerHitsSoft17: boolean
      blackjackPayout: number
      doubleTotals: number[]
      doubleAfterSplit: boolean
      allowSplitRanks: string[] | null
    }>
  }
}

type ProgressMessage = {
  type: 'progress'
  completed: number
  total: number
}

type DoneMessage = {
  type: 'done'
  result: {
    finalBankrolls: number[]
    finalCasinoBank: number
    handsPlayed: number
    remainingShoe: Card[]
  }
}

type ErrorMessage = {
  type: 'error'
  error: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx: any = self

ctx.onmessage = (ev: MessageEvent<RunMessage>) => {
  try {
    const msg = ev.data
    if (!msg || msg.type !== 'run') return
    
    if (msg.options.rules) {
      Object.assign(CONFIG.rules, msg.options.rules)
    }
    const res = runWithProgress(msg.options, (completed, total) => {
      const progress: ProgressMessage = { type: 'progress', completed, total }
      ctx.postMessage(progress)
    })
    const done: DoneMessage = { type: 'done', result: res }
    ctx.postMessage(done)
  } catch (e) {
    const err: ErrorMessage = { type: 'error', error: (e as Error).message }
    ctx.postMessage(err)
  }
}

function runWithProgress(options: RunMessage['options'], onProgress: (completed: number, total: number) => void) {
  const {
    numHands,
    numPlayers,
    deckCount,
    reshuffleCutoffRatio,
    initialBankrolls,
    casinoInitial,
    betsBySeat,
    existingShoe,
  } = options

  const cpuSeats = Array.from({ length: Math.max(0, numPlayers - 1) }, (_, i) => i + 1)
  let shoe: Card[] = existingShoe ? [...existingShoe] : shuffleInPlace(createShoe(deckCount))
  let table: TableState = createInitialTable(numPlayers, cpuSeats, shoe)
  let bankrolls = Array.from({ length: numPlayers }, (_, i) => initialBankrolls[i] ?? 0)
  let casinoBank = casinoInitial
  const cutoff = Math.floor(deckCount * CONFIG.shoe.cardsPerDeck * reshuffleCutoffRatio)

  const chunk = Math.max(1, Math.floor(numHands / CONFIG.ui.simulation.progressUpdateSteps))

  for (let handIdx = 0; handIdx < numHands; handIdx += 1) {
    const needNewShoe = !shoe || shoe.length <= cutoff
    if (needNewShoe) {
      shoe = shuffleInPlace(createShoe(deckCount))
    }
    table = { ...table, deck: shoe }
    const betVector = Array.from({ length: numPlayers }, (_, i) => betsBySeat[i] ?? betsBySeat[0] ?? 0)
    table = startTableRound(table, betVector)

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

    if (table.status === 'round_over') {
      const deltas = table.seats.map((seat, i) => {
        if (!seat.outcomes) return 0
        let d = 0
        seat.outcomes.forEach((o, hi) => {
          const bet = seat.betsByHand[hi] ?? betVector[i]
          switch (o) {
          case 'player_blackjack': d += bet * CONFIG.rules.blackjackPayout; break
            case 'player_win':
            case 'dealer_bust': d += bet; break
            case 'push': break
            case 'player_bust':
            case 'dealer_win': d -= bet; break
          }
        })
        return d
      })
      bankrolls = bankrolls.map((b, i) => b + (deltas[i] ?? 0))
      const totalDelta = deltas.reduce((a, b) => a + b, 0)
      casinoBank -= totalDelta
      shoe = table.deck
      table = { ...table, dealerHand: [], status: 'idle' as TableState['status'] }
    }

    if ((handIdx + 1) % chunk === 0 || handIdx + 1 === numHands) {
      onProgress(handIdx + 1, numHands)
    }
  }

  return {
    finalBankrolls: bankrolls,
    finalCasinoBank: casinoBank,
    handsPlayed: numHands,
    remainingShoe: shoe,
  }
}


