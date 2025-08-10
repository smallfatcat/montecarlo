import { useEffect, useMemo, useRef, useState } from 'react'
import type { PokerTableState, BettingAction } from '../../poker/types'
import { createInitialPokerTable, startHand, applyAction, getAvailableActions } from '../../poker/flow'
import { suggestActionPoker } from '../../poker/strategy'
import { CONFIG } from '../../config'

export function usePokerGame() {
  const [numPlayers, setNumPlayers] = useState<number>(6)
  const [startingStack, setStartingStack] = useState<number>(200)
  const [table, setTable] = useState<PokerTableState>(() => {
    const cpuSeats = Array.from({ length: Math.max(0, 6 - 1) }, (_, i) => i + 1)
    return createInitialPokerTable(6, cpuSeats, startingStack)
  })
  const [autoPlay, setAutoPlay] = useState<boolean>(false)
  // Separate timers to avoid cross-clearing between gameplay and reveal animations
  const actionTimersRef = useRef<number[]>([])
  const revealTimersRef = useRef<number[]>([])
  const [revealed, setRevealed] = useState<{ holeCounts: number[]; boardCount: number }>({ holeCounts: Array.from({ length: 9 }, () => 0), boardCount: 0 })
  const [revealBusyUntilMs, setRevealBusyUntilMs] = useState<number>(0)

  const beginHand = () => {
    setTable((t) => startHand(t))
    // reset revealed; scheduling is handled in effect when new hand starts
    setRevealed({ holeCounts: Array.from({ length: 9 }, () => 0), boardCount: 0 })
  }

  // Human action helpers (seat 0 only)
  const act = (type: BettingAction['type'], amount?: number) => {
    setTable((t) => {
      if (t.currentToAct !== 0) return t
      return applyAction(t, { type, amount })
    })
  }
  const fold = () => act('fold')
  const check = () => act('check')
  const call = () => act('call')
  const bet = (amount?: number) => act('bet', amount)
  const raise = (amount?: number) => act('raise', amount)

  // CPU autoplay for seats other than 0
  useEffect(() => {
    if (table.status !== 'in_hand') return
    const idx = table.currentToAct
    if (idx == null) return
    if (idx === 0) return
    const base = CONFIG.pokerAutoplay.cpuActionDelayMs
    const now = Date.now()
    const guard = Math.max(0, revealBusyUntilMs - now)
    const delay = base + guard
    const timer = window.setTimeout(() => {
      setTable((t) => applyAction(t, suggestActionPoker(t, 'tight')))
    }, delay)
    actionTimersRef.current.push(timer)
    return () => actionTimersRef.current.forEach((id) => clearTimeout(id))
  }, [table, revealBusyUntilMs])

  // Player autoplay
  useEffect(() => {
    if (!autoPlay) return
    if (table.status !== 'in_hand') return
    if (table.currentToAct !== 0) return
    const base = CONFIG.pokerAutoplay.playerActionDelayMs
    const now = Date.now()
    const guard = Math.max(0, revealBusyUntilMs - now)
    const delay = base + guard
    const timer = window.setTimeout(() => {
      setTable((t) => applyAction(t, suggestActionPoker(t, 'tight')))
    }, delay)
    actionTimersRef.current.push(timer)
    return () => actionTimersRef.current.forEach((id) => clearTimeout(id))
  }, [autoPlay, table, revealBusyUntilMs])

  // Auto-begin next hand when over
  useEffect(() => {
    if (!autoPlay) return
    if (table.status !== 'hand_over') return
    if (table.gameOver) return
    const base = CONFIG.pokerAutoplay.autoDealDelayMs
    const now = Date.now()
    const guard = Math.max(0, revealBusyUntilMs - now)
    const delay = base + guard
    const timer = window.setTimeout(() => setTable((t) => startHand(t)), delay)
    actionTimersRef.current.push(timer)
    return () => actionTimersRef.current.forEach((id) => clearTimeout(id))
  }, [autoPlay, table.status, revealBusyUntilMs])

  // Staged board reveal when community updates (flop/turn/river)
  useEffect(() => {
    const targetCount = table.community.length
    if (targetCount <= revealed.boardCount) return
    // Clear only reveal timers (do not touch gameplay timers)
    revealTimersRef.current.forEach((id) => clearTimeout(id))
    revealTimersRef.current = []
    const pause = CONFIG.poker.deal.streetPauseMs
    const per = CONFIG.poker.deal.perBoardCardMs
    for (let i = revealed.boardCount; i < targetCount; i += 1) {
      const delay = pause + (i - revealed.boardCount) * per
      const tid = window.setTimeout(() => {
        setRevealed((prev) => ({ ...prev, boardCount: i + 1 }))
      }, delay)
      revealTimersRef.current.push(tid)
    }
    // mark busy until completion of last scheduled reveal
    const extra = targetCount - revealed.boardCount
    const lastDelay = extra > 0 ? pause + (extra - 1) * per : 0
    setRevealBusyUntilMs(Date.now() + lastDelay + 50)
    return () => revealTimersRef.current.forEach((id) => clearTimeout(id))
  }, [table.community, table.street])

  // Staged hole reveal whenever a new hand begins
  useEffect(() => {
    if (table.status !== 'in_hand') return
    if (table.street !== 'preflop') return
    // initialize reveal counts for current seats length
    setRevealed({ holeCounts: Array.from({ length: Math.max(6, table.seats.length) }, () => 0), boardCount: 0 })
    // Clear any pending reveal timers
    revealTimersRef.current.forEach((id) => clearTimeout(id))
    revealTimersRef.current = []
    const seatsLen = table.seats.length
    const perCard = CONFIG.poker.deal.perHoleCardMs
    for (let r = 0; r < 2; r += 1) {
      for (let i = 0; i < seatsLen; i += 1) {
        const idx = ((table.buttonIndex + 1) + i) % seatsLen
        const delay = (r * seatsLen + i) * perCard
        const timer = window.setTimeout(() => {
          setRevealed((prev) => {
            const hc = [...prev.holeCounts]
            hc[idx] = Math.min(2, (hc[idx] || 0) + 1)
            return { ...prev, holeCounts: hc }
          })
        }, delay)
        revealTimersRef.current.push(timer)
      }
    }
    // busy until last hole card reveal completes
    const lastDelay = (2 * seatsLen - 1) * perCard
    setRevealBusyUntilMs(Date.now() + lastDelay + 50)
    return () => revealTimersRef.current.forEach((id) => clearTimeout(id))
  }, [table.handId])

  const available = useMemo(() => getAvailableActions(table), [table])

  return {
    table,
    revealed,
    numPlayers,
    setNumPlayers,
    startingStack,
    setStartingStack,
    beginHand,
    autoPlay,
    setAutoPlay,
    available,
    fold,
    check,
    call,
    bet,
    raise,
  }
}


