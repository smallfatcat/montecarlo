export interface PokerSeatInfoProps {
  seatIndex: number
  buttonIndex: number
  currentToAct: number | null
  hasFolded: boolean
  isAllIn: boolean
  isCPU: boolean
  displayName?: string
  mySeatIndex?: number | null
  idPrefix: string
}

export function PokerSeatInfo({ 
  seatIndex, 
  buttonIndex, 
  currentToAct, 
  hasFolded, 
  isAllIn, 
  isCPU, 
  displayName, 
  mySeatIndex, 
  idPrefix 
}: PokerSeatInfoProps) {
  return (
    <div id={`${idPrefix}-label-${seatIndex}`} style={{ textAlign: 'center', fontSize: 12, opacity: 0.9 }}>
      {displayName ?? (isCPU ? `CPU ${seatIndex}` : `Player ${seatIndex}`)}
      {seatIndex === buttonIndex ? ' (BTN)' : ''}
      {seatIndex === currentToAct ? ' → ACT NOW' : ''}
      {hasFolded ? ' · Folded' : ''}
      {isAllIn ? ' · All-in' : ''}
      {mySeatIndex === seatIndex ? ' · You' : ''}
    </div>
  )
}
