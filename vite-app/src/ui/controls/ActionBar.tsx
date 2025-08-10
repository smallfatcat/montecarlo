import React from 'react'

export function ActionBar(props: {
  table: { status: string; activeSeatIndex: number }
  available: Array<'hit'|'stand'|'double'|'split'>
  deal: (bet: number) => void
  hit: () => void
  stand: () => void
  double: () => void
  split: () => void
  autoPlay: boolean
  setAutoPlay: (b: boolean) => void
  bet: number
  setBet: (n: number) => void
}) {
  const { table, available, deal, hit, stand, double, split, autoPlay, setAutoPlay, bet, setBet } = props
  const canConfig = table.status === 'idle' || table.status === 'round_over'
  const canAct = table.status === 'seat_turn' && table.activeSeatIndex === 0
  return (
    <div className="actions">
      <label>Bet: $ <input type="number" value={bet} min={1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBet(Math.max(1, Math.floor(parseInt(e.target.value || '1'))))} /></label>
      <button id="deal-button" onClick={() => deal(bet)} disabled={!canConfig}>Deal</button>
      <button onClick={hit} disabled={!(canAct && available.includes('hit'))}>Hit</button>
      <button onClick={stand} disabled={!(canAct && available.includes('stand'))}>Stand</button>
      <button onClick={double} disabled={!(canAct && available.includes('double'))}>Double</button>
      <button onClick={split} disabled={!(canAct && available.includes('split'))}>Split</button>
      <label className="auto-play">
        <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} /> Auto play
      </label>
    </div>
  )
}


