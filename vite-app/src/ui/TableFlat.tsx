import React, { useRef, useState } from 'react'
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion'
import { useTableGame } from './useTableGame'
import { evaluateHand } from '../blackjack'
import type { Card } from '../blackjack'
import { Card3D } from './components/Card3D'
import { CONFIG } from '../config'

export function TableFlat() {
  const {
    table,
    bankrolls,
    setBankrolls,
    roundId,
    available,
    deal,
    newShoe,
    hit,
    stand,
    double,
    split,
    autoPlay,
    setAutoPlay,
    numPlayers,
    setPlayers,
    deckCount,
    histories,
  } = useTableGame()

  const [bet, setBet] = useState<number>(CONFIG.bets.defaultPerSeat)
  const [decks, setDecks] = useState(deckCount)
  const [handsPerRun, setHandsPerRun] = useState<number>(CONFIG.simulation.handsPerRun)
  const [simProgress, setSimProgress] = useState<{done: number; total: number} | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const seats = table.seats
  const revealed = table.status !== 'seat_turn'
  const activeSeat = table.activeSeatIndex
  const controlsRef = useRef<HTMLDivElement | null>(null)

  return (
    <div id="table-flat" style={{ position: 'relative', minHeight: `${CONFIG.layout.flat.containerMinHeightVh}vh`, paddingTop: CONFIG.layout.flat.containerPaddingTopPx, paddingBottom: CONFIG.layout.flat.containerPaddingBottomPx }}>
      {/* Controls (same as multi view) */}
      <div className="controls" id="controls" ref={controlsRef} style={{ display: 'flex', gap: CONFIG.layout.flat.controlsGapPx, alignItems: 'center', marginBottom: 0 }}>
        <div className="bankroll" id="player-bankroll">Bankroll: ${bankrolls[0] ?? 0}</div>
        <label htmlFor="players-input">Players: <input id="players-input" type="number" value={numPlayers} min={CONFIG.table.minPlayers} max={CONFIG.table.maxPlayers} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayers(parseInt(e.target.value || '1'))} disabled={!(table.status === 'idle' || table.status === 'round_over')} /></label>
        <label htmlFor="decks-input">Shoe decks: <input id="decks-input" type="number" value={decks} min={1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDecks(parseInt(e.target.value || '1') as number)} /></label>
        <button id="new-shoe-button" onClick={() => newShoe(decks)}>New Shoe</button>
        <button id="reset-bankroll-button" onClick={() => setBankrolls(bankrolls.map(() => CONFIG.bankroll.initialPerSeat))}>Reset Bankrolls</button>
        <span className="cards-left" id="cards-left">Cards left: {table.deck?.length ?? 0}</span>
        <span className="sep" />
        <label htmlFor="hands-input">Hands to simulate: <input id="hands-input" type="number" value={handsPerRun} min={1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHandsPerRun(Math.max(1, Math.floor(parseInt(e.target.value || '1'))))} /></label>
        <button id="simulate-button" onClick={() => {
          if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null }
          setSimProgress({ done: 0, total: handsPerRun })
          const worker = new Worker(new URL('../workers/simWorker.ts', import.meta.url), { type: 'module' })
          workerRef.current = worker
          worker.onmessage = (e: MessageEvent) => {
            const data = e.data as any
            if (data?.type === 'progress') setSimProgress({ done: data.completed, total: data.total })
            else if (data?.type === 'done') { setSimProgress(null); setBankrolls(data.result.finalBankrolls); }
            else if (data?.type === 'error') { console.error('Simulation error', data.error); setSimProgress(null) }
          }
          worker.postMessage({ type:'run', options: { numHands: handsPerRun, numPlayers, deckCount: decks, reshuffleCutoffRatio: CONFIG.shoe.reshuffleCutoffRatio, initialBankrolls: bankrolls, casinoInitial: CONFIG.bankroll.casinoInitial, betsBySeat: Array.from({ length: numPlayers }, () => bet), rules: CONFIG.rules } })
        }}>Simulate</button>
        {simProgress ? (<span id="sim-progress" style={{ opacity: 0.9 }}>Running {simProgress.done}/{simProgress.total}</span>) : null}
        <button id="log-history-button" onClick={() => console.log('Table histories', histories)}>Log History</button>
      </div>

      <LayoutGroup key={roundId}>
        <div id="dealer-lane" style={{ display: 'flex', gap: CONFIG.layout.flat.dealerLaneGapPx, justifyContent: 'center', marginTop: CONFIG.layout.flat.dealerLaneMarginTopPx }}>
          <AnimatePresence initial mode="popLayout">
            {table.dealerHand.map((c: Card, i: number) => (
              <motion.div layoutId={`dealer-${roundId}-${i}-${c.rank}-${c.suit}`} key={`dealer-${roundId}-${i}-${c.rank}-${c.suit}`}>
                <Card3D card={c} faceDown={!revealed && i === 1} index={i} enterFromTop flat />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {revealed ? (
          <div id="dealer-total" className={`hand-total ${evaluateHand(table.dealerHand).isBust ? 'is-bust' : evaluateHand(table.dealerHand).isBlackjack ? 'is-bj' : evaluateHand(table.dealerHand).isSoft ? 'is-soft' : ''}`} style={{ textAlign: 'center', marginTop: CONFIG.layout.flat.dealerTotalMarginTopPx }}>
            {handTotalLabel(evaluateHand(table.dealerHand))}
          </div>
        ) : null}

        <div id="players-lane" style={{ position: 'absolute', bottom: CONFIG.layout.flat.playersLaneBottomPx, left: CONFIG.layout.flat.edgePaddingPx, right: CONFIG.layout.flat.edgePaddingPx, display: 'flex', gap: CONFIG.layout.flat.playersLaneGapPx, justifyContent: 'center', alignItems: 'flex-end', overflowX: 'auto', paddingBottom: CONFIG.layout.flat.playersLanePaddingBottomPx }}>
          {seats.map((seat, si) => (
            <div key={`seat-${si}`} id={`seat-${si}`} className={`seat ${table.status === 'seat_turn' && activeSeat === si ? 'active' : ''}`} style={{ padding: CONFIG.layout.flat.seatPaddingPx, textAlign: 'center', minWidth: CONFIG.layout.flat.seatMinWidthPx }}>
              <div style={{ fontWeight: 700, opacity: 0.85, marginBottom: CONFIG.layout.flat.seatNameMarginBottomPx }}>{si === 0 ? 'Player' : `CPU ${si}`}</div>
              {seat.hands.map((hand, hi) => {
                const evalResult = evaluateHand(hand)
                const outcome = seat.outcomes?.[hi]
                const outcomeInfo = outcome ? mapOutcome(outcome) : null
                return (
                  <div key={`seat-${si}-hand-${hi}`} id={`seat-${si}-hand-${hi}`} className="hand-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: CONFIG.layout.flat.handRowGapPx, justifyContent: 'center', marginBottom: CONFIG.layout.flat.handRowMarginBottomPx }}>
                    <div style={{ display: 'flex', gap: CONFIG.layout.flat.cardRowGapPx, justifyContent: 'center' }}>
                      <AnimatePresence initial mode="popLayout">
                        {hand.map((c, j) => (
                          <motion.div
                            layoutId={`seat-${roundId}-${si}-${hi}-${c.rank}-${c.suit}-${j}`}
                            key={`seat-${roundId}-${si}-${hi}-${c.rank}-${c.suit}-${j}`}
                            style={{ marginLeft: j === 0 ? 0 : -CONFIG.layout.flatCardOverlapPx, zIndex: j }}
                          >
                            <Card3D card={c} index={j} enterFromTop flat />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    <div style={{ display: 'flex', gap: CONFIG.layout.flat.infoRowGapPx, alignItems: 'center' }}>
                      <span className={`hand-total ${evalResult.isBust ? 'is-bust' : evalResult.isBlackjack ? 'is-bj' : evalResult.isSoft ? 'is-soft' : ''}`}>
                        {handTotalLabel(evalResult)}
                      </span>
                      {outcomeInfo ? (
                        <span className={`outcome-badge ${outcomeInfo.kind}`}>{outcomeInfo.text}</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </LayoutGroup>

      <div id="flat-actions" style={{ position: 'absolute', left: '50%', bottom: CONFIG.layout.flat.actionsBottomPx, transform: 'translateX(-50%)', display: 'flex', gap: CONFIG.layout.flat.actionsGapPx, alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: CONFIG.layout.flat.actionsPaddingPx, borderRadius: CONFIG.layout.flat.actionsBorderRadiusPx }}>
        <label>Bet: $ <input type="number" value={bet} min={1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBet(parseInt(e.target.value || '0'))} /></label>
        <button onClick={() => deal(bet)} disabled={!(table.status === 'idle' || table.status === 'round_over')}>Deal</button>
        <button onClick={hit} disabled={!(table.status === 'seat_turn' && activeSeat === 0 && available.includes('hit'))}>Hit</button>
        <button onClick={stand} disabled={!(table.status === 'seat_turn' && activeSeat === 0 && available.includes('stand'))}>Stand</button>
        <button onClick={double} disabled={!(table.status === 'seat_turn' && activeSeat === 0 && available.includes('double'))}>Double</button>
        <button onClick={split} disabled={!(table.status === 'seat_turn' && activeSeat === 0 && available.includes('split'))}>Split</button>
        <label style={{ marginLeft: CONFIG.layout.flat.actionsBetMarginLeftPx }}><input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} /> Auto</label>
      </div>
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

