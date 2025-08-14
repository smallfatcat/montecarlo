import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PokerTableState, BettingActionType } from '../../poker/types'
import { PokerInlineControls } from './PokerInlineControls'
import { Card3D } from '../components/Card3D'
import { PokerSeat } from './PokerSeat'
import { CONFIG } from '../../config'
import { ChipStack } from '../components/ChipStack'
import { ChipIcon, DEFAULT_DENOMS, type ChipDenomination } from '../components/ChipIcon'
import { computePots } from '../../poker/flow'

export interface PokerTableHorseshoeViewProps {
  table: PokerTableState
  revealed: { holeCounts: number[]; boardCount: number }
  hideHoleCardsUntilShowdown: boolean
  editLayoutMode?: boolean
  // seat control wiring
  onSitHere?: (seatIndex: number) => void
  onLeaveSeat?: (seatIndex: number) => void
  mySeatIndex?: number | null
  playerNames?: Array<string | null>
  // Derived display
  winnersSet?: Set<number>
  highlightSet?: Set<string>
  showdownText?: string
  // Equity (percentages)
  equity?: { winPct: number[]; tiePct: number[]; running: boolean } | null
  // Inline controls
  available?: BettingActionType[]
  onFold?: () => void
  onCheck?: () => void
  onCall?: () => void
  onBet?: (amount?: number) => void
  onRaise?: (amount?: number) => void
}

export interface PokerTableViewHandle {
  exportLayoutToJson: () => void
  resetLayout: () => void
}

type Rect = { left?: number; top?: number; width?: number; height?: number }
type LayoutOverrides = {
  seats: Record<number, Rect>
  board?: Rect
  pot?: Rect
  showdown?: Rect
  bets?: Record<number, Rect>
  stacks?: Record<number, Rect>
  controls?: Rect
  controlsChildren?: Record<string, Rect>
  controlsBox?: { width?: number; height?: number }
}

