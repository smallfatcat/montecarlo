import { motion, AnimatePresence } from 'framer-motion'
import { ChipStack } from '../../components/ChipStack'
import { CONFIG } from '../../../config'
import type { PokerTableState } from '../../../poker/types'

export interface PokerTableStacksProps {
  table: PokerTableState
  layoutOverrides: any
}

export function PokerTableStacks({ table, layoutOverrides }: PokerTableStacksProps) {
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
        <motion.div
          key={`stack-${seatIndex}`}
          initial={{ opacity: 1, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: seatIndex * 0.05 }}
          style={{
            position: 'absolute',
            left: position.left,
            top: position.top,
            width: position.width,
            height: position.height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
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
          >
            <ChipStack
              amount={seat.stack}
              size={30}
              overlap={0.8}
              maxChipsPerRow={20}
            />
          </motion.div>
        </motion.div>
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
