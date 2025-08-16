import { useRef, useState, forwardRef, useImperativeHandle, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChipStack } from '../components/ChipStack'
import type { PokerTableState, BettingActionType } from '../../poker/types'
import { CONFIG } from '../../config'
import {
  PokerTableLayout,
  PokerTableSeats,
  PokerTableBoard,
  PokerTableControls,
  PokerTablePot,
  PokerTableStacks,
  PokerTableBettingSpots,
  type LayoutOverrides,
  type PokerTableViewHandle
} from './components'

export interface PokerTableHorseshoeViewProps {
  table: PokerTableState
  revealed: { holeCounts: number[]; boardCount: number }
  hideHoleCardsUntilShowdown: boolean
  editLayoutMode?: boolean
  // seat control wiring
  onSitHere?: (seatIndex: number) => void
  mySeatIndex?: number | null
  playerNames?: Array<string | null>
  nowMs?: number
  // Derived display
  winnersSet?: Set<number>
  highlightSet?: Set<string>
  showdownText?: string
  // Equity (percentages)
  equity?: { winPct: number[]; tiePct: number[]; running: boolean } | null
  // Inline controls
  available?: BettingActionType[]
  onFold?: () => void
  onCheck?: () => void
  onCall?: () => void
  onBet?: (amount?: number) => void
  onRaise?: (amount?: number) => void
}

export const PokerTableHorseshoeView = forwardRef<PokerTableViewHandle, PokerTableHorseshoeViewProps>(function PokerTableHorseshoeView(props, ref) {
  const {
    table,
    revealed,
    hideHoleCardsUntilShowdown,
    editLayoutMode,
    onSitHere,
    mySeatIndex,
    playerNames,
    nowMs,
    highlightSet: highlightSetProp,
    showdownText: showdownTextProp,
    equity,
    winnersSet,
    available,
    onFold,
    onCheck,
    onCall,
    onBet,
    onRaise,
  } = props

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [layoutOverrides, setLayoutOverrides] = useState<LayoutOverrides>({ seats: {} })

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    exportLayoutToJson: () => {
      const dataStr = JSON.stringify(layoutOverrides, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'horseshoe-layout.json'
      link.click()
      URL.revokeObjectURL(url)
    },
    resetLayout: () => {
      setLayoutOverrides({ seats: {} })
    },
  }), [layoutOverrides])

  // Table dimensions
  const { tableWidthPx, tableHeightPx } = CONFIG.poker.horseshoe
  const width = tableWidthPx
  const height = tableHeightPx

  return (
    <PokerTableLayout
      editLayoutMode={editLayoutMode}
      onLayoutChange={setLayoutOverrides}
    >
      <div id="poker-root" style={{ display: 'grid', gap: 12 }}>
        <div
          id="horseshoe-table"
          ref={containerRef}
          className="horseshoe-table"
          style={{ 
            position: 'relative', 
            width, 
            height, 
            margin: '0 auto', 
            borderRadius: 24, 
            background: 'rgba(0,0,0,0.18)', 
            border: '1px solid rgba(255,255,255,0.08)', 
            overflow: 'visible' 
          }}
        >
          {/* Board */}
          <PokerTableBoard
            table={table}
            revealed={revealed}
            highlightSet={highlightSetProp}
            layoutOverride={layoutOverrides.board}
            editLayout={editLayoutMode}
          />

          {/* Pot and Showdown */}
          <PokerTablePot
            table={table}
            showdownText={showdownTextProp}
            layoutOverride={layoutOverrides.pot}
            editLayout={editLayoutMode}
          />

          {/* Pot payout overlay (fly pot -> stacks on hand over) */}
          <PotPayoutOverlay
            table={table}
            layoutOverrides={layoutOverrides}
          />

                        {/* Seats */}
              <PokerTableSeats
                table={table}
                revealed={revealed}
                hideHoleCardsUntilShowdown={hideHoleCardsUntilShowdown}
                onSitHere={onSitHere}
                mySeatIndex={mySeatIndex}
                playerNames={playerNames}
                highlightSet={highlightSetProp}
                layoutOverrides={layoutOverrides}
                nowMs={nowMs}
                equity={equity}
                winnersSet={winnersSet}
                showdownText={showdownTextProp}
                editLayout={editLayoutMode}
              />

              {/* Stacks */}
              <PokerTableStacks
                table={table}
                layoutOverrides={layoutOverrides}
                editLayout={editLayoutMode}
              />

              {/* Betting Spots */}
              <PokerTableBettingSpots
                table={table}
                layoutOverrides={layoutOverrides}
                editLayout={editLayoutMode}
              />

              {/* Controls */}
              <PokerTableControls
                available={available}
                onFold={onFold}
                onCheck={onCheck}
                onCall={onCall}
                onBet={onBet}
                onRaise={onRaise}
                layoutOverride={layoutOverrides.controls}
                controlsChildren={layoutOverrides.controlsChildren}
                controlsBox={layoutOverrides.controlsBox}
                table={table}
                mySeatIndex={mySeatIndex}
                editLayout={editLayoutMode}
              />
        </div>
      </div>
    </PokerTableLayout>
  )
})