export const PokerTableHorseshoeView = forwardRef<PokerTableViewHandle, PokerTableHorseshoeViewProps>(function PokerTableHorseshoeView(props, ref) {
  const {
    table,
    revealed,
    hideHoleCardsUntilShowdown,
    editLayoutMode,
    onSitHere,
    onLeaveSeat,
    mySeatIndex,
    playerNames,
    winnersSet: winnersSetProp,
    highlightSet: highlightSetProp,
    showdownText: showdownTextProp,
    equity,
  } = props

  const containerRef = useRef<HTMLDivElement | null>(null)

  const GRID_SIZE = 10
  const MAJOR_GRID_SIZE = 50
  const [layoutOverrides, setLayoutOverrides] = useState<LayoutOverrides>({ seats: {} })
  const defaultFromFileRef = useRef<LayoutOverrides | null>(null)

  useEffect(() => {
    let applied = false
    fetch('./horseshoe-layout.json')
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        if (data && typeof data === 'object') {
          const seats = (data as any).seats ?? {}
          const next: LayoutOverrides = {
            seats: typeof seats === 'object' && seats ? seats : {},
            board: (data as any).board,
            pot: (data as any).pot,
            showdown: (data as any).showdown,
            bets: (data as any).bets ?? {},
            stacks: (data as any).stacks ?? {},
            controls: (data as any).controls,
            controlsChildren: (data as any).controlsChildren ?? {},
            controlsBox: (data as any).controlsBox ?? {},
          }
          defaultFromFileRef.current = next
          setLayoutOverrides(next)
          applied = true
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!applied) setLayoutOverrides({ seats: {} })
      })
  }, [])

  const width = CONFIG.poker.horseshoe.tableWidthPx
  const height = CONFIG.poker.horseshoe.tableHeightPx
  const centerX = width / 2
  const centerY = height / 2

  function getSeatPos(seatIndex: number): Rect | null { return layoutOverrides.seats?.[seatIndex] ?? null }
  function getBoardPos(): Rect | null { return layoutOverrides.board ?? null }
  function getPotPos(): Rect | null { return layoutOverrides.pot ?? null }
  function getShowdownPos(): Rect | null { return layoutOverrides.showdown ?? null }
  function getBetPos(seatIndex: number): Rect | null { return layoutOverrides.bets?.[seatIndex] ?? null }
  function getStackPos(seatIndex: number): Rect | null { return layoutOverrides.stacks?.[seatIndex] ?? null }
  function getControlsPos(): Rect | null { return layoutOverrides.controls ?? null }

  function makeDragMouseHandlers(kind: 'seat' | 'board' | 'pot' | 'showdown' | 'bet' | 'stack' | 'controls', index?: number) {
    if (!editLayoutMode) return {}
    return {
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation()
        const startClientX = e.clientX
        const startClientY = e.clientY
        const current: Rect = (() => {
          if (kind === 'seat') { const s = layoutOverrides.seats[index as number]; if (s) return s }
          else if (kind === 'bet') { const b = layoutOverrides.bets?.[index as number]; if (b) return b }
          else if (kind === 'stack') { const s = layoutOverrides.stacks?.[index as number]; if (s) return s }
          else { const v = (layoutOverrides as any)[kind]; if (v) return v }
          if (kind === 'controls') {
            const rect = containerRef.current?.getBoundingClientRect()
            const left = rect ? e.clientX - rect.left : 0
            const top = rect ? e.clientY - rect.top : 0
            return { left, top }
          }
          const rect = containerRef.current?.getBoundingClientRect()
          const left = rect ? e.clientX - rect.left : 0
          const top = rect ? e.clientY - rect.top : 0
          return { left, top }
        })()
        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startClientX
          const dy = ev.clientY - startClientY
          const snap = (v: number, g: number) => Math.round(v / g) * g
          const next: Rect = { left: snap((current.left ?? 0) + dx, GRID_SIZE), top: snap((current.top ?? 0) + dy, GRID_SIZE) }
          setLayoutOverrides((prev): LayoutOverrides => {
            if (kind === 'seat') { const i = index as number; return { ...prev, seats: { ...prev.seats, [i]: { ...prev.seats[i], ...next } } } }
            if (kind === 'bet') { const i = index as number; return { ...prev, bets: { ...(prev.bets ?? {}), [i]: { ...(prev.bets?.[i] ?? {}), ...next } } } }
            if (kind === 'stack') { const i = index as number; return { ...prev, stacks: { ...(prev.stacks ?? {}), [i]: { ...(prev.stacks?.[i] ?? {}), ...next } } } }
            if (kind === 'controls') { return { ...prev, controls: { ...((prev as any).controls ?? {}), ...next } } as LayoutOverrides }
            const prevRect: Rect = (prev as any)[kind] ?? {}
            return { ...prev, [kind]: { ...prevRect, ...next } } as LayoutOverrides
          })
        }
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      }
    }
  }

  function elementDomId(kind: 'seat' | 'board' | 'pot' | 'showdown' | 'bet' | 'stack' | 'controls', index?: number) {
    if (kind === 'seat') return `horseshoe-seat-wrapper-${index}`
    if (kind === 'bet') return `horseshoe-bet-${index}`
    if (kind === 'stack') return `horseshoe-stack-${index}`
    if (kind === 'board') return `horseshoe-board`
    if (kind === 'pot') return `horseshoe-pot`
    if (kind === 'showdown') return `horseshoe-showdown`
    if (kind === 'controls') return `horseshoe-controls`
    return ''
  }

  function makeResizeMouseHandlers(kind: 'seat' | 'board' | 'pot' | 'showdown' | 'bet' | 'stack' | 'controls', index?: number) {
    if (!editLayoutMode) return {}
    return {
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation()
        const startClientX = e.clientX
        const startClientY = e.clientY
        const keyIndex = index as number | undefined
        const getCurrentRect = (): Rect => {
          if (kind === 'seat' && keyIndex !== undefined) return layoutOverrides.seats[keyIndex] ?? {}
          if (kind === 'bet' && keyIndex !== undefined) return layoutOverrides.bets?.[keyIndex] ?? {}
          if (kind === 'controls') return (layoutOverrides as any)['controls'] ?? {}
          return (layoutOverrides as any)[kind] ?? {}
        }
        let initialWidth = getCurrentRect().width
        let initialHeight = getCurrentRect().height
        let initialCenterLeft = getCurrentRect().left
        let initialCenterTop = getCurrentRect().top
        if (initialWidth === undefined || initialHeight === undefined) {
          const el = document.getElementById(elementDomId(kind, keyIndex)) as HTMLElement | null
          if (el) {
            const rect = el.getBoundingClientRect()
            const cont = containerRef.current?.getBoundingClientRect() || null
            initialWidth = initialWidth ?? rect.width
            initialHeight = initialHeight ?? rect.height
            if (initialCenterLeft === undefined) initialCenterLeft = cont ? (rect.left - cont.left) + (rect.width / 2) : (rect.left + rect.width / 2)
            if (initialCenterTop === undefined) initialCenterTop = cont ? (rect.top - cont.top) + (rect.height / 2) : (rect.top + rect.height / 2)
          } else {
            initialWidth = initialWidth ?? 200
            initialHeight = initialHeight ?? 100
          }
        }
        const startW = initialWidth as number
        const startH = initialHeight as number
        const startCenterLeft = (initialCenterLeft ?? centerX) as number
        const startCenterTop = (initialCenterTop ?? centerY) as number
        const startTopLeftX = startCenterLeft - startW / 2
        const startTopLeftY = startCenterTop - startH / 2
        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startClientX
          const dy = ev.clientY - startClientY
          const snap = (v: number, g: number) => Math.round(v / g) * g
          const minW = 60
          const minH = 40
          const nextW = Math.max(minW, snap(startW + dx, GRID_SIZE))
          const nextH = Math.max(minH, snap(startH + dy, GRID_SIZE))
          const nextCenterLeft = startTopLeftX + nextW / 2
          const nextCenterTop = startTopLeftY + nextH / 2
          setLayoutOverrides((prev): LayoutOverrides => {
            if (kind === 'seat' && keyIndex !== undefined) {
              const prevRect = prev.seats[keyIndex] ?? {}
              return { ...prev, seats: { ...prev.seats, [keyIndex]: { ...prevRect, width: nextW, height: nextH, left: nextCenterLeft, top: nextCenterTop } } }
            }
            if (kind === 'bet' && keyIndex !== undefined) {
              const prevRect = prev.bets?.[keyIndex] ?? {}
              return { ...prev, bets: { ...(prev.bets ?? {}), [keyIndex]: { ...prevRect, width: nextW, height: nextH, left: nextCenterLeft, top: nextCenterTop } } }
            }
            if (kind === 'stack' && keyIndex !== undefined) {
              const prevRect = prev.stacks?.[keyIndex] ?? {}
              return { ...prev, stacks: { ...(prev.stacks ?? {}), [keyIndex]: { ...prevRect, width: nextW, height: nextH, left: nextCenterLeft, top: nextCenterTop } } }
            }
            if (kind === 'controls') {
              const prevRect: Rect = (prev as any)['controls'] ?? {}
              return { ...prev, controls: { ...prevRect, width: nextW, height: nextH, left: startTopLeftX, top: startTopLeftY } } as LayoutOverrides
            }
            const prevRect: Rect = (prev as any)[kind] ?? {}
            return { ...prev, [kind]: { ...prevRect, width: nextW, height: nextH, left: nextCenterLeft, top: nextCenterTop } } as LayoutOverrides
          })
        }
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      }
    }
  }

  // --- Animated chip moves orchestrator ---
  // We maintain a rendered view of each seat's committed chips so bets stay visible until end of street.
  const [chipMoves, setChipMoves] = useState<Array<{ key: string; from: { x: number; y: number }; to: { x: number; y: number }; amount: number }>>([])
  const prevCommittedRef = useRef<number[] | null>(null)
  const prevStacksRef = useRef<number[] | null>(null)
  const prevStatusRef = useRef<PokerTableState['status'] | null>(null)
  const prevStreetRef = useRef<PokerTableState['street'] | null>(null)
  const [renderCommitted, setRenderCommitted] = useState<number[]>(() => table.seats.map((s) => s.committedThisStreet))
  const [potHidden, setPotHidden] = useState<boolean>(false)
  const potTimerRef = useRef<number | null>(null)

  // Re-sync rendered commitments at the start of each hand and whenever seat count changes.
  // Keep prevCommittedRef in sync to avoid double-counting on the first delta detection.
  useEffect(() => {
    const curr = table.seats.map((s) => s.committedThisStreet)
    setRenderCommitted(curr)
    prevCommittedRef.current = curr
  }, [table.handId, table.seats.length])

  useEffect(() => {
    const currCommitted = table.seats.map((s) => s.committedThisStreet)
    const prevCommitted = prevCommittedRef.current ?? Array.from({ length: currCommitted.length }, () => 0)
    const potPos = getPotPos()
    const pendingMoves: Array<{ key: string; from: { x: number; y: number }; to: { x: number; y: number }; amount: number }> = []

    // Detect commit increases: visual move stack -> bet spot for the delta; keep existing bet visible
    for (let i = 0; i < currCommitted.length; i += 1) {
      const delta = (currCommitted[i] ?? 0) - (prevCommitted[i] ?? 0)
      if (delta > 0) {
        const stackPos = getStackPos(i)
        const betPos = getBetPos(i)
        const fromX = stackPos?.left ?? centerX
        const fromY = stackPos?.top ?? centerY
        const toX = betPos?.left ?? centerX
        const toY = betPos?.top ?? centerY
        pendingMoves.push({
          key: `stack2bet-${table.handId}-${table.street ?? 'pre'}-${i}-${Date.now()}`,
          from: { x: fromX, y: fromY },
          to: { x: toX, y: toY },
          amount: delta,
        })
        const durationMs = CONFIG.poker.animations?.chipFlyDurationMs ?? 250
        window.setTimeout(() => {
          setRenderCommitted((prev) => prev.map((v, idx) => (idx === i ? v + delta : v)))
        }, durationMs)
      }
    }

    // Detect end-of-street (street change) and move each seat's last bet to pot
    // More robust than sum check: trigger when street changed and a seat's committed reset to 0
    const prevStreet = prevStreetRef.current
    if (potPos && prevCommittedRef.current && prevStreet !== table.street) {
      for (let i = 0; i < prevCommitted.length; i += 1) {
        const was = prevCommitted[i] ?? 0
        const now = currCommitted[i] ?? 0
        if (was > 0 && now === 0) {
          const betPos = getBetPos(i)
          const fromX = betPos?.left ?? centerX
          const fromY = betPos?.top ?? centerY
          pendingMoves.push({
            key: `bet2pot-${table.handId}-${prevStreet ?? 'pre'}-${i}-${Date.now()}`,
            from: { x: fromX, y: fromY },
            to: { x: potPos.left ?? centerX, y: potPos.top ?? centerY },
            amount: was,
          })
          const durationMs = CONFIG.poker.animations?.chipFlyDurationMs ?? 250
          window.setTimeout(() => {
            setRenderCommitted((prev) => prev.map((v, idx) => (idx === i ? 0 : v)))
          }, durationMs)
        }
      }
      // Hide pot until chips arrive
      const durationMs = CONFIG.poker.animations?.chipFlyDurationMs ?? 250
      setPotHidden(true)
      if (potTimerRef.current != null) window.clearTimeout(potTimerRef.current)
      potTimerRef.current = window.setTimeout(() => {
        setPotHidden(false)
        potTimerRef.current = null
      }, durationMs) as unknown as number
    }

    // Detect payouts at hand end: ensure bets -> pot, then pot -> winners
    const prevStacks = prevStacksRef.current
    const prevStatus = prevStatusRef.current
    if (potPos && prevStacks && (table.status === 'hand_over') && prevStatus !== 'hand_over') {
      const durationMs = CONFIG.poker.animations?.chipFlyDurationMs ?? 250
      const stage1Moves: typeof pendingMoves = [] // bets -> pot
      const stage2Moves: typeof pendingMoves = [] // pot -> stacks

      // Stage 1: any outstanding bets (renderCommitted) move into pot
      for (let i = 0; i < renderCommitted.length; i += 1) {
        const outstanding = renderCommitted[i] ?? 0
        if (outstanding > 0) {
          const betPos = getBetPos(i)
          const fromX = betPos?.left ?? centerX
          const fromY = betPos?.top ?? centerY
          stage1Moves.push({
            key: `bet2pot-payout-${table.handId}-${i}-${Date.now()}`,
            from: { x: fromX, y: fromY },
            to: { x: potPos.left ?? centerX, y: potPos.top ?? centerY },
            amount: outstanding,
          })
        }
      }
      if (stage1Moves.length > 0) {
        // After arrival, clear rendered bets
        window.setTimeout(() => {
          setRenderCommitted((prev) => prev.map(() => 0))
        }, durationMs)
      }

      // Stage 2: pay winners from pot to stacks based on final stack deltas
      for (let i = 0; i < table.seats.length; i += 1) {
        const delta = (table.seats[i]?.stack ?? 0) - (prevStacks[i] ?? 0)
        if (delta > 0) {
          const stackPos = getStackPos(i)
          const toX = stackPos?.left ?? centerX
          const toY = stackPos?.top ?? centerY
          const jitterX = (i % 2 === 0 ? -1 : 1) * Math.min(12, 4 * (i % 3))
          const jitterY = (i % 2 === 1 ? -1 : 1) * Math.min(12, 3 * (i % 2))
          stage2Moves.push({
            key: `pot2stack-${table.handId}-${i}-${Date.now()}`,
            from: { x: (potPos.left ?? centerX) + jitterX, y: (potPos.top ?? centerY) + jitterY },
            to: { x: toX, y: toY },
            amount: delta,
          })
        }
      }

      // Sequence: if we have stage1, play it, then stage2; else play stage2 immediately
      if (stage1Moves.length > 0) {
        setChipMoves(stage1Moves)
        // Show pot during collection; hide pot only when paying out
        if (stage2Moves.length > 0) {
          if (potTimerRef.current != null) window.clearTimeout(potTimerRef.current)
          potTimerRef.current = window.setTimeout(() => {
            // Begin payout: briefly hide pot to avoid double visuals while chips depart
            setPotHidden(true)
            setChipMoves(stage2Moves)
            // Restore pot after payout flight
            const tid = window.setTimeout(() => {
              setChipMoves([])
              setPotHidden(false)
            }, durationMs)
            potTimerRef.current = tid as unknown as number
          }, durationMs) as unknown as number
        }
      } else if (stage2Moves.length > 0) {
        // No outstanding bets: pay directly from pot
        setPotHidden(true)
        setChipMoves(stage2Moves)
        if (potTimerRef.current != null) window.clearTimeout(potTimerRef.current)
        potTimerRef.current = window.setTimeout(() => {
          setChipMoves([])
          setPotHidden(false)
          potTimerRef.current = null
        }, durationMs) as unknown as number
      }
    }

    let cleanup: (() => void) | undefined
    if (pendingMoves.length > 0) {
      setChipMoves(pendingMoves)
      const durationMs = CONFIG.poker.animations?.chipFlyDurationMs ?? 250
      const t = window.setTimeout(() => setChipMoves([]), durationMs)
      cleanup = () => window.clearTimeout(t)
    }
    // IMPORTANT: update previous refs even when scheduling animations to avoid duplicate triggers
    prevCommittedRef.current = currCommitted
    prevStacksRef.current = table.seats.map((s) => s.stack)
    prevStatusRef.current = table.status
    prevStreetRef.current = table.street
    return cleanup
  }, [table.seats, table.handId, table.street, table.status])

  function exportLayoutToJson() {
    const container = containerRef.current
    const contRect = container?.getBoundingClientRect()
    const toCenterRect = (el: HTMLElement | null): Rect | null => {
      if (!el || !contRect) return null
      const r = el.getBoundingClientRect()
      return { left: (r.left - contRect.left) + r.width / 2, top: (r.top - contRect.top) + r.height / 2, width: r.width, height: r.height }
    }
    const toTopLeftRect = (el: HTMLElement | null): Rect | null => {
      if (!el || !contRect) return null
      const r = el.getBoundingClientRect()
      return { left: (r.left - contRect.left), top: (r.top - contRect.top), width: r.width, height: r.height }
    }
    const seats: Record<number, Rect> = {}
    const bets: Record<number, Rect> = {}
    const stacks: Record<number, Rect> = {}
    for (let i = 0; i < table.seats.length; i += 1) {
      const seatEl = document.getElementById(`horseshoe-seat-wrapper-${i}`) as HTMLElement | null
      const betEl = document.getElementById(`horseshoe-bet-${i}`) as HTMLElement | null
      const stackEl = document.getElementById(`horseshoe-stack-${i}`) as HTMLElement | null
      const seatR = toCenterRect(seatEl)
      const betR = toCenterRect(betEl)
      const stackR = toCenterRect(stackEl)
      if (seatR) seats[i] = seatR
      if (betR) bets[i] = betR
      if (stackR) stacks[i] = stackR
    }
    const board = toCenterRect(document.getElementById('horseshoe-board'))
    const pot = toCenterRect(document.getElementById('horseshoe-pot'))
    const showdown = toCenterRect(document.getElementById('horseshoe-showdown'))
    const controlsEl = document.getElementById('horseshoe-controls') as HTMLElement | null
    const controls = toTopLeftRect(controlsEl)

    // Collect child control offsets relative to the control box
    const controlsChildren: Record<string, Rect> = {}
    if (controlsEl) {
      const cRect = controlsEl.getBoundingClientRect()
      const centerFor = (id: string): Rect | null => {
        const el = document.getElementById(id) as HTMLElement | null
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { left: (r.left - cRect.left) + r.width / 2, top: (r.top - cRect.top) + r.height / 2, width: r.width, height: r.height }
      }
      const keys = ['control-check','control-call','control-fold','control-betBtn','control-raise','control-betLabel','control-betInput','control-potSlider','control-stackSlider','control-stackLabel']
      const mapKey = (domId: string) => domId.replace('control-','')
      for (const k of keys) {
        const v = centerFor(k)
        if (v) controlsChildren[mapKey(k)] = v
      }
    } else if (layoutOverrides.controlsChildren) {
      Object.assign(controlsChildren, layoutOverrides.controlsChildren)
    }

    const out: LayoutOverrides = { seats, bets, stacks, board: board ?? undefined, pot: pot ?? undefined, showdown: showdown ?? undefined, controls: controls ?? undefined, controlsChildren: Object.keys(controlsChildren).length ? controlsChildren : undefined as any, controlsBox: (layoutOverrides as any).controlsBox ?? {} }
    const data = JSON.stringify(out, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'horseshoe-layout.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function resetLayout() {
    if (defaultFromFileRef.current) setLayoutOverrides(defaultFromFileRef.current)
    else setLayoutOverrides({ seats: {} })
  }

  useImperativeHandle(ref, () => ({ exportLayoutToJson, resetLayout }), [layoutOverrides])

  const defaultWinnersSet = useMemo(() => new Set<number>(), [])
  const winnersSet = winnersSetProp ?? defaultWinnersSet
  const defaultHighlightSet = useMemo(() => new Set<string>(), [])
  const highlightSet = highlightSetProp ?? defaultHighlightSet
  const showdownText = showdownTextProp ?? ''

  const pots = useMemo(() => computePots(table), [table])
  const totalPot = useMemo(() => pots.reduce((sum, p) => sum + p.amount, 0), [pots])
  const mainPotAmount = useMemo(() => (pots[0]?.amount ?? 0), [pots])
  const hasOutstandingBets = useMemo(() => table.seats.some((s) => (s.committedThisStreet || 0) > 0), [table])
  const previousStreetPotSum = useMemo(() => table.seats.reduce((sum, s) => sum + Math.max(0, Math.floor((s.totalCommitted || 0) - (s.committedThisStreet || 0))), 0), [table])
  const displayMainPotAmount = useMemo(() => hasOutstandingBets ? previousStreetPotSum : mainPotAmount, [hasOutstandingBets, previousStreetPotSum, mainPotAmount])
  // Inline control model (player bet sizing via sliders)
  const CONTROLS_SCALE = 1.0

  // Local helper: split amount into denominations like ChipStack
  function splitIntoDenomsLocal(amount: number, denoms: ChipDenomination[] = DEFAULT_DENOMS): Array<{ denom: ChipDenomination; count: number }> {
    let remaining = Math.max(0, Math.floor(amount))
    const out: Array<{ denom: ChipDenomination; count: number }> = []
    for (const d of denoms) {
      const cnt = Math.floor(remaining / d)
      if (cnt > 0) out.push({ denom: d, count: cnt })
      remaining -= cnt * d
    }
    return out
  }

  return (
    <div id="poker-root" style={{ display: 'grid', gap: 12 }}>
      <div
        id="horseshoe-table"
        ref={containerRef}
        className="horseshoe-table"
        style={{ position: 'relative', width, height, margin: '0 auto', borderRadius: 24, background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}
      >
        {editLayoutMode && (
          <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px),
                linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)
              `, backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px, ${GRID_SIZE}px ${GRID_SIZE}px, ${MAJOR_GRID_SIZE}px ${MAJOR_GRID_SIZE}px, ${MAJOR_GRID_SIZE}px ${MAJOR_GRID_SIZE}px`, opacity: 0.6 }} />
        )}
        {/* Board */}
        {(() => { const p = getBoardPos(); if (!p) return null; return (
          <div id="horseshoe-board" style={{ position: 'absolute', left: p.left, top: p.top, transform: 'translate(-50%, -50%)', display: 'flex', gap: CONFIG.poker.horseshoe.boardGapPx, cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined, width: p.width, height: p.height }} {...makeDragMouseHandlers('board')}>
            {editLayoutMode && (
              <div aria-hidden style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }} {...makeResizeMouseHandlers('board')} />
            )}
            {table.community.slice(0, Math.min(table.community.length, revealed.boardCount)).map((c, i) => (
              <div key={i} style={{ transform: `scale(${CONFIG.poker.horseshoe.seatCardScale})`, transformOrigin: 'center' }}>
                <Card3D card={c as any} highlight={highlightSet.has(`B${i}`)} />
              </div>
            ))}
          </div>
        )})()}
        {/* Chip fly-in overlay (bets -> pot) */}
        <AnimatePresence>
          {chipMoves.map((mv) => {
            // Build realistic chip list by denomination
            const groups = splitIntoDenomsLocal(mv.amount)
            const chipList: Array<{ key: string; denom: ChipDenomination }> = []
            groups.forEach(g => { for (let i = 0; i < g.count; i += 1) chipList.push({ key: `${g.denom}-${i}`, denom: g.denom }) })
            const size = CONFIG.poker.chipIconSizePx
            const overlap = CONFIG.poker.chipOverlap
            const maxChipsPerRow = CONFIG.poker.maxChipsPerRow
            const step = Math.max(1, Math.floor(size * overlap))
            const rows: Array<typeof chipList> = []
            for (let i = 0; i < chipList.length; i += maxChipsPerRow) rows.push(chipList.slice(i, i + maxChipsPerRow))
            return (
              <motion.div
                key={mv.key}
                initial={{ left: mv.from.x, top: mv.from.y, opacity: 0.95, scale: 1 }}
                animate={{ left: mv.to.x, top: mv.to.y, opacity: 1, scale: 0.98 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'tween', duration: (CONFIG.poker.animations?.chipFlyDurationMs ?? 250) / 1000 }}
                style={{ position: 'absolute', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 5 }}
              >
                <div style={{ display: 'inline-block' }}>
                  {rows.map((row, r) => (
                    <div key={r} style={{ display: 'flex', marginTop: r === 0 ? 0 : -Math.floor(size * 0.35) }}>
                      {row.map((c, i) => (
                        <ChipIcon key={`${r}-${c.key}`} denom={c.denom} size={size} style={{ marginLeft: i === 0 ? 0 : -step }} />
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {/* Pot and Side Pots */}
        {(() => { const p = getPotPos(); if (!p) return null; return (
          <div id="horseshoe-pot" style={{ position: 'absolute', left: p.left, top: p.top, transform: 'translate(-50%, -50%)', fontWeight: 700, opacity: potHidden ? 0 : 0.9, transition: 'opacity 120ms linear', display: 'flex', alignItems: 'center', gap: 6, cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined, width: p.width, height: p.height }} {...makeDragMouseHandlers('pot')}>
            {editLayoutMode && (
              <div aria-hidden style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }} {...makeResizeMouseHandlers('pot')} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Pot:</span>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <ChipStack amount={displayMainPotAmount} />
                <span style={{ opacity: 0.9 }}>{displayMainPotAmount}</span>
              </div>
            </div>
            {(!hasOutstandingBets && pots.length > 1) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12, opacity: 0.95, fontWeight: 600 }}>
                {pots.slice(1).map((pot, idx) => (
                  <div key={`sidepot-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ opacity: 0.9 }}>Side {idx + 1}:</span>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <ChipStack amount={pot.amount} />
                      <span style={{ opacity: 0.9 }}>{pot.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(!hasOutstandingBets && pots.length > 1) && (
              <div style={{ marginLeft: 12, opacity: 0.8, fontSize: 12 }}>Total: {totalPot}</div>
            )}
          </div>
        )})()}
        {/* Showdown summary */}
        {(() => { const p = getShowdownPos(); if (!p) return null; return (
          <div id="horseshoe-showdown" style={{ position: 'absolute', left: p.left, top: p.top, transform: 'translate(-50%, -50%)', textAlign: 'center', maxWidth: width * 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined, width: p.width, height: p.height }} {...makeDragMouseHandlers('showdown')}>
            {showdownText}
            {editLayoutMode && (
              <div aria-hidden style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }} {...makeResizeMouseHandlers('showdown')} />
            )}
          </div>
        )})()}

        {/* Seats */}
        {table.seats.map((s, i) => {
          const pos = getSeatPos(i)
          const betPos = getBetPos(i)
          const stackPos = getStackPos(i)
          const contenders = table.seats.filter((x) => !x.hasFolded && x.hole.length === 2).length
          const visible = (table.status === 'hand_over' && table.community.length >= 5 && contenders > 1) ? (s.hole.length) : (revealed.holeCounts[i] ?? 0)
          const forceFaceDown = (table.status === 'in_hand') && (hideHoleCardsUntilShowdown) && (i !== (mySeatIndex ?? -1)) && (revealed.holeCounts[i] === 0)
            return [
            (
              <div id={`horseshoe-seat-wrapper-${i}`} key={`seat-${i}`} style={{ position: 'absolute', left: pos?.left ?? centerX, top: pos?.top ?? centerY, transform: 'translate(-50%, -50%)', width: (pos?.width ?? CONFIG.poker.horseshoe.seatWidthPx), height: pos?.height, cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined }} {...makeDragMouseHandlers('seat', i)}>
                <PokerSeat
                  idPrefix="horseshoe-seat"
                  seat={s}
                  seatIndex={i}
                  handId={table.handId}
                  buttonIndex={table.buttonIndex}
                  currentToAct={table.currentToAct}
                  highlightSet={highlightSet}
                  hideStackRow={true}
                  displayName={playerNames?.[i] || (s.isCPU ? `CPU ${i}` : `Player ${i}`)}
                  showPerSeatEquity={(!hideHoleCardsUntilShowdown) || (table.status === 'hand_over' && table.community.length >= 5) ? (!s.hasFolded && s.hole.length === 2) : (i === (mySeatIndex ?? -1))}
                  equityWinPct={equity ? equity.winPct[i] ?? null : null}
                  equityTiePct={equity ? equity.tiePct[i] ?? null : null}
                  equityRunning={!!equity?.running}
                  seatCardScale={CONFIG.poker.horseshoe.seatCardScale}
                  resultText={table.status === 'hand_over' ? ((winnersSet as Set<number>).has(i) ? 'Winner' : (s.hasFolded ? 'Folded' : 'Lost')) : ''}
                  visibleHoleCount={visible}
                  forceFaceDown={forceFaceDown}
                  canControlSeat={table.status !== 'in_hand'}
                  onSitHere={onSitHere}
                  onLeaveSeat={onLeaveSeat}
                  mySeatIndex={mySeatIndex}
                />
                {editLayoutMode && (
                  <div aria-hidden style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }} {...makeResizeMouseHandlers('seat', i)} />
                )}
              </div>
            ),
            (
              <div id={`horseshoe-bet-${i}`} key={`bet-${i}`} style={{ position: 'absolute', left: betPos?.left ?? centerX, top: betPos?.top ?? centerY, transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined, width: betPos?.width, height: betPos?.height }} {...makeDragMouseHandlers('bet', i)}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <ChipStack amount={renderCommitted[i] ?? 0} />
                  <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.9 }}>{renderCommitted[i] ?? 0}</span>
                </div>
                {editLayoutMode && (
                  <div aria-hidden style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }} {...makeResizeMouseHandlers('bet', i)} />
                )}
              </div>
            ),
            (
              <div id={`horseshoe-stack-${i}`} key={`stack-${i}`} style={{ position: 'absolute', left: stackPos?.left ?? centerX, top: stackPos?.top ?? centerY, transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined, width: stackPos?.width, height: stackPos?.height }} {...makeDragMouseHandlers('stack', i)}>
                <span>Stack:</span>
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginLeft: 6 }}>
                  <ChipStack amount={s.stack} />
                  <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.9 }}>{s.stack}</span>
                </div>
                {editLayoutMode && (
                  <div aria-hidden style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }} {...makeResizeMouseHandlers('stack', i)} />
                )}
              </div>
            )
          ]
        })}

        {/* Inline Controls (draggable) */}
        {(() => { const p = getControlsPos(); if (!p) return null; const myIdx = mySeatIndex ?? -1; const my = (myIdx >= 0) ? table.seats[myIdx] : null; const stackNow = my?.stack ?? 0; const potNow = table.pot.main; const avail = props.available ?? [];
          const disabled = table.status !== 'in_hand' || (mySeatIndex == null) || (table.currentToAct !== mySeatIndex)
          return (
            <div id="horseshoe-controls" style={{ position: 'absolute', left: (p.left ?? 0), top: (p.top ?? 0), width: p.width ?? 320, height: p.height ?? 220, zIndex: 1000, pointerEvents: 'auto', cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined }} {...makeDragMouseHandlers('controls')}>
              <PokerInlineControls
                available={avail}
                disabled={disabled}
                pot={potNow}
                stack={stackNow}
                toCall={Math.max(0, table.betToCall - (my?.committedThisStreet || 0))}
                minOpen={table.rules.bigBlind}
                onCheck={props.onCheck}
                onCall={props.onCall}
                onFold={props.onFold}
                onBet={props.onBet}
                onRaise={props.onRaise}
                scale={CONTROLS_SCALE}
                editLayout={!!editLayoutMode}
                layout={(layoutOverrides as any).controlsChildren || undefined}
                onLayoutChange={(next) => setLayoutOverrides((prev) => ({ ...prev, ...( { controlsChildren: next } as any) }))}
                boxWidth={(layoutOverrides as any).controlsBox?.width ?? (p.width ?? 320)}
                boxHeight={(layoutOverrides as any).controlsBox?.height ?? (p.height ?? 220)}
              />
              {editLayoutMode && (<div aria-hidden style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }} {...makeResizeMouseHandlers('controls')} />)}
            </div>
          )
        })()}
      </div>
    </div>
  )
})


