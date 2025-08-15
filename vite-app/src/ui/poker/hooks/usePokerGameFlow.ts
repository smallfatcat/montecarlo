import { useEffect, useRef } from 'react'
import type { PokerTableState } from '../../../poker/types'
import { evaluateSeven, formatEvaluated } from '../../../poker/handEval'
import { CONFIG } from '../../../config'
import type { RuntimeLike } from './usePokerRuntime'

export function usePokerGameFlow(
  table: PokerTableState,
  revealed: { holeCounts: number[]; boardCount: number },
  review: any,
  orchestrator: any,
  eventQueue: any,
  runtimeRef: React.MutableRefObject<RuntimeLike | null>,
  appendEvent: (handId: number, e: any) => void,
) {
  // Hand start/blinds/setup now emitted by runtime; keep a snapshot of start stacks
  const handStartStacksRef = useRef<{ handId: number; stacks: number[] } | null>(null)
  
  // Log showdown summary at hand end
  const handEndLoggedRef = useRef<number>(0)

  const beginHand = () => {
    runtimeRef.current?.beginHand()
  }

  // Orchestrate a safe next deal after any visible flip animations have cleared
  const dealNext = () => {
    // duration slightly longer than flip to avoid showing new faces
    const CLEAR_MS = Math.ceil(CONFIG.animation.cardFlipDurationSec * 1000) + 120
    orchestrator.blockFor(CLEAR_MS)
    eventQueue.scheduleUnique(() => {
      beginHand()
    }, CLEAR_MS, 'deal-next')
  }

  // Staged board reveal when community updates
  useEffect(() => {
    if (review) return
    orchestrator.scheduleBoardReveal(table, revealed.boardCount)
  }, [table.community, revealed.boardCount, review, orchestrator.scheduleBoardReveal])

  // Staged hole reveal whenever a new hand begins
  useEffect(() => {
    orchestrator.scheduleHoleReveal(table, false, null) // hideHoleCardsUntilShowdown and mySeatIndex will be passed from parent
  }, [table.handId, table.buttonIndex, table.seats.length, table.street, table.status, orchestrator.scheduleHoleReveal])

  // Hand start/blinds/setup now emitted by runtime; keep a snapshot of start stacks
  useEffect(() => {
    if (table.street !== 'preflop') return
    handStartStacksRef.current = { handId: table.handId, stacks: table.seats.map(s => s.stack) }
  }, [table.handId, table.street])

  // Log showdown summary at hand end
  useEffect(() => {
    if (table.status !== 'hand_over') return
    if (handEndLoggedRef.current === table.handId) return
    handEndLoggedRef.current = table.handId

    const community = table.community
    const pot = table.seats.reduce((sum, s) => sum + s.totalCommitted, 0)

    // Build summary depending on whether there was a showdown (5 board cards) or a fold-out
    let summary = ''
    if (community.length >= 5) {
      const ranked: { seat: number; text: string }[] = []
      table.seats.forEach((s, i) => {
        if (s.hasFolded || s.hole.length !== 2) return
        const ev = evaluateSeven([...s.hole, ...community] as any)
        ranked.push({ seat: i, text: formatEvaluated(ev as any) })
      })
      summary = `Pot ${pot} • ` + ranked.map((r) => `Seat ${r.seat}: ${r.text}`).join(' • ')
    } else {
      summary = `Pot ${pot} • No showdown`
    }
    appendEvent(table.handId, { ts: Date.now(), type: 'showdown', winners: [], summary })

    // Compute exact results per seat (net stack change) and include revealed cards (if any)
    const start = handStartStacksRef.current && handStartStacksRef.current.handId === table.handId ? handStartStacksRef.current.stacks : null
    if (start) {
      const perSeat = table.seats.map((s, i) => ({
        seat: i,
        delta: s.stack - start[i],
        stackAfter: s.stack,
        committed: s.totalCommitted,
        revealed: (!s.hasFolded && s.hole.length === 2) ? `${s.hole[0].rank}${s.hole[0].suit[0]} ${s.hole[1].rank}${s.hole[1].suit[0]}` : null,
      }))
      appendEvent(table.handId, { ts: Date.now(), type: 'results', perSeat })
    }

    appendEvent(table.handId, { ts: Date.now(), type: 'hand_end', handId: table.handId })
  }, [table.status, table.community, table.handId, table.seats, appendEvent])

  return {
    beginHand,
    dealNext,
    handStartStacksRef,
    handEndLoggedRef,
  }
}
