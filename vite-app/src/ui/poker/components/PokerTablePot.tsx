import { motion } from 'framer-motion'
import type { PokerTableState } from '../../../poker/types'
import { ChipStack } from '../../components/ChipStack'
import { CONFIG } from '../../../config'

export interface PokerTablePotProps {
  table: PokerTableState
  showdownText?: string
  layoutOverride?: any
}

export function PokerTablePot({ table, showdownText, layoutOverride }: PokerTablePotProps) {
  const { horseshoe } = CONFIG.poker
  const { potOffsetY, showdownOffsetY } = horseshoe

  return (
    <div 
      className="poker-table-pot"
      style={{
        position: 'absolute',
        left: layoutOverride?.left ?? '50%',
        top: layoutOverride?.top ?? '50%',
        transform: layoutOverride?.left ? 'none' : 'translate(-50%, -50%)',
        marginTop: layoutOverride?.top ? 0 : potOffsetY,
        textAlign: 'center',
        width: layoutOverride?.width,
        height: layoutOverride?.height,
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
        <ChipStack
          amount={table.pot.main}
          size={CONFIG.poker.chipIconSizePx}
          maxChipsPerRow={CONFIG.poker.maxChipsPerRow}
          overlap={CONFIG.poker.chipOverlap}
        />
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
