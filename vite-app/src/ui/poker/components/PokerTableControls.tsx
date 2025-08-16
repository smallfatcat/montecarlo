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
  editLayout?: boolean // Add edit layout mode
  onLayoutChange?: (layout: any) => void // Add layout change callback
  // Drag system
  dragSystem?: any
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
  editLayout,
  onLayoutChange,
}: PokerTableControlsProps) {
  const { horseshoe } = CONFIG.poker
  const { potOffsetY } = horseshoe

  // Calculate the player's stack from the table
  const playerStack = mySeatIndex != null && table?.seats?.[mySeatIndex] ? table.seats[mySeatIndex].stack : 0
  const toCall = mySeatIndex != null && table ? Math.max(0, (table.betToCall || 0) - (table.seats?.[mySeatIndex]?.committedThisStreet || 0)) : 0
  const minOpen = table?.rules?.bigBlind ?? 1
  const minRaiseExtra = Math.max(table?.lastRaiseAmount ?? minOpen, minOpen)
  const seat = mySeatIndex != null ? table?.seats?.[mySeatIndex] : null
  const canAct = !!(table && table.status === 'in_hand' && table.currentToAct === mySeatIndex && seat && !seat.hasFolded && !seat.isAllIn)

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
          key={`${table?.handId ?? 'h'}-${table?.street ?? 'none'}-${table?.currentToAct ?? 'na'}`}
          available={available || []}
          disabled={!canAct}
          pot={table?.pot?.main || 0}
          stack={playerStack}
          toCall={toCall}
          minOpen={minOpen}
          minRaiseExtraHint={minRaiseExtra}
          onFold={onFold}
          onCheck={onCheck}
          onCall={onCall}
          onBet={onBet}
          onRaise={onRaise}
          layout={controlsChildren}
          boxWidth={controlsBox?.width || 200}
          boxHeight={controlsBox?.height || 200}
          editLayout={editLayout}
          onLayoutChange={onLayoutChange}
        />
    </motion.div>
  )
}
