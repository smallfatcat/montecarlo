import { useCallback, useMemo, useRef, useState } from 'react'
import type { PokerTableState } from '../../poker/types'
import { CONFIG } from '../../config'

type SetRevealed = React.Dispatch<React.SetStateAction<{ holeCounts: number[]; boardCount: number }>>

export function usePokerOrchestrator(
  eventQueue: { schedule: (fn: () => void, delayMs: number, tag?: string) => number; scheduleUnique: (fn: () => void, delayMs: number, tag: string) => number; clearByTag: (tag: string) => void },
  setRevealed: SetRevealed,
) {
  const [busyUntilMs, setBusyUntilMs] = useState<number>(0)
  const lastScheduledBoardCountRef = useRef<number>(0)
  const lastHoleRevealHandIdRef = useRef<number>(0)

  const blockFor = useCallback((ms: number) => {
    setBusyUntilMs(Date.now() + Math.max(0, Math.floor(ms)))
  }, [])

  const scheduleHoleReveal = useCallback((table: PokerTableState, hideCpuHoleUntilShowdown: boolean) => {
    if (table.status !== 'in_hand' || table.street !== 'preflop') return
    // Idempotent: only schedule once per handId
    if (lastHoleRevealHandIdRef.current === table.handId) return
    lastHoleRevealHandIdRef.current = table.handId
    // initialize reveal counts for current seats length — player (seat 0) always visible
    const seatsLen = table.seats.length
    const initialHole = Array.from({ length: Math.max(6, seatsLen) }, (_, i) => {
      if (i === 0) return 2
      if (!hideCpuHoleUntilShowdown) return 2
      return 0
    })
    setRevealed({ holeCounts: initialHole, boardCount: 0 })
    lastScheduledBoardCountRef.current = 0
    // Clear any pending hole-reveal events
    eventQueue.clearByTag('hole-reveal')
    const perCard = CONFIG.poker.deal.perHoleCardMs
    // If CPU hole cards are not hidden, we already revealed them; skip scheduling
    if (!hideCpuHoleUntilShowdown) {
      setBusyUntilMs(Date.now() + 50)
      return () => eventQueue.clearByTag('hole-reveal')
    }
    for (let r = 0; r < 2; r += 1) {
      for (let i = 0; i < seatsLen; i += 1) {
        const idx = ((table.buttonIndex + 1) + i) % seatsLen
        if (idx === 0) continue // already fully revealed for player seat
        const delay = (r * seatsLen + i) * perCard
        // Use non-unique scheduling so both hole cards reveal in sequence
        eventQueue.schedule(() => {
          setRevealed((prev) => {
            const hc = [...prev.holeCounts]
            const isPlayer = idx === 0
            const nextCount = Math.min(2, (hc[idx] || 0) + 1)
            hc[idx] = isPlayer || !hideCpuHoleUntilShowdown ? nextCount : 0
            return { ...prev, holeCounts: hc }
          })
        }, delay, 'hole-reveal')
      }
    }
    const lastDelay = (2 * seatsLen - 1) * perCard
    setBusyUntilMs(Date.now() + lastDelay + 50)
    return () => eventQueue.clearByTag('hole-reveal')
  }, [eventQueue, setRevealed])

  const scheduleBoardReveal = useCallback((table: PokerTableState, currentBoardCount: number) => {
    // Staged board reveal when community updates (flop/turn/river)
    const targetCount = table.community.length
    const startIndex = Math.max(currentBoardCount, lastScheduledBoardCountRef.current)
    if (targetCount <= startIndex) return
    const pause = CONFIG.poker.deal.streetPauseMs + (CONFIG.poker.animations?.chipFlyDurationMs ?? 0)
    const per = CONFIG.poker.deal.perBoardCardMs
    for (let i = startIndex; i < targetCount; i += 1) {
      const delay = pause + (i - startIndex) * per
      // Use non-unique scheduling so each board card reveals in order
      eventQueue.schedule(() => {
        setRevealed((prev) => ({ ...prev, boardCount: i + 1 }))
      }, delay, 'board-reveal')
    }
    lastScheduledBoardCountRef.current = targetCount
    const extra = targetCount - currentBoardCount
    const lastDelay = extra > 0 ? pause + (extra - 1) * per : 0
    setBusyUntilMs(Date.now() + lastDelay + 50)
  }, [eventQueue, setRevealed])

  const clearByTag = useCallback((tag: string) => eventQueue.clearByTag(tag), [eventQueue])

  const api = useMemo(() => ({ busyUntilMs, blockFor, scheduleHoleReveal, scheduleBoardReveal, clearByTag }), [busyUntilMs, blockFor, scheduleHoleReveal, scheduleBoardReveal, clearByTag])
  return api
}


