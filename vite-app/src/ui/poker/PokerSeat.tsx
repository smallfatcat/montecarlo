import type { CSSProperties } from 'react'
import type { SeatState } from '../../poker/types'
import { PokerSeatDealerButton } from './components/PokerSeatDealerButton'
import { PokerSeatCards } from './components/PokerSeatCards'
import { PokerSeatInfo } from './components/PokerSeatInfo'
import { PokerSeatStack } from './components/PokerSeatStack'
import { PokerSeatEquity } from './components/PokerSeatEquity'
import { PokerSeatResult } from './components/PokerSeatResult'
import { PokerSeatControls } from './components/PokerSeatControls'
import { Card } from '../components/Card'
import './PokerSeat.css'

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

  const isYourSeat = (mySeatIndex != null) && (mySeatIndex === seatIndex)
  const isCurrentToAct = seatIndex === currentToAct
  
  // Determine seat variant based on state
  const getSeatVariant = () => {
    if (isCurrentToAct) return 'interactive'
    if (isYourSeat) return 'elevated'
    return 'default'
  }

  // Determine seat className based on state
  const getSeatClassName = () => {
    const classes = ['poker-seat']
    if (isCurrentToAct) classes.push('poker-seat--current-action')
    if (isYourSeat) classes.push('poker-seat--my-seat')
    if (seat.hasFolded) classes.push('poker-seat--folded')
    if (seat.isAllIn) classes.push('poker-seat--all-in')
    if (seat.isCPU) classes.push('poker-seat--cpu')
    return classes.join(' ')
  }

  return (
    <Card
      id={`${idPrefix}-${seatIndex}`}
      variant={getSeatVariant()}
      padding="sm"
      className={getSeatClassName()}
      style={containerStyle}
    >
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
      

    </Card>
  )
}


