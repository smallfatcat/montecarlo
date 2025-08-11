import { useEffect, useMemo, useRef, useState } from 'react'
import type { PokerTableState, BettingAction } from '../../poker/types'
import { evaluateSeven, formatEvaluated } from '../../poker/handEval'
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
  const [hideCpuHoleUntilShowdown, setHideCpuHoleUntilShowdown] = useState<boolean>(false)
  const [revealBusyUntilMs, setRevealBusyUntilMs] = useState<number>(0)
  const [clearing, setClearing] = useState<boolean>(false)
  // Hand history (structured) and flattened log lines
  type HistoryEvent =
    | { ts: number; type: 'hand_start'; handId: number; buttonIndex: number; smallBlind: number; bigBlind: number }
    | { ts: number; type: 'post_blind'; seat: number; amount: number }
    | { ts: number; type: 'deal_flop' | 'deal_turn' | 'deal_river'; cards: string[] }
    | { ts: number; type: 'action'; seat: number; action: BettingAction['type']; amount?: number | null; toCall: number; street: PokerTableState['street'] }
    | { ts: number; type: 'showdown'; winners: number[]; summary: string }
    | { ts: number; type: 'results'; perSeat: Array<{ seat: number; delta: number; stackAfter: number; committed: number; revealed?: string | null }> }
    | { ts: number; type: 'hand_end'; handId: number }
  interface HandHistory { handId: number; events: HistoryEvent[] }
  const [histories, setHistories] = useState<HandHistory[]>([])
  const [historyLines, setHistoryLines] = useState<string[]>([])
  const appendEvent = (handId: number, e: HistoryEvent) => {
    setHistories((prev) => {
      const idx = prev.findIndex((h) => h.handId === handId)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], events: [...copy[idx].events, e] }
        return copy
      }
      return [...prev, { handId, events: [e] }]
    })
    // Flat line
    const line = (() => {
      switch (e.type) {
        case 'hand_start': return `Hand #${e.handId} start (BTN ${e.buttonIndex}) blinds ${e.smallBlind}/${e.bigBlind}`
        case 'post_blind': return `Seat ${e.seat} posts blind ${e.amount}`
        case 'deal_flop': return `Flop: ${e.cards.join(' ')}`
        case 'deal_turn': return `Turn: ${e.cards.join(' ')}`
        case 'deal_river': return `River: ${e.cards.join(' ')}`
        case 'action': return `Seat ${e.seat} ${e.action}${e.amount != null ? ' ' + e.amount : ''} (toCall ${e.toCall})`
        case 'showdown': return `Showdown: ${e.summary}`
        case 'results': {
          const parts = e.perSeat
            .filter(x => x.delta !== 0)
            .map(x => `Seat ${x.seat} ${x.delta > 0 ? '+' : ''}${x.delta}${x.revealed ? ` (${x.revealed})` : ''}`)
          return parts.length ? `Result: ${parts.join(' • ')}` : `Result: no net changes`
        }
        case 'hand_end': return `Hand #${e.handId} end`
      }
    })()
    setHistoryLines((prev) => [...prev, line])
  }

  const beginHand = () => {
    setTable((t) => startHand(t))
    // reset revealed; scheduling is handled in effect when new hand starts
    setRevealed({ holeCounts: Array.from({ length: 9 }, () => 0), boardCount: 0 })
  }

  // Orchestrate a safe next deal after any visible flip animations have cleared
  const dealNext = () => {
    if (clearing) return
    // duration slightly longer than flip to avoid showing new faces
    const CLEAR_MS = Math.ceil(CONFIG.animation.cardFlipDurationSec * 1000) + 120
    setClearing(true)
    setRevealBusyUntilMs(Date.now() + CLEAR_MS)
    window.setTimeout(() => {
      setClearing(false)
      beginHand()
    }, CLEAR_MS)
  }

  // Human action helpers (seat 0 only)
  const act = (type: BettingAction['type'], amount?: number) => {
    setTable((t) => {
      if (t.currentToAct !== 0) return t
      appendEvent(t.handId, { ts: Date.now(), type: 'action', seat: 0, action: type, amount: amount ?? null, toCall: Math.max(0, t.betToCall - (t.seats[0]?.committedThisStreet||0)), street: t.street })
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
      setTable((t) => {
        const a = suggestActionPoker(t, 'tight')
        appendEvent(t.handId, { ts: Date.now(), type: 'action', seat: t.currentToAct ?? -1, action: a.type, amount: (a as any).amount ?? null, toCall: Math.max(0, t.betToCall - (t.seats[t.currentToAct ?? 0]?.committedThisStreet||0)), street: t.street })
        return applyAction(t, a)
      })
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
    const timer = window.setTimeout(() => dealNext(), delay)
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

  // Log hand start and blinds on entering preflop
  const lastLoggedHandRef = useRef<number>(0)
  const handStartStacksRef = useRef<{ handId: number; stacks: number[] } | null>(null)
  useEffect(() => {
    if (table.street !== 'preflop') return
    if (table.handId === lastLoggedHandRef.current) return
    lastLoggedHandRef.current = table.handId
    appendEvent(table.handId, { ts: Date.now(), type: 'hand_start', handId: table.handId, buttonIndex: table.buttonIndex, smallBlind: table.rules.smallBlind, bigBlind: table.rules.bigBlind })
    table.seats.forEach((s, i) => {
      if (s.committedThisStreet > 0) appendEvent(table.handId, { ts: Date.now(), type: 'post_blind', seat: i, amount: s.committedThisStreet })
    })
    // snapshot stacks at hand start (after blinds)
    handStartStacksRef.current = { handId: table.handId, stacks: table.seats.map(s => s.stack) }
  }, [table.handId, table.street])

  // Log board deals
  const lastBoardLenRef = useRef<number>(0)
  useEffect(() => {
    const n = table.community.length
    if (n === lastBoardLenRef.current) return
    if (n === 3) appendEvent(table.handId, { ts: Date.now(), type: 'deal_flop', cards: table.community.slice(0,3).map((c) => `${c.rank}${c.suit[0]}`) })
    if (n === 4) appendEvent(table.handId, { ts: Date.now(), type: 'deal_turn', cards: table.community.slice(3,4).map((c) => `${c.rank}${c.suit[0]}`) })
    if (n === 5) appendEvent(table.handId, { ts: Date.now(), type: 'deal_river', cards: table.community.slice(4,5).map((c) => `${c.rank}${c.suit[0]}`) })
    lastBoardLenRef.current = n
  }, [table.community])

  // Log showdown summary at hand end
  const handEndLoggedRef = useRef<number>(0)
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
  }, [table.status, table.community])

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
            // Always reveal player (seat 0) cards as dealt
            const isPlayer = idx === 0
            const nextCount = Math.min(2, (hc[idx] || 0) + 1)
            hc[idx] = isPlayer || !hideCpuHoleUntilShowdown ? nextCount : 0
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
    clearing,
    histories,
    historyLines,
    hideCpuHoleUntilShowdown,
    setHideCpuHoleUntilShowdown,
    numPlayers,
    setNumPlayers,
    startingStack,
    setStartingStack,
    beginHand,
    dealNext,
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