function PotPayoutOverlay({ table, layoutOverrides }: { table: PokerTableState; layoutOverrides: any }) {
  const prevRef = useRef<PokerTableState | null>(null)
  const [flights, setFlights] = useState<Array<{ key: string; from: { x: number; y: number }; to: { x: number; y: number }; amount: number }>>([])

  useEffect(() => {
    const prev = prevRef.current
    const curr = table
    // Detect transition where pot was paid out
    if (prev && prev.pot?.main > 0 && curr.pot?.main === 0 && curr.status === 'hand_over') {
      const num = (v: any, fb: number = 0): number => {
        if (typeof v === 'number') return v
        if (typeof v === 'string') { const n = parseInt(v, 10); return Number.isFinite(n) ? n : fb }
        return fb
      }
      // Pot center
      const pot = layoutOverrides.pot || {}
      const potLeft = num(pot.left, 0)
      const potTop = num(pot.top, 0)
      const potW = num(pot.width, 0)
      const potH = num(pot.height, 0)
      const potCenter = { x: potLeft + (potW ? potW/2 : 0), y: potTop + (potH ? potH/2 : 0) }
      // Compute per-seat stack increases
      const nextFlights: typeof flights = []
      curr.seats.forEach((s, i) => {
        const before = prev.seats[i]
        if (!before) return
        const delta = Math.max(0, Math.floor(s.stack - before.stack))
        if (delta <= 0) return
        const st = layoutOverrides.stacks?.[i] || {}
        const sx = num(st.left, 150 + (i * 180)) + num(st.width, 100)/2
        const sy = num(st.top, 120 + (i * 100))
        nextFlights.push({ key: `payout-${curr.handId}-${i}`, from: potCenter, to: { x: sx, y: sy }, amount: delta })
      })
      if (nextFlights.length > 0) setFlights(nextFlights)
    }
    prevRef.current = curr
  }, [table.handId, table.status, table.pot?.main, table.seats, layoutOverrides])

  // Auto-clear flights after animation duration
  useEffect(() => {
    if (flights.length === 0) return
    const id = setTimeout(() => setFlights([]), (CONFIG.poker.animations?.chipFlyDurationMs ?? 150) + 50)
    return () => clearTimeout(id)
  }, [flights])

  if (flights.length === 0) return null
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 25 }}>
      {flights.map((f) => {
        const dx = f.to.x - f.from.x
        const dy = f.to.y - f.from.y
        return (
          <div key={f.key} style={{ position: 'absolute', left: f.to.x, top: f.to.y }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -dx, y: -dy }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              transition={{ duration: (CONFIG.poker.animations?.chipFlyDurationMs ?? 150) / 1000, ease: 'easeOut' }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
            >
              <ChipStack amount={Math.max(1, Math.floor(f.amount))} size={20} overlap={0.75} maxChipsPerRow={12} />
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: 0.08 }}
                style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
              >
                +{f.amount}
              </motion.span>
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}


