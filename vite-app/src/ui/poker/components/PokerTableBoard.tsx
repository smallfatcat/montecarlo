import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { PokerTableState } from '../../../poker/types'
import { Card3D } from '../../components/Card3D'
import { CONFIG } from '../../../config'
import { useDragSystem } from './PokerTableLayout'
import './PokerTableBoard.css'

export interface PokerTableBoardProps {
  table: PokerTableState
  revealed: { holeCounts: number[]; boardCount: number }
  highlightSet?: Set<string>
  layoutOverride?: any
  // Edit layout props
  editLayout?: boolean
}

export function PokerTableBoard({ table, revealed, highlightSet, layoutOverride, editLayout }: PokerTableBoardProps) {
  const { horseshoe } = CONFIG.poker
  const { boardOffsetY } = horseshoe
  const boardGapPx = 8 // Tighter spacing between board cards
  const boardRef = useRef<HTMLDivElement>(null)
  const dragSystem = useDragSystem()
  const [currentPosition, setCurrentPosition] = useState(layoutOverride || {})

  // Update position when prop changes
  useEffect(() => {
    setCurrentPosition(layoutOverride || {})
  }, [layoutOverride])

  // Register with drag system
  useEffect(() => {
    if (dragSystem && boardRef.current && editLayout) {
      const draggable = {
        id: 'board',
        type: 'board' as const,
        element: boardRef.current,
        priority: 8, // High priority for board
        getLayout: () => currentPosition,
        setLayout: (newLayout: any) => {
          // Update visual position in real-time during drag
          setCurrentPosition(newLayout)
        }
      }
      
      dragSystem.registerDraggable(draggable)
      
      return () => {
        dragSystem.unregisterDraggable('board')
      }
    }
  }, [dragSystem, editLayout, currentPosition])

  const renderBoardCards = () => {
    if (!table.community || table.community.length === 0) return null

    return table.community.map((card, cardIndex) => {
      const isHighlighted = highlightSet?.has(`B${cardIndex}`) ?? false
      const isRevealed = cardIndex < revealed.boardCount

      return (
        <motion.div
          key={cardIndex}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: cardIndex * 0.1 }}
          style={{
            position: 'absolute',
            left: cardIndex * (96 + boardGapPx), // 96px is card width
            top: boardOffsetY,
          }}
        >
          <Card3D
            card={card}
            faceDown={!isRevealed}
            index={cardIndex}
            highlight={isHighlighted}
          />
        </motion.div>
      )
    })
  }

  return (
    <div 
      ref={boardRef}
      className={`poker-table-board ${editLayout ? 'poker-table-board--edit-mode' : ''}`}
      style={{
        position: 'absolute',
        left: currentPosition.left ?? '50%',
        top: currentPosition.top ?? '50%',
        transform: currentPosition.left ? 'none' : 'translate(-50%, -50%)',
        display: 'flex',
        gap: boardGapPx,
        alignItems: 'center',
        justifyContent: 'center',
        width: currentPosition.width,
        height: currentPosition.height,
        zIndex: 15, // High z-index for board
      }}
    >
      <AnimatePresence>
        {renderBoardCards()}
      </AnimatePresence>
    </div>
  )
}
