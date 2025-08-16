export interface PokerSeatResultProps {
  seatIndex: number
  hasFolded: boolean
  holeLength: number
  resultText?: string | null
  showdownText?: string
  winnersSet?: Set<number>
  idPrefix: string
}

const RESULT_LINE_HEIGHT_PX = 24

export function PokerSeatResult({ 
  seatIndex, 
  hasFolded, 
  holeLength, 
  resultText, 
  showdownText, 
  winnersSet, 
  idPrefix 
}: PokerSeatResultProps) {
  // Calculate result text from winners set and showdown text
  const calculatedResultText = (() => {
    if (resultText) return resultText
    if (!showdownText || !winnersSet) return null
    
    if (hasFolded) return 'Folded'
    if (winnersSet.has(seatIndex)) return 'Winner'
    if (holeLength === 2) return 'Lost'
    return null
  })()

  if (!calculatedResultText) return null

  return (
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
      {calculatedResultText}
    </div>
  )
}
