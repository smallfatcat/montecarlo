import { useRef, useState, forwardRef, useImperativeHandle } from 'react'
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


