import { useEffect, useMemo, useRef, useState } from 'react'
import { usePokerGameContext } from './PokerGameContext'
import { Card3D } from '../components/Card3D'
import { PokerSeat } from './PokerSeat'
import { evaluateSeven, pickBestFive, formatEvaluated } from '../../poker/handEval'
import { CONFIG } from '../../config'
import { useEquity } from './useEquity'

function seatPosition(index: number, total: number, radiusX: number, radiusY: number, centerX: number, centerY: number) {
  // Horseshoe arc (semi-ellipse) across the lower half of the table
  const startDeg = CONFIG.poker.horseshoe.arcStartDeg
  const endDeg = CONFIG.poker.horseshoe.arcEndDeg
  const t = total <= 1 ? 0 : index / (total - 1)
  const deg = startDeg + (endDeg - startDeg) * t
  const rad = (deg * Math.PI) / 180
  // Push end seats (0 and last) a bit further toward the horizontal edges
  const edgeBoost = index === 0 || index === total - 1 ? CONFIG.poker.horseshoe.edgeBoostEnd : (index === 1 || index === total - 2 ? CONFIG.poker.horseshoe.edgeBoostNearEnd : 1.0)
  const topBoost = index === 0 || index === total - 1 ? CONFIG.poker.horseshoe.topBoostEnd : (index === 1 || index === total - 2 ? CONFIG.poker.horseshoe.topBoostNearEnd : 1.0)
  const x = centerX + (radiusX * edgeBoost) * Math.cos(rad)
  const y = centerY + (radiusY * topBoost) * Math.sin(rad)
  return { left: x, top: y }
}

export function PokerTableHorseshoe() {
  const { table, revealed, dealNext, autoPlay, setAutoPlay, available, fold, check, call, bet, raise, hideCpuHoleUntilShowdown, setHideCpuHoleUntilShowdown, historyLines } = usePokerGameContext()
  const [betSize, setBetSize] = useState<'33'|'50'|'75'|'pot'|'shove'>('50')
  const { equity, run: runEquity, running: equityRunning } = useEquity()

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
    if (table.status !== 'hand_over' || community.length < 5) return new Set<number>()
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
    const winners = new Set<number>()
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
  const centerY = height / 2 + CONFIG.poker.horseshoe.centerYOffsetPx
  const base = Math.min(width, height) / 2 - CONFIG.poker.horseshoe.basePaddingPx
  // Ellipse radii: stretch horizontally, slightly tighter vertically
  const radiusX = base * CONFIG.poker.horseshoe.radiusXScale
  const radiusY = base * CONFIG.poker.horseshoe.radiusYScale
  // Intentionally left here if future sizing is needed; seat sizing comes from PokerSeat

  return (
    <div id="poker-root" style={{ display: 'grid', gap: 12 }}>
      <div id="poker-status" className="poker-status">
        Hand #{table.handId} • Button @ {table.buttonIndex} • Status: {table.gameOver ? 'game_over' : table.status} • Street: {table.street ?? '-'} • To act: {table.currentToAct ?? '-'} • BetToCall: {table.betToCall}
      </div>

      <div id="poker-controlbar" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => dealNext()} disabled={table.status === 'in_hand' || table.gameOver}>Deal</button>
        <label><input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} /> Autoplay</label>
        <button onClick={() => { window.location.hash = '#poker' }}>Normal View</button>
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
      </div>

      <div id="horseshoe-table" className="horseshoe-table" style={{ position: 'relative', width, height, margin: '0 auto', borderRadius: 24, background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        {/* Board in the center */}
        <div id="horseshoe-board" style={{ position: 'absolute', left: centerX, top: centerY + CONFIG.poker.horseshoe.boardOffsetY, transform: 'translate(-50%, -50%)', display: 'flex', gap: CONFIG.poker.horseshoe.boardGapPx }}>
          {community.slice(0, Math.min(table.community.length, revealed.boardCount)).map((c, i) => (
            <div key={i} style={{ transform: `scale(${CONFIG.poker.horseshoe.seatCardScale})`, transformOrigin: 'center' }}>
              <Card3D card={c as any} highlight={highlightSet.has(`B${i}`)} />
            </div>
          ))}
        </div>
        {/* Pot */}
        <div id="horseshoe-pot" style={{ position: 'absolute', left: centerX, top: centerY + CONFIG.poker.horseshoe.potOffsetY, transform: 'translate(-50%, -50%)', fontWeight: 700, opacity: 0.9 }}>Pot: {totalPot}</div>
         {/* (removed central equity; shown per seat instead). When hiding CPU hole cards, only show player's equity. */}
         {/* Showdown hand descriptions */}
        <div id="horseshoe-showdown" style={{ position: 'absolute', left: centerX, top: centerY + CONFIG.poker.horseshoe.showdownOffsetY, transform: 'translate(-50%, -50%)', textAlign: 'center', maxWidth: width * 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {showdownText}
        </div>

        {/* Seats around horseshoe arc */}
        {table.seats.map((s, i) => {
          // Place seats clockwise by reversing the visual index around the arc
          const posIndex = (table.seats.length - 1) - i
          const pos = seatPosition(posIndex, table.seats.length, radiusX, radiusY, centerX, centerY)
          return (
            <div key={i} style={{ position: 'absolute', left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)', width: CONFIG.poker.horseshoe.seatWidthPx }}>
              <PokerSeat
                idPrefix="horseshoe-seat"
                seat={s}
                seatIndex={i}
                handId={table.handId}
                buttonIndex={table.buttonIndex}
                currentToAct={table.currentToAct}
                highlightSet={highlightSet}
                 showPerSeatEquity={(!hideCpuHoleUntilShowdown) || (table.status === 'hand_over' && community.length >= 5) ? (!s.hasFolded && s.hole.length === 2) : (i === 0)}
                equityWinPct={equity ? (equity.win[i] / samples) * 100 : null}
                equityTiePct={equity ? (equity.tie[i] / samples) * 100 : null}
                equityRunning={!!equityRunning}
                seatCardScale={CONFIG.poker.horseshoe.seatCardScale}
                resultText={table.status === 'hand_over' ? (winnersSet.has(i) ? 'Winner' : (s.hasFolded ? 'Folded' : 'Lost')) : ''}
                visibleHoleCount={(table.status === 'hand_over' && community.length >= 5 && table.seats.filter((x) => !x.hasFolded && x.hole.length === 2).length > 1) ? (s.hole.length) : (revealed.holeCounts[i] ?? 0)}
                forceFaceDown={(table.status === 'in_hand') && (i !== 0) && (revealed.holeCounts[i] === 0)}
              />
            </div>
          )
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


