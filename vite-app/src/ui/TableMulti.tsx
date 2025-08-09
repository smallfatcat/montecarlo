import React, { useMemo, useState } from 'react'
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion'
import { useTableGame } from './useTableGame'
import { evaluateHand } from '../blackjack'
import type { Card } from '../blackjack'
import { Card3D } from './components/Card3D'

export function TableMulti() {
  const {
    table,
    bankroll,
    setBankroll,
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
  } = useTableGame()

  const [bet, setBet] = useState(10)
  const [decks, setDecks] = useState(deckCount)

  const seats = table.seats
  const activeSeat = table.activeSeatIndex
  const revealed = table.status !== 'seat_turn'

  return (
    <div>
      <div className="controls">
        <div className="bankroll">Bankroll: ${bankroll}</div>
        <label>Bet: $ <input type="number" value={bet} min={1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBet(parseInt(e.target.value || '0'))} /></label>
        <button onClick={() => deal(bet)} disabled={!(table.status === 'idle' || table.status === 'round_over')}>Deal</button>
        <span className="sep" />
        <label>Shoe decks: <input type="number" value={decks} min={1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDecks(parseInt(e.target.value || '1'))} /></label>
        <button onClick={() => newShoe(decks)}>New Shoe</button>
        <button onClick={() => setBankroll(100)}>Reset Bankroll</button>
        <span className="cards-left">Cards left: {table.deck?.length ?? 0}</span>
      </div>

      <LayoutGroup>
        <section className="hands">
          <div className="hand">
            <div className="hand-header">
              <h2>Dealer</h2>
              <span className={`hand-total ${revealed && dealerEval.isBust ? 'is-bust' : revealed && dealerEval.isBlackjack ? 'is-bj' : ''}`}>{revealed ? handTotalLabel(dealerEval) : ''}</span>
            </div>
            <div className="cards">
              <AnimatePresence initial={false}>
                {table.dealerHand.map((c: Card, i: number) => (
                  <motion.div layoutId={`dealer-${c.rank}-${c.suit}-${i}`} key={`dealer-${c.rank}-${c.suit}-${i}`} className="card-slot">
                    <Card3D card={c} faceDown={!revealed && i === 1} index={i} />
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
            <div className={`hand ${table.status === 'seat_turn' && seatIdx === activeSeat ? 'hand--active' : ''}`} key={`seat-${seatIdx}`}>
              <div className="hand-header">
                <h2>{seatIdx === 0 ? 'Player' : `CPU ${seatIdx}`}</h2>
                {seat.hands.length > 1 ? (
                  <span className="hand-index">Hand {activeIdxForSeat + 1}/{seat.hands.length}</span>
                ) : null}
                {seatIdx === 0 && table.status === 'seat_turn' && activeSeat === 0 && suggested ? (
                  <span className="suggest-badge">Suggest: {String(suggested).toUpperCase()}</span>
                ) : null}
                <span className={`hand-total ${activeEval.isBust ? 'is-bust' : activeEval.isBlackjack ? 'is-bj' : activeEval.isSoft ? 'is-soft' : ''}`}>{handTotalLabel(activeEval)}</span>
                {activeOutcome ? <span className={`outcome-badge ${mapOutcome(activeOutcome).kind}`}>{mapOutcome(activeOutcome).text}</span> : null}
              </div>
              {seat.hands.map((hand, hi) => {
                const hv = evaluateHand(hand)
                const outcome = seat.outcomes?.[hi]
                return (
                  <div key={`seat-${seatIdx}-hand-${hi}`}>
                    <div className="cards">
                    <AnimatePresence initial={false}>
                      {hand.map((c, j) => (
                        <motion.div layoutId={`seat-${seatIdx}-${hi}-${c.rank}-${c.suit}-${j}`} key={`seat-${seatIdx}-${hi}-${c.rank}-${c.suit}-${j}`} className="card-slot">
                          <Card3D card={c} index={j} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    </div>
                  </div>
                )
              })}
            </div>
          )})}
        </section>
      </LayoutGroup>

      <div className="actions">
        <button onClick={hit} disabled={!(table.status === 'seat_turn' && activeSeat === 0 && available.includes('hit'))}>Hit</button>
        <button onClick={stand} disabled={!(table.status === 'seat_turn' && activeSeat === 0 && available.includes('stand'))}>Stand</button>
        <button onClick={double} disabled={!(table.status === 'seat_turn' && activeSeat === 0 && available.includes('double'))}>Double</button>
        <button onClick={split} disabled={!(table.status === 'seat_turn' && activeSeat === 0 && available.includes('split'))}>Split</button>
        <label className="auto-play">
          <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} /> Auto play
        </label>
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


