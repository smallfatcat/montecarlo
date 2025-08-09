import { useEffect, useMemo, useRef, useState } from 'react'
import type { Card } from '../blackjack'
import { createShoe, shuffleInPlace } from '../blackjack/deck'
import { evaluateHand } from '../blackjack/hand'
import type { TableState } from '../blackjack/table'
import { createInitialTable, startTableRound, seatHit, seatStand, seatDouble, seatSplit, getSeatAvailableActions, getActiveSeat } from '../blackjack/table'
import type { GameState } from '../blackjack/game'
import { suggestAction } from '../blackjack/strategy'

export function useTableGame() {
  const [deckCount, setDeckCount] = useState(6)
  const [shoe, setShoe] = useState<Card[] | undefined>(undefined)
  const [bankroll, setBankroll] = useState(100)
  const [table, setTable] = useState<TableState>(() => createInitialTable(3, [1, 2]))
  const [autoPlay, setAutoPlay] = useState(false)
  const [lastBet, setLastBet] = useState(10)
  const [roundId, setRoundId] = useState(0)
  const [settledRoundId, setSettledRoundId] = useState(-1)
  const timersRef = useRef<number[]>([])

  // initialize shoe and table
  useEffect(() => {
    const initial = shuffleInPlace(createShoe(deckCount))
    setShoe(initial)
    setTable((t) => ({ ...createInitialTable(3, [1, 2], initial) }))
  }, [])

  const deal = (bet: number) => {
    // auto-reshuffle when shoe is low (<= 20% remaining)
    const cutoff = Math.floor(deckCount * 52 * 0.2)
    const needNewShoe = !shoe || shoe.length <= cutoff
    const deckToUse = needNewShoe ? shuffleInPlace(createShoe(deckCount)) : shoe!
    const next = startTableRound({ ...table, deck: deckToUse }, bet)
    setShoe(next.deck)
    setTable(next)
    setLastBet(bet)
    setRoundId((r) => r + 1)
  }

  const newShoe = (decks: number) => {
    const normalized = Math.max(1, Math.floor(decks || 6))
    setDeckCount(normalized)
    const nextShoe = shuffleInPlace(createShoe(normalized))
    setShoe(nextShoe)
    setTable((t) => ({ ...t, deck: nextShoe }))
  }

  // Human actions map to active seat only when seat 0 (player) is active
  const hit = () => setTable((t) => seatHit(t))
  const stand = () => setTable((t) => seatStand(t))
  const double = () => setTable((t) => seatDouble(t))
  const split = () => setTable((t) => seatSplit(t))

  // CPU autoplay for seats 1 and 2
  useEffect(() => {
    if (table.status !== 'seat_turn') return
    const seatIdx = table.activeSeatIndex
    if (seatIdx === 0) return
    const seat = getActiveSeat(table)
    const idx = seat.activeHandIndex
    const hand = seat.hands[idx]
    const dummy: GameState = {
      deck: table.deck,
      playerHand: hand,
      dealerHand: table.dealerHand,
      status: 'player_turn',
      bankroll: 0,
      currentBet: 0,
      // allow split suggestion only if not previously split
      playerHands: seat.hands.length > 1 ? seat.hands : undefined,
      activeHandIndex: seat.activeHandIndex,
    } as any
    const action = suggestAction(dummy) || 'stand'
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
    }, 350)
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
    const dummy: GameState = {
      deck: table.deck,
      playerHand: hand,
      dealerHand: table.dealerHand,
      status: 'player_turn',
      bankroll: bankroll,
      currentBet: lastBet,
      playerHands: seat.hands.length > 1 ? seat.hands : undefined,
      activeHandIndex: seat.activeHandIndex,
    } as any
    const action = suggestAction(dummy) || 'stand'
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
    }, 450)
    timersRef.current.push(timer)
    return () => timersRef.current.forEach((id) => clearTimeout(id))
  }, [autoPlay, table, bankroll, lastBet])

  // Settle bankroll for player (seat 0) once per round
  useEffect(() => {
    if (table.status !== 'round_over') return
    if (settledRoundId === roundId) return
    const seat0 = table.seats[0]
    if (!seat0 || !seat0.outcomes) return
    let delta = 0
    seat0.outcomes.forEach((o, i) => {
      const bet = seat0.betsByHand[i] ?? lastBet
      switch (o) {
        case 'player_blackjack':
          delta += bet * 1.5
          break
        case 'player_win':
        case 'dealer_bust':
          delta += bet
          break
        case 'push':
          break
        case 'player_bust':
        case 'dealer_win':
          delta -= bet
          break
        default:
          break
      }
    })
    if (delta !== 0) setBankroll((b) => b + delta)
    setSettledRoundId(roundId)
  }, [table.status])

  // Auto-deal next hand when autoplay is enabled and round is over
  useEffect(() => {
    if (!autoPlay) return
    if (table.status !== 'round_over') return
    const t = window.setTimeout(() => deal(lastBet), 900)
    timersRef.current.push(t)
    return () => timersRef.current.forEach((id) => clearTimeout(id))
  }, [autoPlay, table.status, lastBet])

  const available = useMemo(() => getSeatAvailableActions(table), [table])
  const dealerEval = useMemo(() => evaluateHand(table.dealerHand), [table.dealerHand])
  const suggested = useMemo(() => {
    if (table.status !== 'seat_turn' || table.activeSeatIndex !== 0) return null
    const seat = getActiveSeat(table)
    const idx = seat.activeHandIndex
    const hand = seat.hands[idx]
    const dummy: GameState = {
      deck: table.deck,
      playerHand: hand,
      dealerHand: table.dealerHand,
      status: 'player_turn',
      bankroll: bankroll,
      currentBet: lastBet,
      playerHands: seat.hands.length > 1 ? seat.hands : undefined,
      activeHandIndex: seat.activeHandIndex,
    } as any
    return suggestAction(dummy)
  }, [table, bankroll, lastBet])

  return {
    table,
    bankroll,
    setBankroll,
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
  }
}


