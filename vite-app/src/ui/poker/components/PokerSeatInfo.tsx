import { memo, useEffect, useState } from 'react'

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

function PokerSeatInfoBase({ 
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
  const [remaining, setRemaining] = useState<number | null>(null)
  useEffect(() => {
    if (typeof reservedExpiresAtMs !== 'number' || !isFinite(reservedExpiresAtMs)) { setRemaining(null); return }
    const calc = () => {
      const secs = Math.max(0, Math.ceil((reservedExpiresAtMs - Date.now()) / 1000))
      setRemaining(secs > 0 ? secs : null)
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [reservedExpiresAtMs])
  return (
    <div id={`${idPrefix}-label-${seatIndex}`} style={{ textAlign: 'center', fontSize: 12, opacity: 0.9 }}>
      {displayName ?? (isCPU ? `CPU ${seatIndex}` : `Player ${seatIndex}`)}
      {seatIndex === buttonIndex ? ' (BTN)' : ''}
      {seatIndex === currentToAct ? ' → ACT NOW' : ''}
      {hasFolded ? ' · Folded' : ''}
      {isAllIn ? ' · All-in' : ''}
      {mySeatIndex === seatIndex ? ' · You' : ''}
      {remaining != null ? ` · Rejoining in ${remaining}s` : ''}
    </div>
  )
}

export const PokerSeatInfo = memo(PokerSeatInfoBase)
