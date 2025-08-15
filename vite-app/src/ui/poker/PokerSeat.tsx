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
  displayName?: string
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
  // hide stack row inside seat container (for external placement)
  hideStackRow?: boolean
  // seating controls
  canControlSeat?: boolean
  onSitHere?: (seatIndex: number) => void
  mySeatIndex?: number | null
  // Equity and results data
  equity?: { winPct: number[]; tiePct: number[]; running: boolean } | null
  winnersSet?: Set<number>
  showdownText?: string
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
    hideStackRow = false,
    canControlSeat = false,
    onSitHere,
    mySeatIndex = null,
    equity,
    winnersSet,
    showdownText,
  } = props

  // Calculate equity percentages from the equity data
  const calculatedEquityWinPct = equity?.winPct?.[seatIndex] ?? equityWinPct
  const calculatedEquityTiePct = equity?.tiePct?.[seatIndex] ?? equityTiePct
  const calculatedEquityRunning = equity?.running ?? equityRunning

  // Calculate result text from winners set and showdown text
  const calculatedResultText = (() => {
    if (resultText) return resultText
    if (!showdownText || !winnersSet) return null
    
    if (seat.hasFolded) return 'Folded'
    if (winnersSet.has(seatIndex)) return 'Winner'
    if (seat.hole.length === 2) return 'Lost'
    return null
  })()

  // Determine if we should show equity (show if we have data and hand is active)
  const shouldShowEquity = (equity && !seat.hasFolded && seat.hole.length === 2) || showPerSeatEquity

  const outline = seatIndex === currentToAct ? '2px solid #ffd54f' : undefined
  const isYourSeat = (mySeatIndex != null) && (mySeatIndex === seatIndex)
  const glow = isYourSeat ? '0 0 10px rgba(43, 168, 116, 0.8), 0 0 18px rgba(255,213,79,0.5)' : undefined
  const scaledCardHeight = Math.ceil(CARD_HEIGHT_PX * seatCardScale) + 2

  // Enhanced styling for current action
  const currentActionStyle = seatIndex === currentToAct ? {
    boxShadow: '0 0 15px rgba(255, 213, 79, 0.8), 0 0 25px rgba(255, 213, 79, 0.4)',
    border: '2px solid #ffd54f',
    background: 'rgba(255, 213, 79, 0.1)'
  } : {}

  const baseStyle: CSSProperties = {
    position: 'relative',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 12,
    padding: 6,
    background: 'rgba(0,0,0,0.18)',
    outline,
    outlineOffset: 2,
    boxShadow: glow,
    // width intentionally not set; pass via containerStyle if needed (horseshoe)
    ...currentActionStyle
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
        {props.displayName ?? (seat.isCPU ? `CPU ${seatIndex}` : `Player ${seatIndex}`)}
        {seatIndex === buttonIndex ? ' (BTN)' : ''}
        {seatIndex === currentToAct ? ' → ACT NOW' : ''}
        {seat.hasFolded ? ' · Folded' : ''}
        {seat.isAllIn ? ' · All-in' : ''}
        {mySeatIndex === seatIndex ? ' · You' : ''}
      </div>
      {!hideStackRow && (
        <div id={`${idPrefix}-stack-${seatIndex}`} style={{ textAlign: 'center', fontSize: 12, opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span>Stack:</span>
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <ChipStack amount={seat.stack} />
            <span style={{ opacity: 0.9 }}>{seat.stack}</span>
          </div>
        </div>
      )}
      {/* <div id={`${idPrefix}-bets-${seatIndex}`} style={{ textAlign: 'center', fontSize: 12, opacity: 0.9 }}> */}
        {/* <span style={{ marginRight: 6 }}>In pot:</span>
        <ChipStack amount={seat.totalCommitted} />
        <span style={{ marginLeft: 6, opacity: 0.9 }}>({seat.totalCommitted})</span> */}
      {/* </div> */}
      {shouldShowEquity && (
        <div id={`${idPrefix}-equity-${seatIndex}`} style={{ 
          textAlign: 'center', 
          fontSize: '11px', 
          opacity: 0.9, 
          minHeight: EQUITY_LINE_HEIGHT_PX,
          padding: '2px 6px',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.2)',
          marginTop: '2px'
        }}>
          {(calculatedEquityWinPct != null && calculatedEquityTiePct != null && !seat.hasFolded && seat.hole.length === 2) ? (
            <Fragment>
              <span style={{ color: '#4caf50', fontWeight: 600 }}>{calculatedEquityWinPct.toFixed(1)}% win</span>
              <span style={{ margin: '0 4px', opacity: 0.7 }}>•</span>
              <span style={{ color: '#ff9800', fontWeight: 600 }}>{calculatedEquityTiePct.toFixed(1)}% tie</span>
              {calculatedEquityRunning ? <span style={{ marginLeft: '4px', opacity: 0.8, color: '#2196f3' }}>(calculating...)</span> : ''}
            </Fragment>
          ) : calculatedEquityRunning ? (
            <span style={{ color: '#2196f3', fontWeight: 600 }}>Calculating equity...</span>
          ) : ''}
        </div>
      )}
      <div
        id={`${idPrefix}-result-${seatIndex}`}
        style={{ 
          textAlign: 'center', 
          minHeight: RESULT_LINE_HEIGHT_PX, 
          fontWeight: 700, 
          fontSize: '12px',
          padding: '2px 8px',
          marginTop: '2px',
          borderRadius: '6px',
          background: calculatedResultText === 'Winner' ? 'rgba(255,215,79,0.2)' : 
                     calculatedResultText === 'Folded' ? 'rgba(244,67,54,0.2)' : 
                     calculatedResultText === 'Lost' ? 'rgba(158,158,158,0.2)' : 'transparent',
          border: calculatedResultText === 'Winner' ? '1px solid rgba(255,215,79,0.5)' : 
                  calculatedResultText === 'Folded' ? '1px solid rgba(244,67,54,0.5)' : 
                  calculatedResultText === 'Lost' ? '1px solid rgba(158,158,158,0.5)' : 'transparent',
          color: calculatedResultText === 'Winner' ? '#ffd54f' : 
                 calculatedResultText === 'Folded' ? '#f44336' : 
                 calculatedResultText === 'Lost' ? '#9e9e9e' : 'inherit'
        }}
      >
        {calculatedResultText || ''}
      </div>
      {canControlSeat && (
        <div id={`${idPrefix}-controls-${seatIndex}`} style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6 }}>
          {seat.isCPU && mySeatIndex == null ? (
            <button 
              onClick={() => onSitHere?.(seatIndex)} 
              style={{ 
                fontSize: 12, 
                padding: '6px 12px',
                background: 'rgba(76, 175, 80, 0.9)',
                border: '1px solid rgba(76, 175, 80, 0.7)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(76, 175, 80, 1)'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(76, 175, 80, 0.9)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
              }}
              title="Click to sit at this seat"
            >
              🪑 Sit here
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}


