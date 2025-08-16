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
  reservedExpiresAtMs?: number | null
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
  idPrefix,
  reservedExpiresAtMs = null,
}: PokerSeatInfoProps) {
  let reservedText: string | null = null
  if (typeof reservedExpiresAtMs === 'number' && isFinite(reservedExpiresAtMs)) {
    const now = Date.now()
    const secs = Math.max(0, Math.ceil((reservedExpiresAtMs - now) / 1000))
    reservedText = secs > 0 ? ` · Rejoining in ${secs}s` : null
  }
  return (
    <div id={`${idPrefix}-label-${seatIndex}`} style={{ textAlign: 'center', fontSize: 12, opacity: 0.9 }}>
      {displayName ?? (isCPU ? `CPU ${seatIndex}` : `Player ${seatIndex}`)}
      {seatIndex === buttonIndex ? ' (BTN)' : ''}
      {seatIndex === currentToAct ? ' → ACT NOW' : ''}
      {hasFolded ? ' · Folded' : ''}
      {isAllIn ? ' · All-in' : ''}
      {mySeatIndex === seatIndex ? ' · You' : ''}
      {reservedText ?? ''}
    </div>
  )
}
