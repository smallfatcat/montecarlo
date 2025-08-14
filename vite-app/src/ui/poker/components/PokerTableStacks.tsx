import { motion } from 'framer-motion'
import type { PokerTableState } from '../../../poker/types'
import { ChipStack } from '../../components/ChipStack'

export interface PokerTableStacksProps {
  table: PokerTableState
  layoutOverrides: any
}

export function PokerTableStacks({ table, layoutOverrides }: PokerTableStacksProps) {
  const renderStacks = () => {
    return table.seats.map((seat, seatIndex) => {
      if (seat.isCPU && !seat.hole.length) return null

      const stackLayout = layoutOverrides.stacks?.[seatIndex]
      if (!stackLayout) return null

      return (
        <motion.div
          key={`stack-${seatIndex}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: seatIndex * 0.1 }}
          style={{
            position: 'absolute',
            left: stackLayout.left,
            top: stackLayout.top,
            width: stackLayout.width,
            height: stackLayout.height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChipStack
            amount={seat.stack}
            size={30}
            overlap={0.8}
            maxChipsPerRow={20}
          />
        </motion.div>
      )
    })
  }

  return (
    <>
      {renderStacks()}
    </>
  )
}
