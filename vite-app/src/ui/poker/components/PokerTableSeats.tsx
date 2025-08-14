import { motion } from 'framer-motion'
import type { PokerTableState } from '../../../poker/types'
import { PokerSeat } from '../PokerSeat'

export interface PokerTableSeatsProps {
  table: PokerTableState
  revealed: { holeCounts: number[]; boardCount: number }
  hideHoleCardsUntilShowdown: boolean
  onSitHere?: (seatIndex: number) => void
  onLeaveSeat?: (seatIndex: number) => void
  mySeatIndex?: number | null
  playerNames?: Array<string | null>
  highlightSet?: Set<string>
  layoutOverrides: any
}

export function PokerTableSeats({
  table,
  revealed,
  hideHoleCardsUntilShowdown,
  onSitHere,
  onLeaveSeat,
  mySeatIndex,
  playerNames,
  highlightSet,
  layoutOverrides,
}: PokerTableSeatsProps) {
  const renderSeats = () => {
    return table.seats.map((seat, seatIndex) => {
      if (seat.isCPU && !seat.hole.length) return null

      const isHighlighted = highlightSet && Array.from(highlightSet).some(h => h.startsWith(`S${seatIndex}-`))

      const layoutOverride = layoutOverrides.seats[seatIndex]
      return (
        <motion.div
          key={seatIndex}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: seatIndex * 0.1 }}
          style={{
            position: 'absolute',
            left: layoutOverride?.left,
            top: layoutOverride?.top,
            width: layoutOverride?.width,
            height: layoutOverride?.height,
          }}
        >
                      <PokerSeat
              idPrefix="poker-seat"
              seat={seat}
              seatIndex={seatIndex}
              buttonIndex={0}
              currentToAct={null}
              highlightSet={isHighlighted ? highlightSet || new Set() : new Set()}
              displayName={playerNames?.[seatIndex] ?? undefined}
              visibleHoleCount={revealed.holeCounts[seatIndex]}
              forceFaceDown={hideHoleCardsUntilShowdown && seatIndex !== mySeatIndex}
              canControlSeat={true}
              onSitHere={onSitHere}
              onLeaveSeat={onLeaveSeat}
              mySeatIndex={mySeatIndex}
              containerStyle={{}}
              hideStackRow={true}
            />
        </motion.div>
      )
    })
  }

  return (
    <div className="poker-table-seats" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {renderSeats()}
    </div>
  )
}
