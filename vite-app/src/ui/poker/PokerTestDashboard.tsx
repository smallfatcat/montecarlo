import { useState } from 'react'
import { createInitialPokerTable, startHand, applyAction } from '../../poker/flow'
import type { PokerTableState } from '../../poker/types'
import { suggestActionPoker } from '../../poker/strategy'

export function PokerTestDashboard() {
  const [seats, setSeats] = useState(6)
  const [stack, setStack] = useState(100)
  const [sb, setSb] = useState(1)
  const [bb, setBb] = useState(2)
  const [hands, setHands] = useState(200)
  const [result, setResult] = useState<{ hands: number; avgPot: number; busts: number; gameOver: boolean } | null>(null)

  const run = () => {
    let t: PokerTableState = createInitialPokerTable(seats, Array.from({ length: Math.max(0, seats - 1) }, (_, i) => i + 1), stack)
    t.rules.smallBlind = sb
    t.rules.bigBlind = bb
    let totalPot = 0
    let totalBusts = 0
    let played = 0
    for (let h = 0; h < hands && !t.gameOver; h += 1) {
      const beforeStacks = t.seats.map((s) => s.stack)
      t = startHand(t)
      let guard = 8000
      while (t.status === 'in_hand' && guard-- > 0) {
        t = applyAction(t, suggestActionPoker(t, 'tight'))
      }
      const pot = t.seats.reduce((sum, s) => sum + s.totalCommitted, 0)
      const afterStacks = t.seats.map((s) => s.stack)
      for (let i = 0; i < beforeStacks.length; i += 1) {
        if (beforeStacks[i] > 0 && afterStacks[i] === 0) totalBusts += 1
      }
      totalPot += pot
      played += 1
    }
    setResult({ hands: played, avgPot: totalPot / Math.max(1, played), busts: totalBusts, gameOver: !!t.gameOver })
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {/* Navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{ margin: 0, color: '#fff' }}>Poker Test Dashboard</h2>
        <a 
          href="#poker-layout-editor"
          style={{
            padding: '8px 16px',
            background: '#4CAF50',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          🎯 Layout Editor
        </a>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>Seats <input type="number" min={2} max={9} value={seats} onChange={(e)=>setSeats(parseInt(e.target.value||'0'))} /></label>
        <label>Stack <input type="number" min={1} value={stack} onChange={(e)=>setStack(parseInt(e.target.value||'0'))} /></label>
        <label>SB <input type="number" min={1} value={sb} onChange={(e)=>setSb(parseInt(e.target.value||'0'))} /></label>
        <label>BB <input type="number" min={1} value={bb} onChange={(e)=>setBb(parseInt(e.target.value||'0'))} /></label>
        <label>Hands <input type="number" min={1} value={hands} onChange={(e)=>setHands(parseInt(e.target.value||'0'))} /></label>
        <button onClick={run}>Run</button>
      </div>
      {result && (
        <div>
          <div>Hands played: {result.hands}</div>
          <div>Avg pot: {Math.round(result.avgPot)}</div>
          <div>Busts: {result.busts}</div>
          <div>Game over: {String(result.gameOver)}</div>
        </div>
      )}
    </div>
  )
}


