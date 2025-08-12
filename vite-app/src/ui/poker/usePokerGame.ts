import { useEffect, useMemo, useRef, useState } from 'react'
import type { PokerTableState, BettingAction } from '../../poker/types'
import type { Card } from '../../blackjack/types'
import { nextSeatIndex } from '../../poker/types'
import { evaluateSeven, formatEvaluated } from '../../poker/handEval'
import { createInitialPokerTable, applyAction, getAvailableActions } from '../../poker/flow'
import { CONFIG } from '../../config'
import { useTimerQueue } from './useTimerQueue'
import { usePokerOrchestrator } from './usePokerOrchestrator'
import { PokerRuntime } from '../../poker/runtime/PokerRuntime'
import type { HistoryEvent, HandHistory } from '../../poker/history'
import { buildTableFrom } from '../../poker/history'

export function usePokerGame() {
  const [numPlayers, setNumPlayers] = useState<number>(6)
  const [startingStack, setStartingStack] = useState<number>(200)
  const [table, setTable] = useState<PokerTableState>(() => {
    const cpuSeats = Array.from({ length: Math.max(0, 6 - 1) }, (_, i) => i + 1)
    return createInitialPokerTable(6, cpuSeats, startingStack)
  })
  const [autoPlay, setAutoPlay] = useState<boolean>(false)
  // Legacy timer refs removed after event queue refactor
  const [revealed, setRevealed] = useState<{ holeCounts: number[]; boardCount: number }>({ holeCounts: Array.from({ length: 9 }, () => 0), boardCount: 0 })
  const eventQueue = useTimerQueue()
  const [hideCpuHoleUntilShowdown, setHideCpuHoleUntilShowdown] = useState<boolean>(false)
  const orchestrator = usePokerOrchestrator({
    schedule: eventQueue.schedule,
    scheduleUnique: eventQueue.scheduleUnique,
    clearByTag: eventQueue.clearByTag,
  } as any, setRevealed)
  const [clearing, setClearing] = useState<boolean>(false)
  const runtimeRef = useRef<PokerRuntime | null>(null)
  // legacy refs (now unused with runtime)
  // Hand history (structured) and flattened log lines
  const [histories, setHistories] = useState<HandHistory[]>([])
  const [historyLines, setHistoryLines] = useState<string[]>([])
  const lastActionKeyRef = useRef<string>('')
  const appendEvent = (handId: number, e: HistoryEvent) => {
    // De-dupe repeated action logs (e.g., due to effects scheduling twice in dev)
    if ((e as any).type === 'action') {
      const a = e as Extract<HistoryEvent, { type: 'action' }>
      const key = `${handId}|${a.type}|${a.seat}|${a.action}|${a.amount ?? 'null'}|${a.toCall}|${a.street}`
      if (key === lastActionKeyRef.current) return
      lastActionKeyRef.current = key
    } else {
      // Reset on non-action to ensure future distinct actions log
      lastActionKeyRef.current = ''
    }
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
        case 'hand_setup': return `Setup: BTN ${e.buttonIndex} stacks [${e.seats.map((s)=>s.stack).join(', ')}] deck ${e.deckRemaining}/${e.deckTotal}`
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
    runtimeRef.current?.beginHand()
  }

  // Orchestrate a safe next deal after any visible flip animations have cleared
  const dealNext = () => {
    if (clearing) return
    // duration slightly longer than flip to avoid showing new faces
    const CLEAR_MS = Math.ceil(CONFIG.animation.cardFlipDurationSec * 1000) + 120
    setClearing(true)
    orchestrator.blockFor(CLEAR_MS)
    eventQueue.scheduleUnique(() => {
      setClearing(false)
      beginHand()
    }, CLEAR_MS, 'deal-next')
  }

  // Review mode (declared once)
  type ActionEvent = Extract<HistoryEvent, { type: 'action' }>
  type SetupEvent = Extract<HistoryEvent, { type: 'hand_setup' }>
  type ReviewState = { handId: number; setup: SetupEvent; actions: ActionEvent[]; step: number }
  const [review, setReview] = useState<ReviewState | null>(null)

  // Human action helpers (seat 0 only)
  const act = (type: BettingAction['type'], amount?: number) => {
    if (review) return
    runtimeRef.current?.act({ type, amount })
  }
  const fold = () => act('fold')
  const check = () => act('check')
  const call = () => act('call')
  const bet = (amount?: number) => act('bet', amount)
  const raise = (amount?: number) => act('raise', amount)

  // CPU autoplay for seats other than 0
  // Build a stable turn key for current CPU seat
  // legacy key (unused) — removed

  // Disable React-based CPU scheduling; runtime handles it

  // Player autoplay
  // legacy key (unused) — removed

  // Disable React-based player autoplay; runtime handles it via setAutoPlay

  // Auto-begin next hand when over
  // Disable React-based auto-deal; runtime handles it when autoplay is on

  // Disable React-based watchdog; runtime has an internal watchdog

  // Staged board reveal when community updates
  useEffect(() => {
    if (review) return
    orchestrator.scheduleBoardReveal(table, revealed.boardCount)
  }, [table.community, revealed.boardCount, review, orchestrator.scheduleBoardReveal])

  // Cleanup on unmount: clear all pending timers
  useEffect(() => {
    return () => {
      try { eventQueue.clearAll() } catch {}
    }
  }, [eventQueue.clearAll])

  // Hand start/blinds/setup now emitted by runtime; keep a snapshot of start stacks
  const handStartStacksRef = useRef<{ handId: number; stacks: number[] } | null>(null)
  useEffect(() => {
    if (table.street !== 'preflop') return
    handStartStacksRef.current = { handId: table.handId, stacks: table.seats.map(s => s.stack) }
  }, [table.handId, table.street])

  // Log board deals now emitted synchronously by runtime via onDeal

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
    orchestrator.scheduleHoleReveal(table, hideCpuHoleUntilShowdown)
  }, [table.handId, table.buttonIndex, table.seats.length, table.street, table.status, hideCpuHoleUntilShowdown, orchestrator.scheduleHoleReveal])

  const available = useMemo(() => getAvailableActions(table), [table])

  // Loader helpers
  const fromCode = (code: string): Card => ({ rank: code.slice(0, code.length - 1) as any, suit: ({ C: 'Clubs', D: 'Diamonds', H: 'Hearts', S: 'Spades' } as any)[code.slice(-1)] })

  // Initialize runtime once and bridge state changes to React
  useEffect(() => {
    if (runtimeRef.current) return
    const cpuSeats = Array.from({ length: Math.max(0, numPlayers - 1) }, (_, i) => i + 1)
    const rt = new PokerRuntime({ seats: numPlayers, cpuSeats, startingStack }, {
      onState: (s) => setTable(s),
      onAction: (handId, seat, action, toCall, street) => {
        appendEvent(handId, { ts: Date.now(), type: 'action', seat, action: action.type, amount: (action as any).amount ?? null, toCall, street })
      },
      onDeal: (handId, street, cardCodes) => {
        const type = street === 'flop' ? 'deal_flop' : street === 'turn' ? 'deal_turn' : 'deal_river'
        appendEvent(handId, { ts: Date.now(), type: type as any, cards: cardCodes as any })
      },
      onHandStart: (handId, buttonIndex, smallBlind, bigBlind) => {
        appendEvent(handId, { ts: Date.now(), type: 'hand_start', handId, buttonIndex, smallBlind, bigBlind } as any)
      },
      onPostBlind: (seat, amount) => {
        // Attach to current hand id; we can read from latest table state
        const hid = (runtimeRef.current as any)?.['state']?.handId ?? table.handId
        appendEvent(hid, { ts: Date.now(), type: 'post_blind', seat, amount } as any)
      },
      onHandSetup: (setup) => {
        appendEvent(setup.handId, { ts: Date.now(), type: 'hand_setup', ...setup } as any)
      },
    })
    runtimeRef.current = rt
    // start first hand is driven by UI control (Deal button)
    return () => { runtimeRef.current?.dispose(); runtimeRef.current = null }
  }, [])

  // Reflect autoplay toggle into runtime
  useEffect(() => {
    runtimeRef.current?.setAutoPlay(autoPlay)
  }, [autoPlay])

  function loadFromSetup(setup: Extract<HistoryEvent, { type: 'hand_setup' }>) {
    setAutoPlay(false)
    setTable(() => {
      const seatsLen = setup.seats.length
      const cpuSeats = Array.from({ length: Math.max(0, seatsLen - 1) }, (_, i) => i + 1)
      let s = createInitialPokerTable(seatsLen, cpuSeats, 0)
      s.handId = setup.handId
      s.buttonIndex = setup.buttonIndex
      s.rules.smallBlind = setup.rules.smallBlind
      s.rules.bigBlind = setup.rules.bigBlind
      s.deck = setup.deck.map(fromCode)
      s.community = []
      s.status = 'in_hand'
      s.street = 'preflop'
      s.seats = s.seats.map((seat, i) => {
        const snap = setup.seats[i]
        return {
          ...seat,
          stack: snap.stack,
          committedThisStreet: snap.committedThisStreet,
          totalCommitted: snap.totalCommitted,
          hasFolded: snap.stack <= 0 ? true : false,
          isAllIn: snap.isAllIn,
          hole: snap.hole.map(fromCode),
        }
      })
      s.pot.main = s.seats.reduce((sum, x) => sum + x.committedThisStreet, 0)
      s.betToCall = Math.max(0, ...s.seats.map((x) => x.committedThisStreet))
      const bbIndex = s.seats.reduce((best, x, i) => (x.committedThisStreet > (s.seats[best]?.committedThisStreet ?? -1) ? i : best), 0)
      s.currentToAct = nextSeatIndex(s.seats as any, bbIndex)
      s.lastAggressorIndex = bbIndex
      setRevealed({ holeCounts: Array.from({ length: Math.max(6, s.seats.length) }, () => 2), boardCount: 0 })
      return s
    })
  }

  function loadFromHistory(h: HandHistory) {
    const setup = h.events.find((e) => (e as any).type === 'hand_setup') as Extract<HistoryEvent, { type: 'hand_setup' }> | undefined
    if (!setup) return
    setAutoPlay(false)
    loadFromSetup(setup)
  }

  function stopReplay() {
    eventQueue.clearByTag('replay')
  }

  function replayHistory(h: HandHistory, stepMs = 600) {
    stopReplay()
    setAutoPlay(false)
    const setup = h.events.find((e) => (e as any).type === 'hand_setup') as Extract<HistoryEvent, { type: 'hand_setup' }> | undefined
    if (!setup) return
    // Load starting snapshot
    loadFromSetup(setup)
    // Sequence all recorded actions (in order)
    const actions = h.events.filter((e) => (e as any).type === 'action') as Array<Extract<HistoryEvent, { type: 'action' }>>
    actions.forEach((a, i) => {
      eventQueue.schedule(() => {
        setTable((t) => {
          const forced = { ...t, currentToAct: a.seat } as PokerTableState
          return applyAction(forced, { type: a.action, amount: (a.amount == null ? undefined : a.amount) })
        })
      }, i * stepMs, 'replay')
    })
  }

  // Review builders now imported from history.ts

  function startReviewFromHistory(h: HandHistory) {
    stopReplay()
    setAutoPlay(false)
    const setup = h.events.find((e) => (e as any).type === 'hand_setup') as SetupEvent | undefined
    if (!setup) return
    const actions = h.events.filter((e) => (e as any).type === 'action') as ActionEvent[]
    // Build table from setup only (no actions applied) and display player hole only
    const initial = buildTableFrom(setup, [], 0)
    setReview({ handId: h.handId, setup, actions, step: 0 })
    setRevealed({
      holeCounts: Array.from({ length: Math.max(6, initial.seats.length) }, (_, i) => (i === 0 ? 2 : 0)),
      boardCount: 0,
    })
    setTable(initial)
  }

  function reviewToStep(step: number) {
    if (!review) return
    const clamped = Math.max(0, Math.min(step, review.actions.length))
    const nextState = buildTableFrom(review.setup, review.actions, clamped)
    setReview({ ...review, step: clamped })
    // Reveal only player hole until showdown
    const contenders = nextState.seats.filter((s) => !s.hasFolded && s.hole.length === 2).length
    const showAll = nextState.street === 'showdown' && nextState.community.length >= 5 && contenders > 1
    setRevealed({
      holeCounts: Array.from({ length: Math.max(6, nextState.seats.length) }, (_, i) => (i === 0 || showAll ? 2 : 0)),
      boardCount: nextState.community.length,
    })
    setTable(nextState)
  }

  function reviewNextStep() { if (review) reviewToStep(review.step + 1) }
  function reviewPrevStep() { if (review) reviewToStep(review.step - 1) }
  function endReview() { setReview(null) }

  return {
    table,
    revealed,
    clearing,
    histories,
    historyLines,
    review,
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
    loadFromSetup,
    loadFromHistory,
    replayHistory,
    stopReplay,
    startReviewFromHistory,
    reviewToStep,
    reviewNextStep,
    reviewPrevStep,
    endReview,
  }
}


