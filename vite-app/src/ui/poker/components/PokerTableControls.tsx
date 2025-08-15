import { motion } from 'framer-motion'
import type { BettingActionType } from '../../../poker/types'
import { PokerInlineControls } from '../PokerInlineControls'
import { CONFIG } from '../../../config'

export interface PokerTableControlsProps {
  available?: BettingActionType[]
  onFold?: () => void
  onCheck?: () => void
  onCall?: () => void
  onBet?: (amount?: number) => void
  onRaise?: (amount?: number) => void
  layoutOverride?: any
  controlsChildren?: any // Add controlsChildren layout
  controlsBox?: any // Add controlsBox layout
  table?: any // Add table prop to access pot and stack
  mySeatIndex?: number | null // Add player seat index
}

export function PokerTableControls({
  available,
  onFold,
  onCheck,
  onCall,
  onBet,
  onRaise,
  layoutOverride,
  controlsChildren,
  controlsBox,
  table,
  mySeatIndex,
}: PokerTableControlsProps) {
  const { horseshoe } = CONFIG.poker
  const { potOffsetY } = horseshoe

  // Calculate the player's stack from the table
  const playerStack = mySeatIndex != null && table?.seats?.[mySeatIndex] ? table.seats[mySeatIndex].stack : 0

  return (
    <motion.div
      className="poker-table-controls"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      style={{
        position: 'absolute',
        left: layoutOverride?.left ?? '50%',
        top: layoutOverride?.top ?? '50%',
        transform: layoutOverride?.left ? 'none' : 'translate(-50%, -50%)',
        marginTop: layoutOverride?.top ? 0 : potOffsetY + 100, // Position below pot
        width: layoutOverride?.width,
        height: layoutOverride?.height,
      }}
    >
              <PokerInlineControls
          available={available || []}
          disabled={false}
          pot={table?.pot?.main || 0}
          stack={playerStack}
          onFold={onFold}
          onCheck={onCheck}
          onCall={onCall}
          onBet={onBet}
          onRaise={onRaise}
          layout={controlsChildren}
          boxWidth={controlsBox?.width || 200}
          boxHeight={controlsBox?.height || 200}
        />
    </motion.div>
  )
}
