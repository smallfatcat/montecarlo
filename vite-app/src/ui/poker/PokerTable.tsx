import { useEffect, useRef, useState } from 'react'
import { usePokerGame } from './usePokerGame'
import { Card3D } from '../components/Card3D'
import { evaluateSeven, formatEvaluated, pickBestFive } from '../../poker/handEval'
import { CONFIG } from '../../config'
import { usePokerSimulationRunner } from './usePokerSimulationRunner'
import { useEquity } from './useEquity'

export function PokerTable() {
  const { table, beginHand, autoPlay, setAutoPlay, available, fold, check, call, bet, raise } = usePokerGame()
  const sim = usePokerSimulationRunner()
  const [simHands, setSimHands] = useState(1000)
  const [simProgress, setSimProgress] = useState<{done:number,total:number}|null>(null)
  const [betSize, setBetSize] = useState<'33'|'50'|'75'|'pot'|'shove'>('50')
  const [showControls, setShowControls] = useState(true)
  const { equity, run: runEquity, running: equityRunning } = useEquity()

  const seats = table.seats
  const community = table.community
  const highlightSet = (() => {
    if (table.status !== 'hand_over' || community.length < 5) return new Set<string>()
    // Find best hand(s); highlight their 5 cards
    let bestScore: { classIdx: number; ranks: number[] } | null = null
    const classOrder: Record<string, number> = { high_card:0,pair:1,two_pair:2,three_kind:3,straight:4,flush:5,full_house:6,four_kind:7,straight_flush:8 } as const as any
    const pick = new Set<string>()
    table.seats.forEach((s) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const ev = evaluateSeven([...s.hole, ...community])
      const score = { classIdx: classOrder[ev.class], ranks: ev.ranks }
      const cmp = () => {
        if (!bestScore) return 1
        const cd = score.classIdx - bestScore.classIdx
        if (cd !== 0) return cd
        const len = Math.max(score.ranks.length, bestScore.ranks.length)
        for (let i = 0; i < len; i += 1) {
          const a = score.ranks[i] ?? -1
          const b = bestScore.ranks[i] ?? -1
          if (a !== b) return a - b
        }
        return 0
      }
      if (cmp() > 0) {
        bestScore = score
        // bestText could be shown; we already build a summary below
      }
    })
    // Precise highlight: for every player tied with best score, compute the exact best 5-card set
    if (!bestScore) return pick
    table.seats.forEach((s, si) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const all = [...s.hole, ...community]
      const { eval: ev, indices } = pickBestFive(all)
      const score = { classIdx: classOrder[ev.class], ranks: ev.ranks }
      const equal = score.classIdx === bestScore!.classIdx && JSON.stringify(score.ranks) === JSON.stringify(bestScore!.ranks)
      if (equal) {
        // indices: 0..1 are seat hole, 2..6 are board indices shifted by -2
        indices.forEach((j) => {
          if (j <= 1) pick.add(`S${si}-${j}`)
          else pick.add(`B${j - 2}`)
        })
      }
    })
    return pick
  })()
  const winnersSet = (() => {
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
  })()
  const showdownText = (() => {
    if (table.status !== 'hand_over') return ''
    if (community.length < 5) return ''
    const ranked: { seat: number; text: string }[] = []
    table.seats.forEach((s, i) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const ev = evaluateSeven([...s.hole, ...community])
      ranked.push({ seat: i, text: formatEvaluated(ev) })
    })
    if (ranked.length === 0) return ''
    const pot = table.seats.reduce((sum, s) => sum + s.totalCommitted, 0)
    const rakePct = CONFIG.poker.rakePercent
    const rakeCap = CONFIG.poker.rakeCap
    const rake = CONFIG.poker.showRakeInUI ? Math.min(Math.floor(pot * rakePct), rakeCap > 0 ? rakeCap : Number.MAX_SAFE_INTEGER) : 0
    const potText = `Pot: ${pot}${rake ? ` (rake ${rake})` : ''}`
    return `${potText} • ` + ranked.map((r) => `Seat ${r.seat}: ${r.text}`).join(' • ')
  })()

  // Recompute equities after each state change during in_hand (guarded to avoid re-render loops)
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

  return (
    <div id="poker-root" style={{ display: 'grid', gap: 12 }}>
      <div className="poker-status" title={`Hand #${table.handId} • Btn ${table.buttonIndex} • ${table.status} • ${table.street ?? '-'} • To act ${table.currentToAct ?? '-'} • BetToCall ${table.betToCall}`}>
        Hand #{table.handId} • Button @ {table.buttonIndex} • Status: {table.gameOver ? 'game_over' : table.status} • Street: {table.street ?? '-'} • To act: {table.currentToAct ?? '-'} • BetToCall: {table.betToCall}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => beginHand()} disabled={table.status === 'in_hand' || table.gameOver}>Deal</button>
        <label><input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} /> Autoplay</label>
        <button onClick={() => setShowControls((v) => !v)}>{showControls ? 'Hide' : 'Show'} Controls</button>
      </div>

      <div className="board-row" style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        {community.map((c, i) => (
          <Card3D key={i} card={c as any} highlight={highlightSet.has(`B${i}`)} />
        ))}
      </div>
      {/* Pot display */}
      <div style={{ textAlign: 'center', fontWeight: 700, opacity: 0.9 }}>Pot: {table.pot.main}</div>
      {/* Equity bar */}
      {equity && (
        <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.85 }}>
          {table.seats.map((_, i) => (
            <span key={i} style={{ marginRight: 10 }}>
              Seat {i}: {((equity.win[i] / samples) * 100).toFixed(1)}% win • {((equity.tie[i] / samples) * 100).toFixed(1)}% tie
            </span>
          ))}
          {equityRunning && <span> (calculating…)</span>}
        </div>
      )}
      <div className="showdown-text" style={{ textAlign: 'center', opacity: 0.9 }}>{showdownText}</div>

      <div className="seats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {seats.map((s, i) => (
          <div key={i} style={{ border: '1px solid #444', padding: 8, borderRadius: 8, outline: i === table.currentToAct ? '2px solid #ffd54f' : undefined, outlineOffset: 2 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {!s.hasFolded && s.hole.map((c, k) => (
                <Card3D key={k} card={c as any} highlight={highlightSet.has(`S${i}-${k}`)} />
              ))}
            </div>
            <div>Seat {i} {i === table.buttonIndex ? ' (BTN)' : ''} {s.hasFolded ? ' - Folded' : ''} {s.isAllIn ? ' - All-in' : ''}</div>
            <div>Stack: {s.stack}</div>
            <div>Bet: {s.committedThisStreet} · In pot: {s.totalCommitted}</div>
            {table.status === 'hand_over' && (
              <div style={{ fontWeight: 700, color: winnersSet.has(i) ? '#ffd54f' : undefined }}>
                {winnersSet.has(i) ? 'Winner' : (s.hasFolded ? 'Folded' : 'Lost')}
              </div>
            )}
          </div>
        ))}
      </div>

      {showControls && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fold} disabled={!available.includes('fold')}>Fold</button>
          <button onClick={check} disabled={!available.includes('check')}>Check</button>
          <button onClick={call} disabled={!available.includes('call')}>Call</button>
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
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>Sim hands: <input type="number" value={simHands} onChange={(e) => setSimHands(parseInt(e.target.value||'0'))} /></label>
        <button onClick={() => sim.run({ hands: simHands, seats: table.seats.length, startingStack: 200 }, (d,t)=>setSimProgress({done:d,total:t}), ()=>setSimProgress(null))}>Run Sim</button>
        {simProgress && <span>Progress: {simProgress.done}/{simProgress.total}</span>}
      </div>
    </div>
  )
}


