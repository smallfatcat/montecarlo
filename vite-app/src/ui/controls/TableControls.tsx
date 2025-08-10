import React from 'react'
import { CONFIG } from '../../config'

export function TableControls(props: {
  bankrolls: number[]
  setBankrolls: React.Dispatch<React.SetStateAction<number[]>>
  numPlayers: number
  setPlayers: (n: number) => void
  deckCount: number
  setDecks: (n: number) => void
  newShoe: (decks: number) => void
  handsPerRun: number
  setHandsPerRun: (n: number) => void
  casinoBank?: number
  table: { status: string; deck?: unknown[] }
  histories: unknown[]
  rules: typeof CONFIG.rules
  updateRules: (partial: Partial<typeof CONFIG.rules>) => void
  sim: { run: () => void; progress: { done: number; total: number } | null }
  rightExtras?: React.ReactNode
}) {
  const {
    bankrolls,
    setBankrolls,
    numPlayers,
    setPlayers,
    deckCount,
    setDecks,
    newShoe,
    handsPerRun,
    setHandsPerRun,
    table,
    histories,
    rules,
    updateRules,
    sim,
    casinoBank,
    rightExtras,
  } = props

  return (
    <>
      <div className="controls" id="controls" style={{ display: 'flex', gap: CONFIG.layout.flat.controlsGapPx, alignItems: 'center', marginBottom: 0 }}>
        <div className="bankroll" id="player-bankroll">Bankroll: ${bankrolls[0] ?? 0}</div>
        <label htmlFor="players-input">Players: <input id="players-input" type="number" value={numPlayers} min={CONFIG.table.minPlayers} max={CONFIG.table.maxPlayers} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayers(parseInt(e.target.value || '1'))} disabled={!(table.status === 'idle' || table.status === 'round_over')} /></label>
        <label htmlFor="decks-input">Shoe decks: <input id="decks-input" type="number" value={deckCount} min={1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDecks(parseInt(e.target.value || '1') as number)} /></label>
        <button id="new-shoe-button" onClick={() => newShoe(deckCount)}>New Shoe</button>
        <label htmlFor="hands-input">Hands to simulate: <input id="hands-input" type="number" value={handsPerRun} min={1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHandsPerRun(Math.max(1, Math.floor(parseInt(e.target.value || '1'))))} /></label>
        <button id="reset-bankroll-button" onClick={() => setBankrolls(bankrolls.map(() => CONFIG.bankroll.initialPerSeat))}>Reset Bankrolls</button>
        <span className="cards-left" id="cards-left">Cards left: {((table.deck as any)?.length) ?? 0}</span>
        {typeof casinoBank === 'number' ? <span className="casino-bank" id="casino-bank">Casino Bank: ${casinoBank}</span> : null}
        <span className="sep" />
        <button id="simulate-button" onClick={() => sim.run()} disabled={!!sim.progress}>Simulate</button>
        {sim.progress ? (<span id="sim-progress" style={{ marginLeft: CONFIG.layout.multi.progressMarginLeftPx, opacity: 0.9 }}>Running {sim.progress.done}/{sim.progress.total}</span>) : null}
        <span className="sep" />
        <button id="log-history-button" onClick={() => console.log('Table histories', histories)}>Log History</button>
        {rightExtras}
      </div>

      <details style={{ margin: `${CONFIG.layout.multi.detailsMarginTopPx}px 0 ${CONFIG.layout.multi.detailsMarginBottomPx}px` }}>
        <summary>Rules</summary>
        <div style={{ display: 'flex', gap: CONFIG.layout.multi.rulesGapPx, alignItems: 'center', flexWrap: 'wrap', marginTop: CONFIG.layout.multi.rulesMarginTopPx }}>
          <label title="Dealer hits soft 17">
            <input type="checkbox" defaultChecked={rules.dealerHitsSoft17} onChange={(e) => updateRules({ dealerHitsSoft17: e.target.checked })} /> H17 (dealer hits soft 17)
          </label>
          <label title="Blackjack payout multiplier">
            BJ Payout:
            <select defaultValue={String(rules.blackjackPayout)} onChange={(e) => updateRules({ blackjackPayout: Number(e.target.value) })}>
              <option value="1.5">3:2</option>
              <option value="1.2">6:5</option>
              <option value="1.0">1:1</option>
            </select>
          </label>
          <label title="Restrict double to totals; leave blank for any">
            Double totals (csv):
            <input style={{ width: CONFIG.layout.multi.doubleTotalsInputWidthPx }} placeholder="10,11" onBlur={(e) => {
              const vals = e.target.value.trim()
              const totals = vals ? vals.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n)) : []
              updateRules({ doubleTotals: totals })
            }} />
          </label>
          <label title="Double after split allowed">
            <input type="checkbox" defaultChecked={rules.doubleAfterSplit} onChange={(e) => updateRules({ doubleAfterSplit: e.target.checked })} /> DAS
          </label>
          <label title="Restrict pair ranks (csv); blank = allow all">
            Split ranks:
            <input style={{ width: CONFIG.layout.multi.splitRanksInputWidthPx }} placeholder="A,8" onBlur={(e) => {
              const vals = e.target.value.trim()
              const ranks = vals ? vals.split(',').map(s => s.trim().toUpperCase() as any).filter(Boolean) : null
              updateRules({ allowSplitRanks: ranks })
            }} />
          </label>
        </div>
      </details>
    </>
  )
}


