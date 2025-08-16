import type { CSSProperties } from 'react'
import type { SeatState } from '../../poker/types'
import {
  PokerSeatDealerButton,
  PokerSeatCards,
  PokerSeatInfo,
  PokerSeatStack,
  PokerSeatEquity,
  PokerSeatResult,
  PokerSeatControls
} from './components'

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
  // Drag system
  dragSystem?: any
  reservedExpiresAtMs?: number | null
}

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
    reservedExpiresAtMs = null,
  } = props

  const outline = seatIndex === currentToAct ? '2px solid #ffd54f' : undefined
  const isYourSeat = (mySeatIndex != null) && (mySeatIndex === seatIndex)
  const glow = isYourSeat ? '0 0 10px rgba(43, 168, 116, 0.8), 0 0 18px rgba(255,213,79,0.5)' : undefined

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
      <PokerSeatDealerButton
        seatIndex={seatIndex}
        buttonIndex={buttonIndex}
        idPrefix={idPrefix}
      />
      
      <PokerSeatCards
        seatIndex={seatIndex}
        handId={handId}
        seatCardScale={seatCardScale}
        hole={seat.hole}
        hasFolded={seat.hasFolded}
        highlightSet={highlightSet}
        visibleHoleCount={visibleHoleCount}
        forceFaceDown={forceFaceDown}
        idPrefix={idPrefix}
      />
      
      <PokerSeatInfo
        seatIndex={seatIndex}
        buttonIndex={buttonIndex}
        currentToAct={currentToAct}
        hasFolded={seat.hasFolded}
        isAllIn={seat.isAllIn}
        isCPU={seat.isCPU}
        displayName={props.displayName}
        mySeatIndex={mySeatIndex}
        idPrefix={idPrefix}
        reservedExpiresAtMs={reservedExpiresAtMs}
      />
      
      <PokerSeatStack
        seatIndex={seatIndex}
        stack={seat.stack}
        hideStackRow={hideStackRow}
        idPrefix={idPrefix}
      />
      
      <PokerSeatEquity
        seatIndex={seatIndex}
        hasFolded={seat.hasFolded}
        holeLength={seat.hole.length}
        equity={equity}
        showPerSeatEquity={showPerSeatEquity}
        equityWinPct={equityWinPct}
        equityTiePct={equityTiePct}
        equityRunning={equityRunning}
        idPrefix={idPrefix}
      />
      
      <PokerSeatResult
        seatIndex={seatIndex}
        hasFolded={seat.hasFolded}
        holeLength={seat.hole.length}
        resultText={resultText}
        showdownText={showdownText}
        winnersSet={winnersSet}
        idPrefix={idPrefix}
      />
      
      <PokerSeatControls
        seatIndex={seatIndex}
        isCPU={seat.isCPU}
        canControlSeat={canControlSeat}
        mySeatIndex={mySeatIndex}
        onSitHere={onSitHere}
        idPrefix={idPrefix}
      />
    </div>
  )
}


