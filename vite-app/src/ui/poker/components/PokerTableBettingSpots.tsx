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

        // Use betting spot layout if available, otherwise derive from stack position
        let left: string | number
        let top: string | number

        if (spotLayout?.left !== undefined && spotLayout?.top !== undefined) {
          left = spotLayout.left
          top = spotLayout.top
        } else if (stackLayout?.left !== undefined && stackLayout?.top !== undefined) {
          // Position betting spot above the stack
          const stackLeft = typeof stackLayout.left === 'string' ? parseInt(stackLayout.left) : stackLayout.left
          const stackTop = typeof stackLayout.top === 'string' ? parseInt(stackLayout.top) : stackLayout.top
          left = stackLeft
          top = stackTop - 60 // 60px above the stack
        } else if (potLayout?.left !== undefined && potLayout?.top !== undefined) {
          // Fallback to pot position
          const potLeft = typeof potLayout.left === 'string' ? parseInt(potLayout.left) : potLayout.left
          const potTop = typeof potLayout.top === 'string' ? parseInt(potLayout.top) : potLayout.top
          left = potLeft + (seatIndex * 40) // Spread out horizontally
          top = potTop - 80 // Above the pot
        } else {
          // Ultimate fallback
          left = 150 + (seatIndex * 180)
          top = 120 + (seatIndex * 100) - 60
        }

        return (
          <BettingSpot
            key={`bet-${seatIndex}`}
            seatIndex={seatIndex}
            amount={seat.committedThisStreet}
            position={{ left, top }}
            editLayout={editLayout}
            dragSystem={dragSystem}
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
  dragSystem 
}: {
  seatIndex: number
  amount: number
  position: { left: string | number; top: string | number }
  editLayout?: boolean
  dragSystem: any
}) {
  const spotRef = useRef<HTMLDivElement>(null)
  const [currentPosition, setCurrentPosition] = useState(position)

  // Update position when prop changes
  useEffect(() => {
    setCurrentPosition(position)
  }, [position])

  // Register with drag system
  useEffect(() => {
    if (dragSystem && spotRef.current && editLayout) {
      const draggable = {
        id: `bet-${seatIndex}`,
        type: 'bet' as const,
        element: spotRef.current,
        priority: 4, // Lower priority than other components
        getLayout: () => {
          // Get the current layout from the drag system, fallback to local state
          const currentLayout = dragSystem.getCurrentLayout?.() || {}
          return currentLayout.bets?.[seatIndex] || currentPosition
        },
        setLayout: (newLayout: any) => {
          // Update visual position in real-time during drag
          setCurrentPosition(newLayout)
        }
      }
      
      dragSystem.registerDraggable(draggable)
      
      return () => {
        dragSystem.unregisterDraggable(`bet-${seatIndex}`)
      }
    }
  }, [dragSystem, editLayout, seatIndex, currentPosition])

  // Sync with drag system layout updates
  useEffect(() => {
    if (dragSystem && editLayout) {
      const currentLayout = dragSystem.getCurrentLayout?.()
      if (currentLayout?.bets?.[seatIndex]) {
        setCurrentPosition(currentLayout.bets[seatIndex])
      }
    }
  }, [dragSystem, editLayout, seatIndex])

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
        zIndex: 6, // Above stacks but below pot
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
          // Disabled glow to reduce GPU/CPU while idle
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
        // Removed pulsing animation
      >
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ 
            duration: 0.3,
            ease: "easeOut",
            delay: 0.1
          }}
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
          transition={{ 
            duration: 0.2,
            delay: 0.2
          }}
          style={{ 
            fontSize: '11px', 
            color: 'rgba(255,255,255,0.8)', 
            fontWeight: 500,
            textShadow: '0 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          ${amount}
        </motion.span>
      </motion.div>
    </motion.div>
  )
}
