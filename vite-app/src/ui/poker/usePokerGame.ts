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
  const timersRef = useRef<number[]>([])

  const beginHand = () => {
    setTable((t) => startHand(t))
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
    const delay = CONFIG.pokerAutoplay.cpuActionDelayMs
    const timer = window.setTimeout(() => {
      setTable((t) => applyAction(t, suggestActionPoker(t, 'tight')))
    }, delay)
    timersRef.current.push(timer)
    return () => timersRef.current.forEach((id) => clearTimeout(id))
  }, [table])

  // Player autoplay
  useEffect(() => {
    if (!autoPlay) return
    if (table.status !== 'in_hand') return
    if (table.currentToAct !== 0) return
    const delay = CONFIG.pokerAutoplay.playerActionDelayMs
    const timer = window.setTimeout(() => {
      setTable((t) => applyAction(t, suggestActionPoker(t, 'tight')))
    }, delay)
    timersRef.current.push(timer)
    return () => timersRef.current.forEach((id) => clearTimeout(id))
  }, [autoPlay, table])

  // Auto-begin next hand when over
  useEffect(() => {
    if (!autoPlay) return
    if (table.status !== 'hand_over') return
    if (table.gameOver) return
    const timer = window.setTimeout(() => setTable((t) => startHand(t)), CONFIG.pokerAutoplay.autoDealDelayMs)
    timersRef.current.push(timer)
    return () => timersRef.current.forEach((id) => clearTimeout(id))
  }, [autoPlay, table.status])

  const available = useMemo(() => getAvailableActions(table), [table])

  return {
    table,
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


