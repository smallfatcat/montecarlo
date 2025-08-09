import React, { useRef, useState } from 'react'
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion'
import { useTableGame } from './useTableGame'
import { evaluateHand } from '../blackjack'
import type { Card } from '../blackjack'
import { Card3D } from './components/Card3D'
import { CONFIG } from '../config'

export function TableMulti() {
  const {
    table,
    bankrolls,
    setBankrolls,
    casinoBank,
    setCasinoBank,
    numPlayers,
    setPlayers,
    betsBySeat,
    setBetsBySeat,
    roundId,
    deal,
    newShoe,
    hit,
    stand,
    double,
    split,
    available,
    dealerEval,
    deckCount,
    autoPlay,
    setAutoPlay,
    suggested,
    histories,
    updateRules,
  } = useTableGame()

  const [bet, setBet] = useState<number>(CONFIG.bets.defaultPerSeat)
  const [decks, setDecks] = useState(deckCount)
  const [handsPerRun, setHandsPerRun] = useState<number>(CONFIG.simulation.handsPerRun)
  const [simProgress, setSimProgress] = useState<{done: number; total: number} | null>(null)
  const workerRef = useRef<Worker | null>(null)

  const seats = table.seats
  const activeSeat = table.activeSeatIndex
  const revealed = table.status !== 'seat_turn'

  return (
    <div id="table-root">
      <div className="controls" id="controls">
        <div className="bankroll" id="player-bankroll">Bankroll: ${bankrolls[0] ?? 0}</div>
        <label htmlFor="bet-input">Bet: $ <input id="bet-input" type="number" value={bet} min={1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBet(parseInt(e.target.value || '0'))} /></label>
        <label htmlFor="players-input">Players: <input id="players-input" type="number" value={numPlayers} min={1} max={5} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayers(parseInt(e.target.value || '1'))} disabled={!(table.status === 'idle' || table.status === 'round_over')} /></label>
        <span className="sep" />
        <label htmlFor="decks-input">Shoe decks: <input id="decks-input" type="number" value={decks} min={1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDecks(parseInt(e.target.value || '1') as number)} /></label>
        <button id="new-shoe-button" onClick={() => newShoe(decks)}>New Shoe</button>
        <label htmlFor="hands-input">Hands to simulate: <input id="hands-input" type="number" value={handsPerRun} min={1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHandsPerRun(Math.max(1, Math.floor(parseInt(e.target.value || '1'))))} /></label>
        <button id="reset-bankroll-button" onClick={() => setBankrolls(bankrolls.map(() => CONFIG.bankroll.initialPerSeat))}>Reset Bankrolls</button>
        <span className="cards-left" id="cards-left">Cards left: {table.deck?.length ?? 0}</span>
        <span className="sep" />
        <button id="log-history-button" onClick={() => console.log('Table histories', histories)}>Log History</button>
        <span className="sep" />
        <button id="simulate-button" onClick={() => {
          if (workerRef.current) {
            workerRef.current.terminate()
            workerRef.current = null
          }
          setSimProgress({ done: 0, total: handsPerRun })
          const worker = new Worker(new URL('../workers/simWorker.ts', import.meta.url), { type: 'module' })
          workerRef.current = worker
          worker.onmessage = (e: MessageEvent) => {
            const data = e.data as any
            if (data?.type === 'progress') {
              setSimProgress({ done: data.completed, total: data.total })
            } else if (data?.type === 'done') {
              setSimProgress(null)
              setBankrolls(data.result.finalBankrolls)
              setCasinoBank(data.result.finalCasinoBank)
              workerRef.current?.terminate()
              workerRef.current = null
            } else if (data?.type === 'error') {
              console.error('Simulation error', data.error)
              setSimProgress(null)
              workerRef.current?.terminate()
              workerRef.current = null
            }
          }
          worker.postMessage({
            type: 'run',
            options: {
              numHands: handsPerRun,
              numPlayers,
              deckCount,
              reshuffleCutoffRatio: 0.2,
              initialBankrolls: bankrolls,
              casinoInitial: casinoBank,
              betsBySeat,
              rules: CONFIG.rules,
            }
          })
        }}>Simulate</button>
        {simProgress ? (
          <span id="sim-progress" style={{ marginLeft: 8, opacity: 0.9 }}>
            Running {simProgress.done}/{simProgress.total}
          </span>
        ) : null}
      </div>

      <div className="actions">
        <button id="deal-button" onClick={() => deal(bet)} disabled={!(table.status === 'idle' || table.status === 'round_over')}>Deal</button>
        <button onClick={hit} disabled={!(table.status === 'seat_turn' && activeSeat === 0 && available.includes('hit'))}>Hit</button>
        <button onClick={stand} disabled={!(table.status === 'seat_turn' && activeSeat === 0 && available.includes('stand'))}>Stand</button>
        <button onClick={double} disabled={!(table.status === 'seat_turn' && activeSeat === 0 && available.includes('double'))}>Double</button>
        <button onClick={split} disabled={!(table.status === 'seat_turn' && activeSeat === 0 && available.includes('split'))}>Split</button>
        <label className="auto-play">
          <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} /> Auto play
        </label>
      </div>

      <details style={{ margin: '8px 0 16px' }}>
        <summary>Rules</summary>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          <label title="Dealer hits soft 17">
            <input type="checkbox" onChange={(e) => updateRules({ dealerHitsSoft17: e.target.checked })} /> H17 (dealer hits soft 17)
          </label>
          <label title="Blackjack payout multiplier">
            BJ Payout:
            <select defaultValue={String(CONFIG.rules.blackjackPayout)} onChange={(e) => updateRules({ blackjackPayout: Number(e.target.value) })}>
              <option value="1.5">3:2</option>
              <option value="1.2">6:5</option>
              <option value="1.0">1:1</option>
            </select>
          </label>
          <label title="Restrict double to totals; leave blank for any">
            Double totals (csv):
            <input style={{ width: 120 }} placeholder="10,11" onBlur={(e) => {
              const vals = e.target.value.trim()
              const totals = vals ? vals.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n)) : []
              updateRules({ doubleTotals: totals })
            }} />
          </label>
          <label title="Double after split allowed">
            <input type="checkbox" defaultChecked={CONFIG.rules.doubleAfterSplit} onChange={(e) => updateRules({ doubleAfterSplit: e.target.checked })} /> DAS
          </label>
          <label title="Restrict pair ranks (csv); blank = allow all">
            Split ranks:
            <input style={{ width: 140 }} placeholder="A,8" onBlur={(e) => {
              const vals = e.target.value.trim()
              const ranks = vals ? vals.split(',').map(s => s.trim().toUpperCase() as any).filter(Boolean) : null
              updateRules({ allowSplitRanks: ranks })
            }} />
          </label>
        </div>
      </details>

      <LayoutGroup key={roundId}>
        <section className="hands" id="hands">
          <div className="hand" id="dealer-hand">
            <div className="hand-header" id="dealer-hand-header">
              <h2 id="dealer-title">Dealer</h2>
              <span className="casino-bank" id="casino-bank">Casino Bank: ${casinoBank}</span>
              <span id="dealer-total" className={`hand-total ${revealed && dealerEval.isBust ? 'is-bust' : revealed && dealerEval.isBlackjack ? 'is-bj' : ''}`}>{revealed ? handTotalLabel(dealerEval) : ''}</span>
            </div>
            <div className="cards" id="dealer-cards">
              <AnimatePresence initial={true} mode="popLayout">
                {table.dealerHand.map((c: Card, i: number) => (
                  <motion.div layoutId={`dealer-${roundId}-${c.rank}-${c.suit}-${i}`} key={`dealer-${roundId}-${c.rank}-${c.suit}-${i}`} className="card-slot">
                    <Card3D card={c} faceDown={!revealed && i === 1} index={i} enterFromTop />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {seats.map((seat, seatIdx) => {
            const activeIdxForSeat = seat.activeHandIndex
            const activeHandForSeat = seat.hands[activeIdxForSeat] ?? []
            const activeEval = evaluateHand(activeHandForSeat)
            const activeOutcome = seat.outcomes?.[activeIdxForSeat]
            return (
            <div className={`hand ${table.status === 'seat_turn' && seatIdx === activeSeat ? 'hand--active' : ''}`} key={`seat-${seatIdx}`} id={`seat-${seatIdx}`}>
              <div className="hand-header" id={`seat-${seatIdx}-header`}>
                <h2 id={`seat-${seatIdx}-name`}>{seatIdx === 0 ? 'Player' : `CPU ${seatIdx}`}</h2>
                <span className="seat-bankroll" id={`seat-${seatIdx}-bankroll`}>${bankrolls[seatIdx] ?? 0}</span>
                {seatIdx > 0 ? (
                  <label className="seat-bet" id={`seat-${seatIdx}-bet-label`}>
                    Bet: <input
                      id={`seat-${seatIdx}-bet-input`}
                      type="number"
                      min={1}
                      style={{ width: 64 }}
                      value={betsBySeat[seatIdx] ?? 10}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const v = Math.max(1, Math.floor(parseInt(e.target.value || '1')))
                        setBetsBySeat((arr) => arr.map((x, i) => (i === seatIdx ? v : x)))
                      }}
                      disabled={!(table.status === 'idle' || table.status === 'round_over')}
                    />
                  </label>
                ) : null}
                {seat.hands.length > 1 ? (
                  <span className="hand-index" id={`seat-${seatIdx}-hand-index`}>Hand {activeIdxForSeat + 1}/{seat.hands.length}</span>
                ) : null}
                {seatIdx === 0 && table.status === 'seat_turn' && activeSeat === 0 && suggested ? (
                  <span className="suggest-badge" id="suggest-badge">Suggest: {String(suggested).toUpperCase()}</span>
                ) : null}
                <span className={`hand-total ${activeEval.isBust ? 'is-bust' : activeEval.isBlackjack ? 'is-bj' : activeEval.isSoft ? 'is-soft' : ''}`} id={`seat-${seatIdx}-total`}>{handTotalLabel(activeEval)}</span>
                {activeOutcome ? <span className={`outcome-badge ${mapOutcome(activeOutcome).kind}`} id={`seat-${seatIdx}-outcome`}>{mapOutcome(activeOutcome).text}</span> : null}
              </div>
              {seat.hands.map((hand, hi) => (
                <div key={`seat-${seatIdx}-hand-${hi}`} id={`seat-${seatIdx}-hand-${hi}`}>
                  <div className="cards" id={`seat-${seatIdx}-cards-${hi}`}>
                  <AnimatePresence initial={true} mode="popLayout">
                    {hand.map((c, j) => (
                      <motion.div layoutId={`seat-${roundId}-${seatIdx}-${hi}-${c.rank}-${c.suit}-${j}`} key={`seat-${roundId}-${seatIdx}-${hi}-${c.rank}-${c.suit}-${j}`} className="card-slot">
                        <Card3D card={c} index={j} enterFromTop />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )})}
        </section>
      </LayoutGroup>
    </div>
  )
}

function handTotalLabel(v: ReturnType<typeof evaluateHand>): string {
  if (v.isBust) return `Bust (${v.hardTotal})`
  if (v.isBlackjack) return 'Blackjack (21)'
  if (v.isSoft) return `Soft ${v.bestTotal}`
  return `${v.bestTotal}`
}

function mapOutcome(o: string): { text: string; kind: 'win' | 'push' | 'lose' } {
  switch (o) {
    case 'player_blackjack':
    case 'player_win':
    case 'dealer_bust':
      return { text: 'Win', kind: 'win' }
    case 'push':
      return { text: 'Push', kind: 'push' }
    case 'player_bust':
    case 'dealer_win':
    default:
      return { text: 'Lose', kind: 'lose' }
  }
}


