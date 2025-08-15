import { motion } from 'framer-motion'
import type { PokerTableState } from '../../../poker/types'
import { PokerSeat } from '../PokerSeat'

export interface PokerTableSeatsProps {
  table: PokerTableState
  revealed: { holeCounts: number[]; boardCount: number }
  hideHoleCardsUntilShowdown: boolean
  onSitHere?: (seatIndex: number) => void
  mySeatIndex?: number | null
  playerNames?: Array<string | null>
  highlightSet?: Set<string>
  layoutOverrides: any
  // Equity and results data
  equity?: { winPct: number[]; tiePct: number[]; running: boolean } | null
  winnersSet?: Set<number>
  showdownText?: string
}

export function PokerTableSeats({
  table,
  revealed,
  hideHoleCardsUntilShowdown,
  onSitHere,
  mySeatIndex,
  playerNames,
  highlightSet,
  layoutOverrides,
  equity,
  winnersSet,
  showdownText,
}: PokerTableSeatsProps) {
  const renderSeats = () => {
    // Always render all seats, regardless of their state
    const seatsToRender = table.seats.map((seat, seatIndex) => {
      const isHighlighted = highlightSet && Array.from(highlightSet).some(h => h.startsWith(`S${seatIndex}-`))

      const layoutOverride = layoutOverrides.seats[seatIndex]
      
      // Provide fallback positioning if layout override is not yet loaded
      const position = layoutOverride || {
        left: `${100 + (seatIndex * 180)}px`,
        top: `${50 + (seatIndex * 100)}px`,
        width: '160px',
        height: '140px'
      }
      
      return (
        <motion.div
          key={seatIndex}
          initial={{ opacity: 1, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: seatIndex * 0.05 }}
          style={{
            position: 'absolute',
            left: position.left,
            top: position.top,
            width: position.width,
            height: position.height,
            zIndex: 10,
          }}
        >
          <PokerSeat
            idPrefix="poker-seat"
            seat={seat}
            seatIndex={seatIndex}
            buttonIndex={table.buttonIndex}
            currentToAct={table.currentToAct}
            highlightSet={isHighlighted ? highlightSet || new Set() : new Set()}
            displayName={playerNames?.[seatIndex] ?? undefined}
            visibleHoleCount={revealed.holeCounts[seatIndex]}
            forceFaceDown={hideHoleCardsUntilShowdown && seatIndex !== mySeatIndex}
            canControlSeat={true}
            onSitHere={onSitHere}
            mySeatIndex={mySeatIndex}
            containerStyle={{}}
            hideStackRow={true}
            equity={equity}
            winnersSet={winnersSet}
            showdownText={showdownText}
          />
        </motion.div>
      )
    })
    
    return seatsToRender
  }

  return (
    <div 
      className="poker-table-seats" 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%'
      }}
    >
      {renderSeats()}
    </div>
  )
}
