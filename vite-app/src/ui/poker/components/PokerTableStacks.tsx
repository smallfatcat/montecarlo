import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ChipStack } from '../../components/ChipStack'
import { CONFIG } from '../../../config'
import type { PokerTableState } from '../../../poker/types'
import { useDragSystem } from './PokerTableLayout'

export interface PokerTableStacksProps {
  table: PokerTableState
  layoutOverrides: any
  // Edit layout props
  editLayout?: boolean
}

export function PokerTableStacks({ table, layoutOverrides, editLayout }: PokerTableStacksProps) {
  const renderStacks = () => {
    // Always render all stack displays, regardless of their state
    const stacksToRender = table.seats.map((seat, seatIndex) => {
      const stackLayout = layoutOverrides.stacks?.[seatIndex]
      
      // Provide fallback positioning if layout override is not yet loaded
      const position = stackLayout || {
        left: `${150 + (seatIndex * 180)}px`,
        top: `${120 + (seatIndex * 100)}px`,
        width: '100px',
        height: '40px'
      }

      return (
        <StackDisplay
          key={`stack-${seatIndex}`}
          seatIndex={seatIndex}
          seat={seat}
          position={position}
          editLayout={editLayout}
        />
      )
    })
    
    return stacksToRender
  }

  return (
    <AnimatePresence mode="popLayout">
      {renderStacks()}
    </AnimatePresence>
  )
}

// Individual stack display component
function StackDisplay({ seatIndex, seat, position, editLayout }: {
  seatIndex: number
  seat: any
  position: any
  editLayout?: boolean
}) {
  const stackRef = useRef<HTMLDivElement>(null)
  const dragSystem = useDragSystem()
  const [currentPosition, setCurrentPosition] = useState(position)

  // Update position when prop changes
  useEffect(() => {
    setCurrentPosition(position)
  }, [position])

  // Register with drag system
  useEffect(() => {
    if (dragSystem && stackRef.current && editLayout) {
      const draggable = {
        id: `stack-${seatIndex}`,
        type: 'stack' as const,
        element: stackRef.current,
        priority: 6, // Medium priority for stacks
        getLayout: () => currentPosition,
        setLayout: (newLayout: any) => {
          // Update visual position in real-time during drag
          setCurrentPosition(newLayout)
        }
      }
      
      dragSystem.registerDraggable(draggable)
      
      return () => {
        dragSystem.unregisterDraggable(`stack-${seatIndex}`)
      }
    }
  }, [dragSystem, editLayout, seatIndex, currentPosition])

  return (
    <motion.div
      ref={stackRef}
      initial={{ opacity: 1, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: seatIndex * 0.05 }}
      style={{
        position: 'absolute',
        left: currentPosition.left,
        top: currentPosition.top,
        width: currentPosition.width,
        height: currentPosition.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        cursor: editLayout ? 'move' : 'default',
        border: editLayout ? '2px dashed rgba(255,255,255,0.3)' : 'none',
        borderRadius: editLayout ? '8px' : '0',
        padding: editLayout ? '4px' : '0',
      }}
    >
      <motion.div
        key={`stack-amount-${seatIndex}-${seat.stack}`}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ 
          duration: CONFIG.poker.animations?.chipFlyDurationMs ? CONFIG.poker.animations.chipFlyDurationMs / 1000 : 0.15,
          ease: "easeOut"
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4
        }}
      >
        <ChipStack
          amount={seat.stack}
          size={30}
          overlap={0.8}
          maxChipsPerRow={20}
        />
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.2,
            delay: 0.1
          }}
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 600,
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            background: 'rgba(0,0,0,0.6)',
            padding: '2px 6px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          ${seat.stack}
        </motion.span>
      </motion.div>
    </motion.div>
  )
}
