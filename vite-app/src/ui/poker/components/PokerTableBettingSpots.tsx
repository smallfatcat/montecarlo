import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ChipStack } from '../../components/ChipStack'
import { CONFIG } from '../../../config'
import type { PokerTableState } from '../../../poker/types'
import { useDragSystem } from './PokerTableLayout'

export interface PokerTableBettingSpotsProps {
  table: PokerTableState
  layoutOverrides: any
  // Edit layout props
  editLayout?: boolean
}

export function PokerTableBettingSpots({ table, layoutOverrides, editLayout }: PokerTableBettingSpotsProps) {
  const dragSystem = useDragSystem()

  const renderBettingSpots = () => {
    if (!table.seats) return []

    return table.seats
      .filter(seat => seat.committedThisStreet > 0)
      .map((seat) => {
        const seatIndex = seat.seatIndex
        const spotLayout = layoutOverrides.bets?.[seatIndex]
        const stackLayout = layoutOverrides.stacks?.[seatIndex]
        const potLayout = layoutOverrides.pot

        if (!spotLayout && !stackLayout && !potLayout) {
          console.warn(`No layout found for betting spot at seat ${seatIndex}`)
          return null
        }

        const num = (v: any, fallback: number = 0): number => {
          if (typeof v === 'number') return v
          if (typeof v === 'string') { const n = parseInt(v, 10); return Number.isFinite(n) ? n : fallback }
          return fallback
        }

        // Resolve spot position
        let left = num(spotLayout?.left, num(stackLayout?.left, 150 + (seatIndex * 180)))
        let top = num(spotLayout?.top, num(stackLayout?.top, 120 + (seatIndex * 100)) - 60)
        const width = num(spotLayout?.width, 100)
        const height = num(spotLayout?.height, 40)

        // Entry deltas from stack
        const stackLeftNum = num(stackLayout?.left, left)
        const stackTopNum = num(stackLayout?.top, top + 60)
        const deltaX = left - stackLeftNum
        const deltaY = top - stackTopNum

        // Exit deltas to pot
        const potLeftNum = num(potLayout?.left, left)
        const potTopNum = num(potLayout?.top, top - 80)
        const potWidth = num(potLayout?.width, 0)
        const potHeight = num(potLayout?.height, 0)
        const betCenterX = left + width / 2
        const betCenterY = top + height / 2
        const potCenterX = potLeftNum + (potWidth ? potWidth / 2 : 0)
        const potCenterY = potTopNum + (potHeight ? potHeight / 2 : 0)
        const potDeltaX = potCenterX - betCenterX
        const potDeltaY = potCenterY - betCenterY

        return (
          <BettingSpot
            key={`bet-${seatIndex}`}
            seatIndex={seatIndex}
            amount={seat.committedThisStreet}
            position={{ left, top, width, height }}
            editLayout={editLayout}
            dragSystem={dragSystem}
            entry={{ x: -deltaX, y: -deltaY }}
            exit={{ x: potDeltaX, y: potDeltaY }}
          />
        )
      })
      .filter(Boolean)
  }

  return (
    <AnimatePresence mode="popLayout">
      {renderBettingSpots()}
    </AnimatePresence>
  )
}

// Individual betting spot component
function BettingSpot({ 
  seatIndex, 
  amount, 
  position, 
  editLayout, 
  dragSystem,
  entry,
  exit,
}: {
  seatIndex: number
  amount: number
  position: { left: number; top: number; width?: number; height?: number }
  editLayout?: boolean
  dragSystem: any
  entry: { x: number; y: number }
  exit: { x: number; y: number }
}) {
  const spotRef = useRef<HTMLDivElement>(null)
  const [currentPosition, setCurrentPosition] = useState(position)

  // Update position when prop changes
  useEffect(() => {
    setCurrentPosition(position)
  }, [position.left, position.top, position.width, position.height])

  // Register with drag system
  useEffect(() => {
    if (dragSystem && spotRef.current && editLayout) {
      const draggable = {
        id: `bet-${seatIndex}`,
        type: 'bet' as const,
        element: spotRef.current,
        priority: 4,
        getLayout: () => ({ left: currentPosition.left, top: currentPosition.top, width: currentPosition.width, height: currentPosition.height }),
        setLayout: (newLayout: any) => setCurrentPosition(newLayout),
      }
      dragSystem.registerDraggable(draggable)
      return () => { dragSystem.unregisterDraggable(`bet-${seatIndex}`) }
    }
  }, [dragSystem, editLayout, seatIndex, currentPosition])

  return (
    <motion.div
      ref={spotRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: seatIndex * 0.05 }}
      style={{
        position: 'absolute',
        left: currentPosition.left,
        top: currentPosition.top,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 6,
        cursor: editLayout ? 'move' : 'default',
        border: editLayout ? '2px dashed rgba(255,255,255,0.3)' : 'none',
        borderRadius: editLayout ? '8px' : '0',
        padding: editLayout ? '4px' : '0',
      }}
    >
      <motion.div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 2,
          padding: '4px 8px',
          borderRadius: '8px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
        initial={{ opacity: 0, scale: 0.8, x: entry.x, y: entry.y }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, x: exit.x, y: exit.y }}
        transition={{ duration: CONFIG.poker.animations?.chipFlyDurationMs ? CONFIG.poker.animations.chipFlyDurationMs / 1000 : 0.15, ease: 'easeOut' }}
      >
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
        >
          <ChipStack
            amount={amount}
            size={CONFIG.poker.chipIconSizePx}
            overlap={CONFIG.poker.chipOverlap}
            maxChipsPerRow={CONFIG.poker.maxChipsPerRow}
          />
        </motion.div>
        <motion.span 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
          style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
        >
          ${amount}
        </motion.span>
      </motion.div>
    </motion.div>
  )
}
