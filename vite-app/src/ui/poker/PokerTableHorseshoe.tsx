import { useEffect, useMemo, useRef, useState } from 'react'
import { usePokerGameContext } from './PokerGameContext'
import { Card3D } from '../components/Card3D'
import { PokerSeat } from './PokerSeat'
import { evaluateSeven, pickBestFive, formatEvaluated } from '../../poker/handEval'
import { CONFIG } from '../../config'
import { useEquity } from './useEquity'
import { ChipStack } from '../components/ChipStack'

export function PokerTableHorseshoe() {
  const { table, revealed, dealNext, autoPlay, setAutoPlay, available, fold, check, call, bet, raise, hideCpuHoleUntilShowdown, setHideCpuHoleUntilShowdown, historyLines, review, reviewNextStep, reviewPrevStep, endReview } = usePokerGameContext()
  const [betSize, setBetSize] = useState<'33'|'50'|'75'|'pot'|'shove'>('50')
  const { equity, run: runEquity, running: equityRunning } = useEquity()
  const containerRef = useRef<HTMLDivElement | null>(null)

  type Rect = { left?: number; top?: number; width?: number; height?: number }
  type LayoutOverrides = {
    seats: Record<number, Rect>
    board?: Rect
    pot?: Rect
    showdown?: Rect
    bets?: Record<number, Rect>
    stacks?: Record<number, Rect>
  }
  const [editLayoutMode, setEditLayoutMode] = useState<boolean>(false)
  const GRID_SIZE = 10
  const MAJOR_GRID_SIZE = 50
  const [layoutOverrides, setLayoutOverrides] = useState<LayoutOverrides>({ seats: {} })
  // No localStorage persistence; layout comes from horseshoe-layout.json

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
        if (!applied) {
          // If file missing, keep empty layout (user can place in edit mode)
          setLayoutOverrides({ seats: {} })
        }
      })
  }, [])

  const community = table.community
  const totalPot = useMemo(() => table.pot.main, [table.pot.main])
  const showdownText = useMemo(() => {
    if (table.status !== 'hand_over') return ''
    if (community.length < 5) return ''
    const ranked: { seat: number; text: string }[] = []
    table.seats.forEach((s, i) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const ev = evaluateSeven([...s.hole, ...community])
      ranked.push({ seat: i, text: formatEvaluated(ev) })
    })
    if (ranked.length === 0) return ''
    const rakePct = CONFIG.poker.rakePercent
    const rakeCap = CONFIG.poker.rakeCap
    const rake = CONFIG.poker.showRakeInUI ? Math.min(Math.floor(totalPot * rakePct), rakeCap > 0 ? rakeCap : Number.MAX_SAFE_INTEGER) : 0
    const potText = `Pot: ${totalPot}${rake ? ` (rake ${rake})` : ''}`
    return `${potText} • ` + ranked.map((r) => `Seat ${r.seat}: ${r.text}`).join(' • ')
  }, [table.status, community, table.seats, totalPot])

  // Trigger equity computation during active hands (avoid re-render loops)
  const samples = 2000
  const lastEqKeyRef = useRef<string | null>(null)
  useEffect(() => {
    const shouldRun = table.status === 'in_hand' || (table.status === 'hand_over' && community.length >= 5)
    if (!shouldRun) return
    const keyPartSeats = table.seats.map((s, i) => {
      if (s.hasFolded) return 'X'
      const hidden = hideCpuHoleUntilShowdown && table.status !== 'hand_over' && i !== 0
      return hidden ? '??' : (s.hole.map((c) => `${c.rank}${c.suit[0]}`).join(''))
    }).join('|')
    const keyPartBoard = community.map((c) => `${c.rank}${c.suit[0]}`).join('')
    const k = `${keyPartSeats}#${keyPartBoard}`
    if (k === lastEqKeyRef.current) return
    lastEqKeyRef.current = k
    const seatsForEquity = table.seats.map((s, i) => ({
      hole: (hideCpuHoleUntilShowdown && table.status !== 'hand_over' && i !== 0) ? [] : s.hole,
      folded: s.hasFolded,
    }))
    runEquity(seatsForEquity as any, community as any, samples)
  }, [table.status, table.seats, community, hideCpuHoleUntilShowdown])
  const highlightSet = useMemo(() => {
    if (table.status !== 'hand_over' || community.length < 5) return new Set<string>()
    const classOrder: Record<string, number> = { high_card:0,pair:1,two_pair:2,three_kind:3,straight:4,flush:5,full_house:6,four_kind:7,straight_flush:8 } as const as any
    let best: { classIdx: number; ranks: number[] } | null = null
    table.seats.forEach((s) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const ev = evaluateSeven([...s.hole, ...community])
      const score = { classIdx: classOrder[ev.class], ranks: ev.ranks }
      if (!best) best = score
      else {
        const cd = score.classIdx - best.classIdx
        if (cd > 0) best = score
        else if (cd === 0) {
          for (let i = 0; i < Math.max(score.ranks.length, best.ranks.length); i += 1) {
            const a = score.ranks[i] ?? -1
            const b = best.ranks[i] ?? -1
            if (a !== b) { if (a > b) best = score; break }
          }
        }
      }
    })
    const out = new Set<string>()
    if (!best) return out
    table.seats.forEach((s, si) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const all = [...s.hole, ...community]
      const { eval: ev, indices } = pickBestFive(all)
      const score = { classIdx: classOrder[ev.class], ranks: ev.ranks }
      const equal = score.classIdx === best!.classIdx && JSON.stringify(score.ranks) === JSON.stringify(best!.ranks)
      if (equal) {
        indices.forEach((j) => { if (j <= 1) out.add(`S${si}-${j}`); else out.add(`B${j-2}`) })
      }
    })
    return out
  }, [table.status, community, table.seats])

  const winnersSet = useMemo(() => {
    const winners = new Set<number>()
    if (table.status !== 'hand_over') return winners
    const contenders = table.seats.filter((s) => !s.hasFolded && s.hole.length === 2).length
    // If no showdown (e.g., everyone folded), remaining non-folded seats are winners
    if (community.length < 5 || contenders <= 1) {
      table.seats.forEach((s, i) => { if (!s.hasFolded && s.hole.length > 0) winners.add(i) })
      return winners
    }
    const classOrder: Record<string, number> = { high_card:0,pair:1,two_pair:2,three_kind:3,straight:4,flush:5,full_house:6,four_kind:7,straight_flush:8 } as const as any
    let best: { classIdx: number; ranks: number[] } | null = null
    table.seats.forEach((s) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const ev = evaluateSeven([...s.hole, ...community])
      const score = { classIdx: classOrder[ev.class], ranks: ev.ranks }
      if (!best) best = score
      else {
        const cd = score.classIdx - best.classIdx
        if (cd > 0) best = score
        else if (cd === 0) {
          for (let i = 0; i < Math.max(score.ranks.length, best.ranks.length); i += 1) {
            const a = score.ranks[i] ?? -1
            const b = best.ranks[i] ?? -1
            if (a !== b) { if (a > b) best = score; break }
          }
        }
      }
    })
    if (!best) return winners
    table.seats.forEach((s, i) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const ev = evaluateSeven([...s.hole, ...community])
      const score = { classIdx: classOrder[ev.class], ranks: ev.ranks }
      const equal = score.classIdx === best!.classIdx && JSON.stringify(score.ranks) === JSON.stringify(best!.ranks)
      if (equal) winners.add(i)
    })
    return winners
  }, [table.status, community, table.seats])

  const width = CONFIG.poker.horseshoe.tableWidthPx
  const height = CONFIG.poker.horseshoe.tableHeightPx
  const centerX = width / 2
  const centerY = height / 2

  // Positions come only from horseshoe-layout.json
  function getSeatPos(seatIndex: number): Rect | null {
    return layoutOverrides.seats?.[seatIndex] ?? null
  }

  function getBoardPos(): Rect | null { return layoutOverrides.board ?? null }
  function getPotPos(): Rect | null { return layoutOverrides.pot ?? null }
  function getShowdownPos(): Rect | null { return layoutOverrides.showdown ?? null }
  function getBetPos(seatIndex: number): Rect | null { return layoutOverrides.bets?.[seatIndex] ?? null }
  function getStackPos(seatIndex: number): Rect | null { return layoutOverrides.stacks?.[seatIndex] ?? null }

  function makeDragMouseHandlers(kind: 'seat' | 'board' | 'pot' | 'showdown' | 'bet' | 'stack', index?: number) {
    if (!editLayoutMode) return {}
    return {
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const startClientX = e.clientX
        const startClientY = e.clientY
        const current: Rect = (() => {
          if (kind === 'seat') {
            const i = index as number
            const s = layoutOverrides.seats[i]
            if (s) return s
          } else if (kind === 'bet') {
            const i = index as number
            const b = layoutOverrides.bets?.[i]
            if (b) return b
          } else if (kind === 'stack') {
            const i = index as number
            const s = layoutOverrides.stacks?.[i]
            if (s) return s
          } else {
            const v = (layoutOverrides as any)[kind]
            if (v) return v
          }
          // If no position exists yet, start from the mouse-down point
          const rect = containerRef.current?.getBoundingClientRect()
          const left = rect ? e.clientX - rect.left : 0
          const top = rect ? e.clientY - rect.top : 0
          return { left, top }
        })()

        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startClientX
          const dy = ev.clientY - startClientY
          const rawLeft = (current.left ?? 0) + dx
          const rawTop = (current.top ?? 0) + dy
          const snap = (v: number, g: number) => Math.round(v / g) * g
          const next: Rect = {
            left: snap(rawLeft, GRID_SIZE),
            top: snap(rawTop, GRID_SIZE)
          }
          setLayoutOverrides((prev): LayoutOverrides => {
            if (kind === 'seat') {
              const i = index as number
              return { ...prev, seats: { ...prev.seats, [i]: { ...prev.seats[i], ...next } } }
            }
            if (kind === 'bet') {
              const i = index as number
              return { ...prev, bets: { ...(prev.bets ?? {}), [i]: { ...(prev.bets?.[i] ?? {}), ...next } } }
            }
            if (kind === 'stack') {
              const i = index as number
              return { ...prev, stacks: { ...(prev.stacks ?? {}), [i]: { ...(prev.stacks?.[i] ?? {}), ...next } } }
            }
            const prevRect: Rect = (prev as any)[kind] ?? {}
            return { ...prev, [kind]: { ...prevRect, ...next } } as LayoutOverrides
          })
        }
        const onUp = () => {
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
        }
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
        e.preventDefault()
        e.stopPropagation()
        const startClientX = e.clientX
        const startClientY = e.clientY
        const keyIndex = index as number | undefined
        const getCurrentRect = (): Rect => {
          if (kind === 'seat' && keyIndex !== undefined) return layoutOverrides.seats[keyIndex] ?? {}
          if (kind === 'bet' && keyIndex !== undefined) return layoutOverrides.bets?.[keyIndex] ?? {}
          return (layoutOverrides as any)[kind] ?? {}
        }
        // Measure DOM as fallback if sizes undefined
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
        const onUp = () => {
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
        }
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
      return {
        left: (r.left - contRect.left) + r.width / 2,
        top: (r.top - contRect.top) + r.height / 2,
        width: r.width,
        height: r.height,
      }
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
    const out: LayoutOverrides = {
      seats,
      bets,
      stacks,
      board: board ?? undefined,
      pot: pot ?? undefined,
      showdown: showdown ?? undefined,
    }
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

  return (
    <div id="poker-root" style={{ display: 'grid', gap: 12 }}>
      <div id="poker-status" className="poker-status">
        Hand #{table.handId} • Button @ {table.buttonIndex} • Status: {table.gameOver ? 'game_over' : table.status} • Street: {table.street ?? '-'} • To act: {table.currentToAct ?? '-'} • BetToCall: {table.betToCall}
      </div>

      <div id="poker-controlbar" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => dealNext()} disabled={table.status === 'in_hand' || table.gameOver}>Deal</button>
        <label><input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} /> Autoplay</label>
        {/* Normal view removed; horseshoe is now the default */}
        <label title="Hide CPU hole cards until showdown">
          <input type="checkbox" checked={hideCpuHoleUntilShowdown} onChange={(e) => setHideCpuHoleUntilShowdown(e.target.checked)} />
          Hide CPU hole
        </label>
        <select value={betSize} onChange={(e)=>setBetSize(e.target.value as any)}>
          <option value="33">33%</option>
          <option value="50">50%</option>
          <option value="75">75%</option>
          <option value="pot">Pot</option>
          <option value="shove">Shove</option>
        </select>
        <button onClick={() => {
          const pot = table.pot.main
          let amt = 0
          if (betSize === 'shove') amt = Number.MAX_SAFE_INTEGER
          else if (betSize === 'pot') amt = Math.floor(pot)
          else amt = Math.floor(pot * (parseInt(betSize,10)/100))
          bet(amt)
        }} disabled={!available.includes('bet')}>Bet</button>
        <button onClick={() => {
          const toCall = Math.max(0, table.betToCall - (table.seats[0]?.committedThisStreet||0))
          const pot = table.pot.main
          let extra = 0
          if (betSize === 'shove') extra = Number.MAX_SAFE_INTEGER
          else if (betSize === 'pot') extra = Math.floor(pot + toCall)
          else extra = Math.floor((pot + toCall) * (parseInt(betSize,10)/100))
          raise(extra)
        }} disabled={!available.includes('raise')}>Raise</button>
        <button onClick={fold} disabled={!available.includes('fold')}>Fold</button>
        <button onClick={check} disabled={!available.includes('check')}>Check</button>
        <button onClick={call} disabled={!available.includes('call')}>Call</button>

        <span className="sep" />
        <label title="Edit and drag layout elements">
          <input type="checkbox" checked={editLayoutMode} onChange={(e) => setEditLayoutMode(e.target.checked)} /> Edit Layout
        </label>
        <button onClick={exportLayoutToJson}>Export Layout JSON</button>
        <button onClick={resetLayout} disabled={Object.keys(layoutOverrides.seats).length === 0 && !layoutOverrides.board && !layoutOverrides.pot && !layoutOverrides.showdown}>Reset Layout</button>
        {review && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 16 }}>
            <span style={{ opacity: 0.85 }}>Review Hand #{review.handId} • Step {review.step}/{review.actions.length}</span>
            <button onClick={reviewPrevStep}>&laquo; Prev</button>
            <button onClick={reviewNextStep}>Next &raquo;</button>
            <button onClick={endReview}>Exit Review</button>
          </div>
        )}
      </div>

      <div
        id="horseshoe-table"
        ref={containerRef}
        className="horseshoe-table"
        style={{ position: 'relative', width, height, margin: '0 auto', borderRadius: 24, background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}
      >
        {editLayoutMode && (
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px),
                linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px, ${GRID_SIZE}px ${GRID_SIZE}px, ${MAJOR_GRID_SIZE}px ${MAJOR_GRID_SIZE}px, ${MAJOR_GRID_SIZE}px ${MAJOR_GRID_SIZE}px`,
              opacity: 0.6
            }}
          />
        )}
        {/* Board in the center */}
        {(() => { const p = getBoardPos(); if (!p) return null; return (
          <div
            id="horseshoe-board"
            style={{ position: 'absolute', left: p.left, top: p.top, transform: 'translate(-50%, -50%)', display: 'flex', gap: CONFIG.poker.horseshoe.boardGapPx, cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined, width: p.width, height: p.height }}
            {...makeDragMouseHandlers('board')}
          >
            {editLayoutMode && (
              <div
                aria-hidden
                style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }}
                {...makeResizeMouseHandlers('board')}
              />
            )}
          {community.slice(0, Math.min(table.community.length, revealed.boardCount)).map((c, i) => (
            <div key={i} style={{ transform: `scale(${CONFIG.poker.horseshoe.seatCardScale})`, transformOrigin: 'center' }}>
              <Card3D card={c as any} highlight={highlightSet.has(`B${i}`)} />
            </div>
          ))}
          </div>
        )})()}
        {/* Pot */}
        {(() => { const p = getPotPos(); if (!p) return null; return (
          <div
            id="horseshoe-pot"
            style={{ position: 'absolute', left: p.left, top: p.top, transform: 'translate(-50%, -50%)', fontWeight: 700, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6, cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined, width: p.width, height: p.height }}
            {...makeDragMouseHandlers('pot')}
          >
            {editLayoutMode && (
              <div
                aria-hidden
                style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }}
                {...makeResizeMouseHandlers('pot')}
              />
            )}
          <span>Pot:</span>
          <ChipStack amount={totalPot} />
          <span style={{ opacity: 0.9 }}>({totalPot})</span>
          </div>
        )})()}
         {/* (removed central equity; shown per seat instead). When hiding CPU hole cards, only show player's equity. */}
         {/* Showdown hand descriptions */}
        {(() => { const p = getShowdownPos(); if (!p) return null; return (
          <div
            id="horseshoe-showdown"
            style={{ position: 'absolute', left: p.left, top: p.top, transform: 'translate(-50%, -50%)', textAlign: 'center', maxWidth: width * 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined, width: p.width, height: p.height }}
            {...makeDragMouseHandlers('showdown')}
          >
            {showdownText}
            {editLayoutMode && (
              <div
                aria-hidden
                style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }}
                {...makeResizeMouseHandlers('showdown')}
              />
            )}
          </div>
        )})()}

        {/* Seats around horseshoe arc */}
        {table.seats.map((s, i) => {
          // Place seats clockwise by reversing the visual index around the arc
          const pos = getSeatPos(i)
          const betPos = getBetPos(i)
          const stackPos = getStackPos(i)
          return [
            (
              <div
                id={`horseshoe-seat-wrapper-${i}`}
                key={`seat-${i}`}
                style={{ position: 'absolute', left: pos?.left ?? centerX, top: pos?.top ?? centerY, transform: 'translate(-50%, -50%)', width: (pos?.width ?? CONFIG.poker.horseshoe.seatWidthPx), height: pos?.height, cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined }}
                {...makeDragMouseHandlers('seat', i)}
              >
                <PokerSeat
                  idPrefix="horseshoe-seat"
                  seat={s}
                  seatIndex={i}
                  handId={table.handId}
                  buttonIndex={table.buttonIndex}
                  currentToAct={table.currentToAct}
                  highlightSet={highlightSet}
                  hideStackRow={true}
                   showPerSeatEquity={(!hideCpuHoleUntilShowdown) || (table.status === 'hand_over' && community.length >= 5) ? (!s.hasFolded && s.hole.length === 2) : (i === 0)}
                  equityWinPct={equity ? (equity.win[i] / samples) * 100 : null}
                  equityTiePct={equity ? (equity.tie[i] / samples) * 100 : null}
                  equityRunning={!!equityRunning}
                  seatCardScale={CONFIG.poker.horseshoe.seatCardScale}
                  resultText={table.status === 'hand_over' ? (winnersSet.has(i) ? 'Winner' : (s.hasFolded ? 'Folded' : 'Lost')) : ''}
                  visibleHoleCount={(table.status === 'hand_over' && community.length >= 5 && table.seats.filter((x) => !x.hasFolded && x.hole.length === 2).length > 1) ? (s.hole.length) : (revealed.holeCounts[i] ?? 0)}
                  forceFaceDown={(table.status === 'in_hand') && (i !== 0) && (revealed.holeCounts[i] === 0)}
                />
                {editLayoutMode && (
                  <div
                    aria-hidden
                    style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }}
                    {...makeResizeMouseHandlers('seat', i)}
                  />
                )}
              </div>
            ),
            (
              <div
                id={`horseshoe-bet-${i}`}
                key={`bet-${i}`}
                style={{ position: 'absolute', left: betPos?.left ?? centerX, top: betPos?.top ?? centerY, transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined, width: betPos?.width, height: betPos?.height }}
                {...makeDragMouseHandlers('bet', i)}
              >
                <ChipStack amount={s.committedThisStreet} />
                <span style={{ marginLeft: 6, fontSize: 14, lineHeight: 1, opacity: 0.9 }}>({s.committedThisStreet})</span>
                {editLayoutMode && (
                  <div
                    aria-hidden
                    style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }}
                    {...makeResizeMouseHandlers('bet', i)}
                  />
                )}
              </div>
            ),
            (
              <div
                id={`horseshoe-stack-${i}`}
                key={`stack-${i}`}
                style={{ position: 'absolute', left: stackPos?.left ?? centerX, top: stackPos?.top ?? centerY, transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', cursor: editLayoutMode ? 'move' : undefined, outline: editLayoutMode ? '1px dashed rgba(255,255,255,0.4)' : undefined, width: stackPos?.width, height: stackPos?.height }}
                {...makeDragMouseHandlers('stack', i)}
              >
                <span>Stack:</span>
                <ChipStack amount={s.stack} />
                <span style={{ marginLeft: 6, fontSize: 14, lineHeight: 1, opacity: 0.9 }}>({s.stack})</span>
                {editLayoutMode && (
                  <div
                    aria-hidden
                    style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 4, cursor: 'nwse-resize' }}
                    {...makeResizeMouseHandlers('stack', i)}
                  />
                )}
              </div>
            )
          ]
        })}
      </div>
      {/* Hand history panel */}
      <div id="hand-history" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontWeight: 700 }}>Hand History</div>
          <button onClick={() => { window.location.hash = '#poker-history' }}>Open History</button>
        </div>
        <div style={{ maxHeight: 160, overflowY: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace', fontSize: 12, padding: 8, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, background: 'rgba(0,0,0,0.12)' }}>
          {historyLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  )
}


