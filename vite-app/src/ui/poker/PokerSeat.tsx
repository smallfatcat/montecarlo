import { Fragment } from 'react'
import type { CSSProperties } from 'react'
import { Card3D } from '../components/Card3D'
import { ChipStack } from '../components/ChipStack'
// import { CONFIG } from '../../config'
import type { SeatState } from '../../poker/types'

export interface PokerSeatProps {
  idPrefix: string
  seat: SeatState
  seatIndex: number
  handId?: number
  buttonIndex: number
  currentToAct: number | null
  highlightSet: Set<string>
  // Equity display options
  showPerSeatEquity?: boolean
  equityWinPct?: number | null
  equityTiePct?: number | null
  equityRunning?: boolean
  // Hand result text e.g. 'Winner' | 'Folded' | 'Lost'
  resultText?: string | null
  // Visuals
  seatCardScale?: number // default 1.0
  containerStyle?: CSSProperties
  // reveal control
  visibleHoleCount?: number // 0..2
  // force face-down regardless of visible count
  forceFaceDown?: boolean
}

const CARD_HEIGHT_PX = 140
const EQUITY_LINE_HEIGHT_PX = 24
const RESULT_LINE_HEIGHT_PX = 24

export function PokerSeat(props: PokerSeatProps) {
  const {
    idPrefix,
    seat,
    seatIndex,
    handId,
    buttonIndex,
    currentToAct,
    highlightSet,
    showPerSeatEquity = false,
    equityWinPct = null,
    equityTiePct = null,
    equityRunning = false,
    resultText = null,
    seatCardScale = 1,
    containerStyle,
    visibleHoleCount = 2,
    forceFaceDown = false,
  } = props

  const outline = seatIndex === currentToAct ? '2px solid #ffd54f' : undefined
  const scaledCardHeight = Math.ceil(CARD_HEIGHT_PX * seatCardScale) + 2

  const baseStyle: CSSProperties = {
    position: 'relative',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 12,
    padding: 6,
    background: 'rgba(0,0,0,0.18)',
    outline,
    outlineOffset: 2,
    // width intentionally not set; pass via containerStyle if needed (horseshoe)
  }

  return (
    <div id={`${idPrefix}-${seatIndex}`} style={{ ...baseStyle, ...containerStyle }}>
      {seatIndex === buttonIndex && (
        <div
          id={`${idPrefix}-dealer-${seatIndex}`}
          title="Dealer Button"
          style={{
            position: 'absolute',
            bottom: 6,
            left: 6,
            width: 20,
            height: 20,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontSize: 12,
            fontWeight: 800,
            background: '#ffd54f',
            color: '#1a1a1a',
            boxShadow: '0 1px 6px rgba(0,0,0,0.4)',
            border: '1px solid rgba(0,0,0,0.3)',
            zIndex: 2
          }}
        >
          D
        </div>
      )}
      <div
        id={`${idPrefix}-cards-${seatIndex}`}
        style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', height: scaledCardHeight }}
      >
        {!seat.hasFolded && seat.hole.slice(0, 2).map((c, k) => (
          <div key={`${handId ?? 'H'}-${seatIndex}-${k}-${c.rank}-${c.suit}`} style={{ transform: `scale(${seatCardScale})`, transformOrigin: 'center' }}>
            <Card3D card={c as any} highlight={highlightSet.has(`S${seatIndex}-${k}`)} faceDown={forceFaceDown || k >= (visibleHoleCount ?? 2)} />
          </div>
        ))}
      </div>
      <div id={`${idPrefix}-label-${seatIndex}`} style={{ textAlign: 'center', fontSize: 12, opacity: 0.9 }}>
        Seat {seatIndex}{seatIndex === buttonIndex ? ' (BTN)' : ''}{seat.hasFolded ? ' · Folded' : ''}{seat.isAllIn ? ' · All-in' : ''}
      </div>
      <div id={`${idPrefix}-stack-${seatIndex}`} style={{ textAlign: 'center', fontSize: 12, opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <span>Stack:</span>
        <ChipStack amount={seat.stack} />
        <span style={{ opacity: 0.9 }}>({seat.stack})</span>
      </div>
      {/* <div id={`${idPrefix}-bets-${seatIndex}`} style={{ textAlign: 'center', fontSize: 12, opacity: 0.9 }}> */}
        {/* <span style={{ marginRight: 6 }}>In pot:</span>
        <ChipStack amount={seat.totalCommitted} />
        <span style={{ marginLeft: 6, opacity: 0.9 }}>({seat.totalCommitted})</span> */}
      {/* </div> */}
      {showPerSeatEquity && (
        <div id={`${idPrefix}-equity-${seatIndex}`} style={{ textAlign: 'center', fontSize: 12, opacity: 0.85, minHeight: EQUITY_LINE_HEIGHT_PX }}>
          {(equityWinPct != null && equityTiePct != null && !seat.hasFolded && seat.hole.length === 2) ? (
            <Fragment>
              {equityWinPct.toFixed(1)}% win • {equityTiePct.toFixed(1)}% tie {equityRunning ? ' (…)' : ''}
            </Fragment>
          ) : ''}
        </div>
      )}
      <div
        id={`${idPrefix}-result-${seatIndex}`}
        style={{ textAlign: 'center', minHeight: RESULT_LINE_HEIGHT_PX, fontWeight: 700, color: resultText === 'Winner' ? '#ffd54f' : undefined }}
      >
        {resultText || ''}
      </div>
    </div>
  )
}


