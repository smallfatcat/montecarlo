import { Fragment } from 'react'

export interface PokerSeatEquityProps {
  seatIndex: number
  hasFolded: boolean
  holeLength: number
  equity?: { winPct: number[]; tiePct: number[]; running: boolean } | null
  showPerSeatEquity?: boolean
  equityWinPct?: number | null
  equityTiePct?: number | null
  equityRunning?: boolean
  idPrefix: string
}

const EQUITY_LINE_HEIGHT_PX = 24

export function PokerSeatEquity({ 
  seatIndex, 
  hasFolded, 
  holeLength, 
  equity, 
  showPerSeatEquity, 
  equityWinPct, 
  equityTiePct, 
  equityRunning, 
  idPrefix 
}: PokerSeatEquityProps) {
  // Calculate equity percentages from the equity data
  const calculatedEquityWinPct = equity?.winPct?.[seatIndex] ?? equityWinPct
  const calculatedEquityTiePct = equity?.tiePct?.[seatIndex] ?? equityTiePct
  const calculatedEquityRunning = equity?.running ?? equityRunning

  // Determine if we should show equity (show if we have data and hand is active)
  const shouldShowEquity = (equity && !hasFolded && holeLength === 2) || showPerSeatEquity

  if (!shouldShowEquity) return null

  return (
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
      {(calculatedEquityWinPct != null && calculatedEquityTiePct != null && !hasFolded && holeLength === 2) ? (
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
  )
}
