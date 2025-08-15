import { motion, AnimatePresence } from 'framer-motion'
import { ChipStack } from '../../components/ChipStack'
import { CONFIG } from '../../../config'
import type { PokerTableState } from '../../../poker/types'

export interface PokerTableBettingSpotsProps {
  table: PokerTableState
  layoutOverrides: any
}

export function PokerTableBettingSpots({ table, layoutOverrides }: PokerTableBettingSpotsProps) {
  const renderBettingSpots = () => {
    // Only render betting spots for seats that have committed chips this street
    const spotsToRender = table.seats
      .map((seat, seatIndex) => ({ seat, seatIndex }))
      .filter(({ seat }) => seat.committedThisStreet > 0)
      .map(({ seat, seatIndex }) => {
        const spotLayout = layoutOverrides.bets?.[seatIndex]
        const stackLayout = layoutOverrides.stacks?.[seatIndex]
        const potLayout = layoutOverrides.pot
        
        // Position betting spots using the layout override
        // Provide fallback positioning if layout override is not yet loaded
        const position = spotLayout || {
          left: `${150 + (seatIndex * 180)}px`,
          top: `${200 + (seatIndex * 100)}px`,
          width: '100px',
          height: '40px'
        }
        
        // Calculate the path from stack to betting spot for animation
        const stackPosition = stackLayout || {
          left: `${150 + (seatIndex * 180)}px`,
          top: `${120 + (seatIndex * 100)}px`
        }
        
        // Calculate the path from betting spot to pot for exit animation
        const potPosition = potLayout || {
          left: '50%',
          top: '50%',
          marginTop: 35
        }
        
        // Calculate the offset from stack to betting spot
        const deltaX = position.left - stackPosition.left
        const deltaY = position.top - stackPosition.top
        
        // Calculate the path from betting spot to pot
        const potX = potLayout?.left === '50%' ? 600 : parseInt(potLayout.left) + (parseInt(potLayout.width) / 2)
        const potY = potLayout?.top === '50%' ? 360 : parseInt(potLayout.top) + (parseInt(potLayout.height) / 2)
        const betX = parseInt(position.left) + (parseInt(position.width) / 2)
        const betY = parseInt(position.top) + (parseInt(position.height) / 2)
        const potDeltaX = potX - betX
        const potDeltaY = potY - betY
        
        return (
          <motion.div
            key={`betting-spot-${seatIndex}`}
            initial={{ 
              opacity: 0, 
              scale: 0.8, 
              x: -deltaX, 
              y: -deltaY 
            }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              x: 0, 
              y: 0 
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.8, 
              x: potDeltaX, 
              y: potDeltaY 
            }}
            transition={{ 
              duration: CONFIG.poker.animations?.chipFlyDurationMs ? CONFIG.poker.animations.chipFlyDurationMs / 1000 : 0.15,
              ease: "easeOut"
            }}
            style={{
              position: 'absolute',
              left: position.left,
              top: position.top,
              width: position.width,
              height: position.height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 6, // Above stacks but below pot
            }}
          >
            <motion.div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: 4,
                padding: '4px 8px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(4px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 20px rgba(255,215,0,0.2)'
              }}
              animate={{
                boxShadow: [
                  '0 4px 12px rgba(0,0,0,0.3), 0 0 20px rgba(255,215,0,0.2)',
                  '0 4px 12px rgba(0,0,0,0.3), 0 0 30px rgba(255,215,0,0.4)',
                  '0 4px 12px rgba(0,0,0,0.3), 0 0 20px rgba(255,215,0,0.2)'
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  duration: 0.3,
                  ease: "easeOut",
                  delay: 0.1
                }}
              >
                <ChipStack
                  amount={seat.committedThisStreet}
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
                {seat.committedThisStreet}
              </motion.span>
            </motion.div>
          </motion.div>
        )
      })
    
    return spotsToRender
  }

  return (
    <AnimatePresence mode="popLayout">
      {renderBettingSpots()}
    </AnimatePresence>
  )
}
