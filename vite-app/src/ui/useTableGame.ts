import { useEffect, useMemo, useRef, useState } from 'react'
import type { Card } from '../blackjack'
import { createShoe, shuffleInPlace } from '../blackjack/deck'
import { CONFIG } from '../config'
import { evaluateHand } from '../blackjack/hand'
import type { TableState, TableStatus } from '../blackjack/table'
import { createInitialTable, startTableRound, seatHit, seatStand, seatDouble, seatSplit, getSeatAvailableActions, getActiveSeat } from '../blackjack/table'
import { suggestAction, type SuggestedAction } from '../blackjack/strategy'

export function useTableGame() {
  const [deckCount, setDeckCount] = useState<number>(CONFIG.shoe.defaultNumDecks)
  const [shoe, setShoe] = useState<Card[] | undefined>(undefined)
  const [table, setTable] = useState<TableState>(() => createInitialTable(3, [1, 2]))
  const [bankrolls, setBankrolls] = useState<number[]>([CONFIG.bankroll.initialPerSeat, CONFIG.bankroll.initialPerSeat, CONFIG.bankroll.initialPerSeat])
  const [numPlayers, setNumPlayers] = useState<number>(3)
  const [autoPlay, setAutoPlay] = useState<boolean>(false)
  const [lastBet, setLastBet] = useState<number>(CONFIG.bets.defaultPerSeat)
  const [betsBySeat, setBetsBySeat] = useState<number[]>([CONFIG.bets.defaultPerSeat, CONFIG.bets.defaultPerSeat, CONFIG.bets.defaultPerSeat])
  const [roundId, setRoundId] = useState<number>(0)
  const [settledRoundId, setSettledRoundId] = useState<number>(-1)
  const timersRef = useRef<number[]>([])

  // --- History for multi-seat table (debugging) ---
  type TableActionType = 'deal' | 'hit' | 'stand' | 'double' | 'split' | 'dealer_play' | 'finalize'
  interface TableActionEntry {
    type: TableActionType
    timestamp: number
    seatIndex?: number
    handIndex?: number
  }
  interface TableRoundHistory {
    shoeStart: Card[]
    shoeEnd?: Card[]
    bankrollBefore: number
    bankrollAfter?: number
    betPerSeat: number
    actions: TableActionEntry[]
    initialDealerHand: Card[]
    initialSeatHands: Card[][][]
    outcomesBySeat?: string[][]
  }
  const [histories, setHistories] = useState<TableRoundHistory[]>([])

  // initialize shoe and table (with persisted numPlayers/bankrolls if available)
  useEffect(() => {
    const persistedPlayers = Number(localStorage.getItem('bj_numPlayers') || '3')
    const persistedBankrolls: number[] | null = (() => { try { return JSON.parse(localStorage.getItem('bj_bankrolls') || 'null') } catch { return null } })()
    if (Number.isFinite(persistedPlayers) && persistedPlayers >= 1 && persistedPlayers <= 5) setNumPlayers(persistedPlayers)
    if (Array.isArray(persistedBankrolls) && persistedBankrolls.length > 0) setBankrolls(persistedBankrolls.map((v) => (Number.isFinite(v) ? v : 100)))
    const initial = shuffleInPlace(createShoe(deckCount))
    setShoe(initial)
    const cpuSeats = Array.from({ length: Math.max(0, numPlayers - 1) }, (_, i) => i + 1)
    const initialTable = createInitialTable(numPlayers, cpuSeats, initial)
    setTable(initialTable)
    setBankrolls((prev) => {
      const base = prev.length === initialTable.seats.length ? prev : Array.from({ length: initialTable.seats.length }, (_, i) => prev[i] ?? 100)
      return base
    })
    // ensure bets vector length matches seats
    setBetsBySeat((prev) => Array.from({ length: initialTable.seats.length }, (_, i) => prev[i] ?? CONFIG.bets.defaultPerSeat))
  }, [])

  const deal = (bet: number) => {
    // auto-reshuffle when shoe is low (<= 20% remaining)
    const needNewShoe = shouldReshuffle(deckCount, shoe)
    const deckToUse = needNewShoe ? shuffleInPlace(createShoe(deckCount)) : shoe!
    const betVector = Array.from({ length: table.seats.length }, (_, i) => (i === 0 ? bet : (betsBySeat[i] ?? lastBet)))
    const next = startTableRound({ ...table, deck: deckToUse }, betVector)
    setShoe(next.deck)
    setTable(next)
    setLastBet(bet)
    setRoundId((r) => r + 1)
    // Create history entry for this round
    setHistories((h) => ([
      ...h,
      {
        shoeStart: [...deckToUse],
        bankrollBefore: bankrolls[0],
        betPerSeat: bet,
        actions: [{ type: 'deal', timestamp: Date.now() }],
        initialDealerHand: [...next.dealerHand],
        initialSeatHands: next.seats.map((s) => s.hands.map((hand) => [...hand])),
      },
    ]))
  }

  const newShoe = (decks: number) => {
    const normalized = Math.max(1, Math.floor(decks || CONFIG.shoe.defaultNumDecks))
    setDeckCount(normalized)
    const nextShoe = shuffleInPlace(createShoe(normalized))
    setShoe(nextShoe)
    setTable((t) => ({ ...t, deck: nextShoe }))
  }

  // Change number of players (1..5). Seats > 1 are CPU.
  const setPlayers = (n: number) => {
    const clamped = Math.max(1, Math.min(5, Math.floor(n || 1)))
    const cpuSeats = Array.from({ length: Math.max(0, clamped - 1) }, (_, i) => i + 1)
    const deckToUse = shoe ?? shuffleInPlace(createShoe(deckCount))
    const next = createInitialTable(clamped, cpuSeats, deckToUse)
    setTable(next)
    setNumPlayers(clamped)
    setBankrolls((prev) => Array.from({ length: clamped }, (_, i) => prev[i] ?? 100))
    setBetsBySeat((prev) => Array.from({ length: clamped }, (_, i) => prev[i] ?? 10))
  }

  // Human actions map to active seat only when seat 0 (player) is active
  const appendAction = (type: TableActionType, seatIndex: number, handIndex: number) => {
    setHistories((h) => {
      if (h.length === 0) return h
      const copy = h.slice()
      const last = copy[copy.length - 1]
      const updated: TableRoundHistory = {
        ...last,
        actions: [...last.actions, { type, timestamp: Date.now(), seatIndex, handIndex }],
      }
      copy[copy.length - 1] = updated
      return copy
    })
  }

  const hit = () => setTable((prev) => {
    const seatIdx = prev.activeSeatIndex
    const handIdx = prev.seats[seatIdx]?.activeHandIndex ?? 0
    appendAction('hit', seatIdx, handIdx)
    return seatHit(prev)
  })
  const stand = () => setTable((prev) => {
    const seatIdx = prev.activeSeatIndex
    const handIdx = prev.seats[seatIdx]?.activeHandIndex ?? 0
    appendAction('stand', seatIdx, handIdx)
    return seatStand(prev)
  })
  const double = () => setTable((prev) => {
    const seatIdx = prev.activeSeatIndex
    const handIdx = prev.seats[seatIdx]?.activeHandIndex ?? 0
    appendAction('double', seatIdx, handIdx)
    return seatDouble(prev)
  })
  const split = () => setTable((prev) => {
    const seatIdx = prev.activeSeatIndex
    const handIdx = prev.seats[seatIdx]?.activeHandIndex ?? 0
    appendAction('split', seatIdx, handIdx)
    return seatSplit(prev)
  })

  // CPU autoplay for seats 1 and 2
  useEffect(() => {
    if (table.status !== 'seat_turn') return
    const seatIdx = table.activeSeatIndex
    if (seatIdx === 0) return
    const seat = getActiveSeat(table)
    const idx = seat.activeHandIndex
    const hand = seat.hands[idx]
    const available = new Set(getSeatAvailableActions(table)) as Set<SuggestedAction | 'surrender'>
    const canSplit = available.has('split') && seat.hands.length === 1 && hand.length === 2 && hand[0].rank === hand[1].rank
    const action = suggestAction({ hand, dealerUp: table.dealerHand[0], available, canSplit }) || 'stand'
    const timer = window.setTimeout(() => {
      setTable((t) => {
        switch (action) {
          case 'hit':
            return seatHit(t)
          case 'double':
            return seatDouble(t)
          case 'split':
            return seatSplit(t)
          case 'surrender':
          case 'stand':
          default:
            return seatStand(t)
        }
      })
    }, CONFIG.autoplay.cpuActionDelayMs)
    timersRef.current.push(timer)
    return () => timersRef.current.forEach((id) => clearTimeout(id))
  }, [table])

  // Player autoplay during player's turn
  useEffect(() => {
    if (!autoPlay) return
    if (table.status !== 'seat_turn') return
    if (table.activeSeatIndex !== 0) return
    const seat = getActiveSeat(table)
    const idx = seat.activeHandIndex
    const hand = seat.hands[idx]
    const available = new Set(getSeatAvailableActions(table)) as Set<SuggestedAction | 'surrender'>
    const canSplit = available.has('split') && seat.hands.length === 1 && hand.length === 2 && hand[0].rank === hand[1].rank
    const action = suggestAction({ hand, dealerUp: table.dealerHand[0], available, canSplit }) || 'stand'
    const timer = window.setTimeout(() => {
      setTable((t) => {
        switch (action) {
          case 'hit':
            return seatHit(t)
          case 'double':
            return seatDouble(t)
          case 'split':
            return seatSplit(t)
          case 'surrender':
          case 'stand':
          default:
            return seatStand(t)
        }
      })
    }, CONFIG.autoplay.playerActionDelayMs)
    timersRef.current.push(timer)
    return () => timersRef.current.forEach((id) => clearTimeout(id))
  }, [autoPlay, table, lastBet])

  // Settle bankrolls for all seats once per round
  useEffect(() => {
    if (table.status !== 'round_over') return
    if (settledRoundId === roundId) return
    // Compute deltas per seat
    const deltas = table.seats.map((seat) => {
      if (!seat || !seat.outcomes) return 0
      let d = 0
      seat.outcomes.forEach((o, i) => {
        const bet = seat.betsByHand[i] ?? lastBet
        switch (o) {
          case 'player_blackjack':
            d += bet * 1.5
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
    setBankrolls((arr) => arr.map((b, i) => b + (deltas[i] ?? 0)))
    // finalize history for this round
    setHistories((h) => {
      if (h.length === 0) return h
      const copy = h.slice()
      const last = copy[copy.length - 1]
      // Build outcomes by seat
      const outcomesBySeat: string[][] = table.seats.map((s) => (s.outcomes ? s.outcomes.map((x) => x) : []))
      copy[copy.length - 1] = {
        ...last,
        outcomesBySeat,
        bankrollAfter: bankrolls[0] + (deltas[0] ?? 0),
        shoeEnd: [...table.deck],
        actions: [...last.actions, { type: 'finalize', timestamp: Date.now() }],
      }
      return copy
    })
    setSettledRoundId(roundId)
  }, [table.status])

  // Auto-deal next hand when autoplay is enabled and round is over
  useEffect(() => {
    if (!autoPlay) return
    if (table.status !== 'round_over') return
    const t = window.setTimeout(() => deal(lastBet), CONFIG.autoplay.autoDealDelayMs)
    timersRef.current.push(t)
    return () => timersRef.current.forEach((id) => clearTimeout(id))
  }, [autoPlay, table.status, lastBet])

  // Persistence: numPlayers and bankrolls
  useEffect(() => {
    try { localStorage.setItem('bj_numPlayers', String(numPlayers)) } catch {}
  }, [numPlayers])
  useEffect(() => {
    try { localStorage.setItem('bj_bankrolls', JSON.stringify(bankrolls)) } catch {}
  }, [bankrolls])

  const available = useMemo(() => getSeatAvailableActions(table), [table])
  const dealerEval = useMemo(() => evaluateHand(table.dealerHand), [table.dealerHand])
  const suggested = useMemo(() => {
    if (table.status !== 'seat_turn' || table.activeSeatIndex !== 0) return null
    const seat = getActiveSeat(table)
    const idx = seat.activeHandIndex
    const hand = seat.hands[idx]
    const available = new Set(getSeatAvailableActions(table)) as Set<SuggestedAction | 'surrender'>
    const canSplit = available.has('split') && seat.hands.length === 1 && hand.length === 2 && hand[0].rank === hand[1].rank
    return suggestAction({ hand, dealerUp: table.dealerHand[0], available, canSplit })
  }, [table, lastBet])

  return {
    table,
    bankrolls,
    setBankrolls,
    betsBySeat,
    setBetsBySeat,
    numPlayers,
    setPlayers,
    roundId,
    deal,
    newShoe,
    hit,
    stand,
    double,
    split,
    available,
    dealerEval,
    deckCount,
    autoPlay,
    setAutoPlay,
    suggested,
    histories,
  }
}

// Small pure helper to decide when to reshuffle based on remaining cards
export function shouldReshuffle(deckCount: number, shoe: Card[] | undefined): boolean {
  const totalCards = deckCount * 52
  const cutoff = Math.floor(totalCards * CONFIG.shoe.reshuffleCutoffRatio)
  if (!shoe) return true
  return shoe.length <= cutoff
}

// Pure helpers for tests and UI logic
export function resizePreserveNumbers(prev: number[], newLen: number, fill: number): number[] {
  const target = Math.max(0, Math.floor(newLen))
  const out: number[] = []
  for (let i = 0; i < target; i += 1) {
    const v = prev[i]
    out.push(Number.isFinite(v) ? v : fill)
  }
  return out
}

export function canEditConfig(status: TableStatus): boolean {
  return status === 'idle' || status === 'round_over'
}


