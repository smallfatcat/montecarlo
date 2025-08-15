import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { PokerTableState } from '../../../poker/types'
import { PokerSeat } from '../PokerSeat'
import { useDragSystem } from './PokerTableLayout'

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
  // Edit layout props
  editLayout?: boolean
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
  editLayout,
}: PokerTableSeatsProps) {
  const renderSeats = () => {
    // Always render all seats, regardless of their state
    const seatsToRender = table.seats.map((seat, seatIndex) => {
      const layoutOverride = layoutOverrides?.seats?.[seatIndex]
      
      // Provide fallback positioning if layout override is not yet loaded
      const position = layoutOverride || {
        left: `${100 + (seatIndex * 180)}px`,
        top: `${50 + (seatIndex * 100)}px`,
        width: '160px',
        height: '140px'
      }
      
      // Ensure position has valid values
      if (!position.left || !position.top || !position.width || !position.height) {
        console.warn(`Invalid seat layout for seat ${seatIndex}:`, position)
        // Use fallback positioning
        position.left = `${100 + (seatIndex * 180)}px`
        position.top = `${50 + (seatIndex * 100)}px`
        position.width = '160px'
        position.height = '140px'
      }

      return (
        <DraggableSeat
          key={`seat-${seatIndex}`}
          seat={seat}
          seatIndex={seatIndex}
          revealed={revealed}
          hideHoleCardsUntilShowdown={hideHoleCardsUntilShowdown}
          onSitHere={onSitHere}
          mySeatIndex={mySeatIndex}
          playerNames={playerNames}
          highlightSet={highlightSet}
          equity={equity}
          winnersSet={winnersSet}
          showdownText={showdownText}
          position={position}
          editLayout={editLayout}
          buttonIndex={table.buttonIndex}
          currentToAct={table.currentToAct}
        />
      )
    })
    
    return seatsToRender
  }

  return (
    <>
      {renderSeats()}
    </>
  )
}

// Individual draggable seat component
function DraggableSeat({
  seat,
  seatIndex,
  revealed,
  hideHoleCardsUntilShowdown,
  onSitHere,
  mySeatIndex,
  playerNames,
  highlightSet,
  equity,
  winnersSet,
  showdownText,
  position,
  editLayout,
  buttonIndex,
  currentToAct,
}: {
  seat: any
  seatIndex: number
  revealed: { holeCounts: number[]; boardCount: number }
  hideHoleCardsUntilShowdown: boolean
  onSitHere?: (seatIndex: number) => void
  mySeatIndex?: number | null
  playerNames?: Array<string | null>
  highlightSet?: Set<string>
  equity?: { winPct: number[]; tiePct: number[]; running: boolean } | null
  winnersSet?: Set<number>
  showdownText?: string
  position: any
  editLayout?: boolean
  buttonIndex: number
  currentToAct: number | null
}) {
  const seatRef = useRef<HTMLDivElement>(null)
  const dragSystem = useDragSystem()
  const [currentPosition, setCurrentPosition] = useState(position)

  // Update position when prop changes
  useEffect(() => {
    setCurrentPosition(position)
  }, [position])

  // Register with drag system
  useEffect(() => {
    if (dragSystem && seatRef.current && editLayout) {
      const draggable = {
        id: `seat-${seatIndex}`,
        type: 'seat' as const,
        element: seatRef.current,
        priority: 7, // High priority for seats
        getLayout: () => currentPosition,
        setLayout: (newLayout: any) => {
          // Update visual position in real-time during drag
          setCurrentPosition(newLayout)
        }
      }
      
      dragSystem.registerDraggable(draggable)
      
      return () => {
        dragSystem.unregisterDraggable(`seat-${seatIndex}`)
      }
    }
  }, [dragSystem, editLayout, seatIndex, currentPosition])

  const isHighlighted = highlightSet && Array.from(highlightSet).some(h => h.startsWith(`S${seatIndex}-`))
  const displayName = playerNames?.[seatIndex] || `Seat ${seatIndex + 1}`

  return (
    <motion.div
      ref={seatRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: seatIndex * 0.1 }}
      style={{
        position: 'absolute',
        left: currentPosition.left,
        top: currentPosition.top,
        width: currentPosition.width,
        height: currentPosition.height,
        cursor: editLayout ? 'move' : 'default',
        border: editLayout ? '2px dashed rgba(255,255,255,0.3)' : 'none',
        borderRadius: editLayout ? '8px' : '0',
        padding: editLayout ? '4px' : '0',
        zIndex: 10, // High z-index for seats
      }}
    >
      <PokerSeat
        idPrefix="seat"
        seat={seat}
        seatIndex={seatIndex}
        buttonIndex={buttonIndex}
        currentToAct={currentToAct}
        highlightSet={isHighlighted ? highlightSet : new Set()}
        displayName={displayName}
        equity={equity}
        winnersSet={winnersSet}
        showdownText={showdownText}
        canControlSeat={!!onSitHere}
        onSitHere={onSitHere}
        mySeatIndex={mySeatIndex}
        visibleHoleCount={revealed.holeCounts[seatIndex] || 0}
        forceFaceDown={hideHoleCardsUntilShowdown && seatIndex !== mySeatIndex}
        hideStackRow={true} // Hide stack row since we have separate stack components
      />
    </motion.div>
  )
}
