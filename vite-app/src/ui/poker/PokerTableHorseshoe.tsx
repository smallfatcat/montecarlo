import { useEffect, useMemo, useRef, useState } from 'react'
import { usePokerGame } from './usePokerGame'
import { Card3D } from '../components/Card3D'
import { evaluateSeven, pickBestFive, formatEvaluated } from '../../poker/handEval'
import { CONFIG } from '../../config'
import { useEquity } from './useEquity'

function seatPosition(index: number, total: number, radiusX: number, radiusY: number, centerX: number, centerY: number) {
  // Horseshoe arc (semi-ellipse) across the lower half of the table
  // Angles from 205° to -25° (clockwise), evenly spaced for a wider arc
  const startDeg = 205
  const endDeg = -25
  const t = total <= 1 ? 0 : index / (total - 1)
  const deg = startDeg + (endDeg - startDeg) * t
  const rad = (deg * Math.PI) / 180
  // Push end seats (0 and last) a bit further toward the horizontal edges
  const edgeBoost = index === 0 || index === total - 1 ? 1.1 : (index === 1 || index === total - 2 ? 1.08 : 1.0)
  const topBoost = index === 0 || index === total - 1 ? 1.2 : (index === 1 || index === total - 2 ? 1.0 : 1.0)
  const x = centerX + (radiusX * edgeBoost) * Math.cos(rad)
  const y = centerY + (radiusY * topBoost) * Math.sin(rad)
  return { left: x, top: y }
}

export function PokerTableHorseshoe() {
  const { table, beginHand, autoPlay, setAutoPlay, available, fold, check, call, bet, raise } = usePokerGame()
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
    if (table.status !== 'in_hand') return
    const keyPartSeats = table.seats.map((s) => s.hasFolded ? 'X' : (s.hole.map((c) => `${c.rank}${c.suit[0]}`).join(''))).join('|')
    const keyPartBoard = community.map((c) => `${c.rank}${c.suit[0]}`).join('')
    const k = `${keyPartSeats}#${keyPartBoard}`
    if (k === lastEqKeyRef.current) return
    lastEqKeyRef.current = k
    const seatsForEquity = table.seats.map((s) => ({ hole: s.hole, folded: s.hasFolded }))
    runEquity(seatsForEquity as any, community as any, samples)
  }, [table.status, table.seats, community])
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

  const width = 1200
  const height = 720
  const centerX = width / 2
  const centerY = height / 2 - 20
  const base = Math.min(width, height) / 2 - 80
  // Ellipse radii: stretch horizontally, slightly tighter vertically
  const radiusX = base * 1.6
  const radiusY = base * 1.0

  return (
    <div id="poker-root" style={{ display: 'grid', gap: 12 }}>
      <div className="poker-status">
        Hand #{table.handId} • Button @ {table.buttonIndex} • Status: {table.gameOver ? 'game_over' : table.status} • Street: {table.street ?? '-'} • To act: {table.currentToAct ?? '-'} • BetToCall: {table.betToCall}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => beginHand()} disabled={table.status === 'in_hand' || table.gameOver}>Deal</button>
        <label><input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} /> Autoplay</label>
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

      <div className="horseshoe-table" style={{ position: 'relative', width, height, margin: '0 auto', borderRadius: 24, background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        {/* Board in the center */}
        <div style={{ position: 'absolute', left: centerX, top: centerY - 60, transform: 'translate(-50%, -50%)', display: 'flex', gap: 10 }}>
          {community.map((c, i) => (
            <div key={i} style={{ transform: 'scale(0.9)', transformOrigin: 'center' }}>
              <Card3D card={c as any} highlight={highlightSet.has(`B${i}`)} />
            </div>
          ))}
        </div>
        {/* Pot */}
        <div style={{ position: 'absolute', left: centerX, top: centerY + 35, transform: 'translate(-50%, -50%)', fontWeight: 700, opacity: 0.9 }}>Pot: {totalPot}</div>
        {/* (removed central equity; shown per seat instead) */}
        {/* Showdown hand descriptions */}
        <div style={{ position: 'absolute', left: centerX, top: centerY + 70, transform: 'translate(-50%, -50%)', textAlign: 'center', maxWidth: width * 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {showdownText}
        </div>

        {/* Seats around horseshoe arc */}
        {table.seats.map((s, i) => {
          const pos = seatPosition(i, table.seats.length, radiusX, radiusY, centerX, centerY)
          const outline = i === table.currentToAct ? '2px solid #ffd54f' : undefined
          return (
            <div key={i} style={{ position: 'absolute', left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)', width: 200, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, padding: 6, background: 'rgba(0,0,0,0.18)', outline, outlineOffset: 2 }}>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                {!s.hasFolded && s.hole.map((c, k) => (
                  <div key={k} style={{ transform: 'scale(0.9)', transformOrigin: 'center' }}>
                    <Card3D card={c as any} highlight={highlightSet.has(`S${i}-${k}`)} />
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.9 }}>Seat {i}{i === table.buttonIndex ? ' (BTN)' : ''}{s.hasFolded ? ' · Folded' : ''}{s.isAllIn ? ' · All-in' : ''}</div>
              <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.9 }}>Stack: {s.stack}</div>
              <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.9 }}>Bet: {s.committedThisStreet} • In pot: {s.totalCommitted}</div>
              {equity && !s.hasFolded && s.hole.length === 2 && (
                <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.85 }}>
                  {((equity.win[i] / samples) * 100).toFixed(1)}% win • {((equity.tie[i] / samples) * 100).toFixed(1)}% tie {equityRunning ? ' (…)' : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


