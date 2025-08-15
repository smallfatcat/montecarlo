import { motion, AnimatePresence } from 'framer-motion'
import { ChipIcon } from '../../components/ChipIcon'
import { CONFIG } from '../../../config'
import type { PokerTableState } from '../../../poker/types'
import type { ChipDenomination } from '../../components/ChipIcon'
import React from 'react'

export interface PokerTableChipFlowProps {
  table: PokerTableState
  layoutOverrides: any
  previousTable?: PokerTableState // To detect changes
}

// Split amount into individual chip denominations, but limit to larger chips
function splitIntoDenoms(amount: number): Array<{ denom: ChipDenomination; count: number }> {
  const denoms: ChipDenomination[] = [5000, 1000, 500, 100, 25, 10, 5]
  const out: Array<{ denom: ChipDenomination; count: number }> = []
  
  for (const denom of denoms) {
    if (amount >= denom) {
      const count = Math.floor(amount / denom)
      // Limit the number of chips to animate - only show larger denominations
      // and cap the total number of animated chips
      if (denom >= 100 || out.length < 3) {
        out.push({ denom, count })
        amount -= count * denom
      } else {
        // For smaller denominations, just add the total to the pot without individual animation
        amount -= count * denom
      }
    }
  }
  return out
}

export function PokerTableChipFlow({ table, layoutOverrides, previousTable }: PokerTableChipFlowProps) {
  // Only show chip flow when there are committed chips
  const hasCommittedChips = table.seats.some(seat => seat.committedThisStreet > 0)
  if (!hasCommittedChips) return null

  const renderChipFlow = () => {
    const chipFlows: React.JSX.Element[] = []
    
    table.seats.forEach((seat, seatIndex) => {
      if (seat.committedThisStreet <= 0) return
      
      const stackLayout = layoutOverrides.stacks?.[seatIndex]
      const betLayout = layoutOverrides.bets?.[seatIndex]
      const potLayout = layoutOverrides.pot
      
      if (!stackLayout || !betLayout || !potLayout) return
      
      // Calculate positions
      const stackPos = {
        x: parseInt(stackLayout.left) + (parseInt(stackLayout.width) / 2),
        y: parseInt(stackLayout.top) + (parseInt(stackLayout.height) / 2)
      }
      
      const betPos = {
        x: parseInt(betLayout.left) + (parseInt(betLayout.width) / 2),
        y: parseInt(betLayout.top) + (parseInt(betLayout.height) / 2)
      }
      
      const potPos = {
        x: potLayout.left === '50%' ? 600 : parseInt(potLayout.left) + (parseInt(potLayout.width) / 2),
        y: potLayout.top === '50%' ? 360 : parseInt(potLayout.top) + (parseInt(potLayout.height) / 2)
      }
      
      // Split committed amount into individual chips (limited to larger denominations)
      const chipGroups = splitIntoDenoms(seat.committedThisStreet)
      
      chipGroups.forEach((group, groupIndex) => {
        // For larger denominations, show individual chips
        // For smaller denominations, show fewer chips to represent the amount
        const maxChipsToShow = group.denom >= 500 ? group.count : Math.min(group.count, 3)
        
        for (let i = 0; i < maxChipsToShow; i++) {
          const chipIndex = groupIndex * 5 + i
          const delay = chipIndex * 0.1 // Slightly longer delay between chips
          
          chipFlows.push(
            <motion.div
              key={`chip-flow-${seatIndex}-${group.denom}-${i}`}
              initial={{
                position: 'absolute',
                left: stackPos.x,
                top: stackPos.y,
                x: 0,
                y: 0,
                scale: 1,
                opacity: 1,
                zIndex: 1000
              }}
              animate={{
                x: [0, betPos.x - stackPos.x, potPos.x - stackPos.x],
                y: [0, betPos.y - stackPos.y, potPos.y - stackPos.y],
                scale: [1, 1.1, 0.8],
                opacity: [1, 1, 0]
              }}
              transition={{
                duration: CONFIG.poker.animations?.chipFlyDurationMs ? CONFIG.poker.animations.chipFlyDurationMs / 1000 : 0.15,
                times: [0, 0.5, 1],
                delay: delay,
                ease: "easeInOut"
              }}
              style={{
                position: 'absolute',
                left: stackPos.x,
                top: stackPos.y,
                zIndex: 1000
              }}
            >
              <ChipIcon denom={group.denom} size={20} />
            </motion.div>
          )
        }
      })
    })
    
    return chipFlows
  }

  return (
    <AnimatePresence>
      {renderChipFlow()}
    </AnimatePresence>
  )
}
