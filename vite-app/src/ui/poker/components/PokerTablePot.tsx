import { motion } from 'framer-motion'
import { ChipStack } from '../../components/ChipStack'
import { CONFIG } from '../../../config'
import type { PokerTableState } from '../../../poker/types'

export interface PokerTablePotProps {
  table: PokerTableState
  showdownText?: string
  layoutOverride?: any
  layoutOverrides?: any // Add this to access betting spot positions
}

export function PokerTablePot({ table, showdownText, layoutOverride, layoutOverrides }: PokerTablePotProps) {
  const { horseshoe } = CONFIG.poker
  const { potOffsetY, showdownOffsetY } = horseshoe

  // Calculate the pot position for animation calculations
  const potPosition = layoutOverride || {
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    marginTop: potOffsetY
  }

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
            textShadow: '0 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          {table.pot.main}
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
