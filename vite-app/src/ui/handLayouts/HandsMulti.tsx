// React import not needed with react-jsx runtime
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion'
import { evaluateHand } from '../../blackjack'
import type { Card } from '../../blackjack'
import { Card3D } from '../components/Card3D'

export function HandsMulti({ table, roundId, bankrolls, suggested }: { table: any; roundId: number; bankrolls: number[]; suggested: string | null }) {
  const seats = table.seats
  const activeSeat = table.activeSeatIndex
  const revealed = table.status !== 'seat_turn'
  const dealerEval = evaluateHand(table.dealerHand)

  return (
    <LayoutGroup key={roundId}>
      <section className="hands" id="hands">
        <div className="hand" id="dealer-hand">
          <div className="hand-header" id="dealer-hand-header">
            <h2 id="dealer-title">Dealer</h2>
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

        {seats.map((seat: any, seatIdx: number) => {
          const activeIdxForSeat = seat.activeHandIndex
          const activeHandForSeat = seat.hands[activeIdxForSeat] ?? []
          const activeEval = evaluateHand(activeHandForSeat)
          const activeOutcome = seat.outcomes?.[activeIdxForSeat]
          return (
            <div className={`hand ${table.status === 'seat_turn' && seatIdx === activeSeat ? 'hand--active' : ''}`} key={`seat-${seatIdx}`} id={`seat-${seatIdx}`}>
              <div className="hand-header" id={`seat-${seatIdx}-header`}>
                <h2 id={`seat-${seatIdx}-name`}>{seatIdx === 0 ? 'Player' : `CPU ${seatIdx}`}</h2>
                <span className="seat-bankroll" id={`seat-${seatIdx}-bankroll`}>${bankrolls[seatIdx] ?? 0}</span>
                {seat.hands.length > 1 ? (
                  <span className="hand-index" id={`seat-${seatIdx}-hand-index`}>Hand {activeIdxForSeat + 1}/{seat.hands.length}</span>
                ) : null}
                {seatIdx === 0 && table.status === 'seat_turn' && activeSeat === 0 && suggested ? (
                  <span className="suggest-badge" id="suggest-badge">Suggest: {String(suggested).toUpperCase()}</span>
                ) : null}
                <span className={`hand-total ${activeEval.isBust ? 'is-bust' : activeEval.isBlackjack ? 'is-bj' : activeEval.isSoft ? 'is-soft' : ''}`} id={`seat-${seatIdx}-total`}>{handTotalLabel(activeEval)}</span>
                {activeOutcome ? <span className={`outcome-badge ${mapOutcome(activeOutcome).kind}`} id={`seat-${seatIdx}-outcome`}>{mapOutcome(activeOutcome).text}</span> : null}
              </div>
              {seat.hands.map((hand: Card[], hi: number) => (
                <div key={`seat-${seatIdx}-hand-${hi}`} id={`seat-${seatIdx}-hand-${hi}`}>
                  <div className="cards" id={`seat-${seatIdx}-cards-${hi}`}>
                    <AnimatePresence initial={true} mode="popLayout">
                      {hand.map((c: Card, j: number) => (
                        <motion.div layoutId={`seat-${roundId}-${seatIdx}-${hi}-${c.rank}-${c.suit}-${j}`} key={`seat-${roundId}-${seatIdx}-${hi}-${c.rank}-${c.suit}-${j}`} className="card-slot">
                          <Card3D card={c} index={j} enterFromTop />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </section>
    </LayoutGroup>
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


