import { useEffect, useRef } from 'react'
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion'
import { evaluateHand } from '../../blackjack'
import type { Card } from '../../blackjack'
import { Card3D } from '../components/Card3D'
import { CONFIG } from '../../config'

export function HandsFlat({ table, roundId }: { table: any; roundId: number }) {
  const seats = table.seats
  const revealed = table.status !== 'seat_turn'
  const activeSeat = table.activeSeatIndex
  const laneRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const recompute = () => {
      const el = laneRef.current
      if (!el) return
      const visibleWidth = el.clientWidth
      const requiredWidth = seats.length * CONFIG.layout.flat.seatMinWidthPx + Math.max(0, seats.length - 1) * CONFIG.layout.flat.playersLaneGapPx
      // If overflow would occur, reduce min seat width gracefully but keep layout stable
      if (requiredWidth > visibleWidth) {
        const dynamicSeatWidth = Math.max(
          CONFIG.layout.flat.seatLowerBoundWidthPx,
          Math.floor((visibleWidth - (Math.max(0, seats.length - 1) * CONFIG.layout.flat.playersLaneGapPx)) / seats.length)
        )
        document.documentElement.style.setProperty('--flat-seat-min-width', `${dynamicSeatWidth}px`)
      } else {
        document.documentElement.style.setProperty('--flat-seat-min-width', `${CONFIG.layout.flat.seatMinWidthPx}px`)
      }
    }
    recompute()
    const el = laneRef.current
    if (!el) return
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [seats.length])
  return (
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

      <div id="players-lane" ref={laneRef} style={{ position: 'absolute', bottom: CONFIG.layout.flat.playersLaneBottomPx, left: CONFIG.layout.flat.edgePaddingPx, right: CONFIG.layout.flat.edgePaddingPx, display: 'flex', gap: CONFIG.layout.flat.playersLaneGapPx, justifyContent: 'center', alignItems: 'flex-end', overflowX: 'hidden', paddingBottom: CONFIG.layout.flat.playersLanePaddingBottomPx, flexWrap: 'nowrap' }}>
        {seats.map((seat: any, si: number) => (
          <div key={`seat-${si}`} id={`seat-${si}`} className={`seat ${table.status === 'seat_turn' && activeSeat === si ? 'active' : ''}`} style={{ padding: CONFIG.layout.flat.seatPaddingPx, textAlign: 'center', minWidth: 'var(--flat-seat-min-width, 240px)' }}>
            <div style={{ fontWeight: 700, opacity: 0.85, marginBottom: CONFIG.layout.flat.seatNameMarginBottomPx }}>{si === 0 ? 'Player' : `CPU ${si}`}</div>
            {seat.hands.map((hand: Card[], hi: number) => {
              const evalResult = evaluateHand(hand)
              const outcome = seat.outcomes?.[hi]
              const outcomeInfo = outcome ? mapOutcome(outcome) : null
              return (
                <div key={`seat-${si}-hand-${hi}`} id={`seat-${si}-hand-${hi}`} className="hand-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: CONFIG.layout.flat.handRowGapPx, justifyContent: 'center', marginBottom: CONFIG.layout.flat.handRowMarginBottomPx }}>
                  <div style={{ display: 'flex', gap: CONFIG.layout.flat.cardRowGapPx, justifyContent: 'center' }}>
                    <AnimatePresence initial mode="popLayout">
                      {hand.map((c: Card, j: number) => (
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


