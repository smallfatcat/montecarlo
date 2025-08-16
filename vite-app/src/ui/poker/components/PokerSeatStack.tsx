import { ChipStack } from '../../components/ChipStack'

export interface PokerSeatStackProps {
  seatIndex: number
  stack: number
  hideStackRow: boolean
  idPrefix: string
}

export function PokerSeatStack({ seatIndex, stack, hideStackRow, idPrefix }: PokerSeatStackProps) {
  if (hideStackRow) return null

  return (
    <div id={`${idPrefix}-stack-${seatIndex}`} style={{ textAlign: 'center', fontSize: 12, opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <span>Stack:</span>
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <ChipStack amount={stack} />
        <span style={{ opacity: 0.9 }}>{stack}</span>
      </div>
    </div>
  )
}
