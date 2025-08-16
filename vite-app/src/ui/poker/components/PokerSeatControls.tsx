export interface PokerSeatControlsProps {
  seatIndex: number
  isCPU: boolean
  canControlSeat: boolean
  mySeatIndex?: number | null
  onSitHere?: (seatIndex: number) => void
  idPrefix: string
}

export function PokerSeatControls({ 
  seatIndex, 
  isCPU, 
  canControlSeat, 
  mySeatIndex, 
  onSitHere, 
  idPrefix 
}: PokerSeatControlsProps) {
  if (!canControlSeat) return null
  if (!isCPU || mySeatIndex != null) return null

  return (
    <div id={`${idPrefix}-controls-${seatIndex}`} style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6 }}>
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
    </div>
  )
}
