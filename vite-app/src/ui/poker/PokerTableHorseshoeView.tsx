import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import type { PokerTableState } from '../../poker/types'
import { Card3D } from '../components/Card3D'
import { PokerSeat } from './PokerSeat'
import { CONFIG } from '../../config'
import { ChipStack } from '../components/ChipStack'
import { computePots } from '../../poker/flow'

export interface PokerTableHorseshoeViewProps {
  table: PokerTableState
  revealed: { holeCounts: number[]; boardCount: number }
  hideCpuHoleUntilShowdown: boolean
  editLayoutMode?: boolean
  // Derived display
  winnersSet?: Set<number>
  highlightSet?: Set<string>
  showdownText?: string
  // Equity (percentages)
  equity?: { winPct: number[]; tiePct: number[]; running: boolean } | null
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
}

export const PokerTableHorseshoeView = forwardRef<PokerTableViewHandle, PokerTableHorseshoeViewProps>(function PokerTableHorseshoeView(props, ref) {
  const {
    table,
    revealed,
    hideCpuHoleUntilShowdown,
    editLayoutMode,
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

  function makeDragMouseHandlers(kind: 'seat' | 'board' | 'pot' | 'showdown' | 'bet' | 'stack', index?: number) {
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

  function elementDomId(kind: 'seat' | 'board' | 'pot' | 'showdown' | 'bet' | 'stack', index?: number) {
    if (kind === 'seat') return `horseshoe-seat-wrapper-${index}`
    if (kind === 'bet') return `horseshoe-bet-${index}`
    if (kind === 'stack') return `horseshoe-stack-${index}`
    if (kind === 'board') return `horseshoe-board`
    if (kind === 'pot') return `horseshoe-pot`
    if (kind === 'showdown') return `horseshoe-showdown`
    return ''
  }

  function makeResizeMouseHandlers(kind: 'seat' | 'board' | 'pot' | 'showdown' | 'bet' | 'stack', index?: number) {
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
            const cont = containerRef.current?.getBoundingClientRect()
            initialWidth = initialWidth ?? rect.width
            initialHeight = initialHeight ?? rect.height
            if (initialCenterLeft === undefined && cont) initialCenterLeft = (rect.left - cont.left) + (rect.width / 2)
            if (initialCenterTop === undefined && cont) initialCenterTop = (rect.top - cont.top) + (rect.height / 2)
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

  function exportLayoutToJson() {
    const container = containerRef.current
    const contRect = container?.getBoundingClientRect()
    const toCenterRect = (el: HTMLElement | null): Rect | null => {
      if (!el || !contRect) return null
      const r = el.getBoundingClientRect()
      return { left: (r.left - contRect.left) + r.width / 2, top: (r.top - contRect.top) + r.height / 2, width: r.width, height: r.height }
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
    const out: LayoutOverrides = { seats, bets, stacks, board: board ?? undefined, pot: pot ?? undefined, showdown: showdown ?? undefined }
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
        {/* Pot and Side Pots */}
        {(() => { const p = getPotPos(); if (!p) return null; return (
          <div id="horseshoe-pot" style={{ position: 'absolute', left: p.left, top: p.top, transform: 'translate(-50%, -50%)', fontWeight: 700, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6, cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined, width: p.width, height: p.height }} {...makeDragMouseHandlers('pot')}>
            {editLayoutMode && (
              <div aria-hidden style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }} {...makeResizeMouseHandlers('pot')} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Pot:</span>
              <ChipStack amount={mainPotAmount} />
              <span style={{ opacity: 0.9 }}>({mainPotAmount})</span>
            </div>
            {pots.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12, opacity: 0.95, fontWeight: 600 }}>
                {pots.slice(1).map((pot, idx) => (
                  <div key={`sidepot-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ opacity: 0.9 }}>Side {idx + 1}:</span>
                    <ChipStack amount={pot.amount} />
                    <span style={{ opacity: 0.9 }}>({pot.amount})</span>
                  </div>
                ))}
              </div>
            )}
            {pots.length > 1 && (
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
          const forceFaceDown = (table.status === 'in_hand') && (i !== 0) && (revealed.holeCounts[i] === 0)
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
                  showPerSeatEquity={(!hideCpuHoleUntilShowdown) || (table.status === 'hand_over' && table.community.length >= 5) ? (!s.hasFolded && s.hole.length === 2) : (i === 0)}
                  equityWinPct={equity ? equity.winPct[i] ?? null : null}
                  equityTiePct={equity ? equity.tiePct[i] ?? null : null}
                  equityRunning={!!equity?.running}
                  seatCardScale={CONFIG.poker.horseshoe.seatCardScale}
                  resultText={table.status === 'hand_over' ? ((winnersSet as Set<number>).has(i) ? 'Winner' : (s.hasFolded ? 'Folded' : 'Lost')) : ''}
                  visibleHoleCount={visible}
                  forceFaceDown={forceFaceDown}
                />
                {editLayoutMode && (
                  <div aria-hidden style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }} {...makeResizeMouseHandlers('seat', i)} />
                )}
              </div>
            ),
            (
              <div id={`horseshoe-bet-${i}`} key={`bet-${i}`} style={{ position: 'absolute', left: betPos?.left ?? centerX, top: betPos?.top ?? centerY, transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined, width: betPos?.width, height: betPos?.height }} {...makeDragMouseHandlers('bet', i)}>
                <ChipStack amount={s.committedThisStreet} />
                <span style={{ marginLeft: 6, fontSize: 14, lineHeight: 1, opacity: 0.9 }}>({s.committedThisStreet})</span>
                {editLayoutMode && (
                  <div aria-hidden style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }} {...makeResizeMouseHandlers('bet', i)} />
                )}
              </div>
            ),
            (
              <div id={`horseshoe-stack-${i}`} key={`stack-${i}`} style={{ position: 'absolute', left: stackPos?.left ?? centerX, top: stackPos?.top ?? centerY, transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined, width: stackPos?.width, height: stackPos?.height }} {...makeDragMouseHandlers('stack', i)}>
                <span>Stack:</span>
                <ChipStack amount={s.stack} />
                <span style={{ marginLeft: 6, fontSize: 14, lineHeight: 1, opacity: 0.9 }}>({s.stack})</span>
                {editLayoutMode && (
                  <div aria-hidden style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }} {...makeResizeMouseHandlers('stack', i)} />
                )}
              </div>
            )
          ]
        })}
      </div>
    </div>
  )
})


