import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ChipStack } from '../../components/ChipStack'
import { CONFIG } from '../../../config'
import type { PokerTableState } from '../../../poker/types'
import { useDragSystem } from './PokerTableLayout'

export interface PokerTablePotProps {
  table: PokerTableState
  showdownText?: string
  layoutOverride?: any
  // Edit layout props
  editLayout?: boolean
}

export function PokerTablePot({ table, showdownText, layoutOverride, editLayout }: PokerTablePotProps) {
  const { horseshoe } = CONFIG.poker
  const { potOffsetY, showdownOffsetY } = horseshoe
  const potRef = useRef<HTMLDivElement>(null)
  const dragSystem = useDragSystem()
  const [currentPosition, setCurrentPosition] = useState(layoutOverride || {})

  // Update position when prop changes
  useEffect(() => {
    setCurrentPosition(layoutOverride || {})
  }, [layoutOverride])

  // Register with drag system
  useEffect(() => {
    if (dragSystem && potRef.current && editLayout) {
      const draggable = {
        id: 'pot',
        type: 'pot' as const,
        element: potRef.current,
        priority: 9, // Very high priority for pot
        getLayout: () => currentPosition,
        setLayout: (newLayout: any) => {
          // Update visual position in real-time during drag
          setCurrentPosition(newLayout)
        }
      }
      
      dragSystem.registerDraggable(draggable)
      
      return () => {
        dragSystem.unregisterDraggable('pot')
      }
    }
  }, [dragSystem, editLayout, currentPosition])

  return (
    <div 
      ref={potRef}
      className="poker-table-pot"
      style={{
        position: 'absolute',
        left: currentPosition.left ?? '50%',
        top: currentPosition.top ?? '50%',
        transform: currentPosition.left ? 'none' : 'translate(-50%, -50%)',
        marginTop: currentPosition.top ? 0 : potOffsetY,
        textAlign: 'center',
        width: currentPosition.width,
        height: currentPosition.height,
        cursor: editLayout ? 'move' : 'default',
        border: editLayout ? '2px dashed rgba(255,255,255,0.3)' : 'none',
        borderRadius: editLayout ? '8px' : '0',
        padding: editLayout ? '8px' : '0',
        zIndex: 20, // Very high z-index for pot
      }}
    >
      {/* Main Pot */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="pot-display"
      >
        <div className="pot-label">Pot</div>
        <motion.div
          key={`pot-${table.pot.main}`}
          initial={{ scale: 1.2, rotate: 5 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            duration: CONFIG.poker.animations?.chipFlyDurationMs ? CONFIG.poker.animations.chipFlyDurationMs / 1000 : 0.15,
            ease: "easeOut"
          }}
          whileHover={{ scale: 1.05 }}
          style={{
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '12px',
            background: 'rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <ChipStack
            amount={table.pot.main}
            size={CONFIG.poker.chipIconSizePx}
            maxChipsPerRow={CONFIG.poker.maxChipsPerRow}
            overlap={CONFIG.poker.chipOverlap}
          />
        </motion.div>
        <motion.div
          key={`pot-amount-${table.pot.main}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.2,
            delay: 0.1
          }}
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 600,
            marginTop: '4px',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 8px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          ${table.pot.main}
        </motion.div>
      </motion.div>

      {/* Showdown Text */}
      {showdownText && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="showdown-text"
          style={{
            position: 'absolute',
            top: showdownOffsetY,
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          {showdownText}
        </motion.div>
      )}
    </div>
  )
}
