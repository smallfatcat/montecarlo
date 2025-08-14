import { motion, AnimatePresence } from 'framer-motion'
import type { PokerTableState } from '../../../poker/types'
import { Card3D } from '../../components/Card3D'
import { CONFIG } from '../../../config'

export interface PokerTableBoardProps {
  table: PokerTableState
  revealed: { holeCounts: number[]; boardCount: number }
  highlightSet?: Set<string>
  layoutOverride?: any
}

export function PokerTableBoard({ table, revealed, highlightSet, layoutOverride }: PokerTableBoardProps) {
  const { horseshoe } = CONFIG.poker
  const { boardOffsetY } = horseshoe
  const boardGapPx = 8 // Tighter spacing between board cards

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
      className="poker-table-board"
      style={{
        position: 'absolute',
        left: layoutOverride?.left ?? '50%',
        top: layoutOverride?.top ?? '50%',
        transform: layoutOverride?.left ? 'none' : 'translate(-50%, -50%)',
        display: 'flex',
        gap: boardGapPx,
        alignItems: 'center',
        justifyContent: 'center',
        width: layoutOverride?.width,
        height: layoutOverride?.height,
      }}
    >
      <AnimatePresence>
        {renderBoardCards()}
      </AnimatePresence>
    </div>
  )
}
