export interface PokerSeatDealerButtonProps {
  seatIndex: number
  buttonIndex: number
  idPrefix: string
}

export function PokerSeatDealerButton({ seatIndex, buttonIndex, idPrefix }: PokerSeatDealerButtonProps) {
  if (seatIndex !== buttonIndex) return null

  return (
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
  )
}
