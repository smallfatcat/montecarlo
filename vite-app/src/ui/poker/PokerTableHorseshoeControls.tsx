import { useState } from 'react'
import { motion } from 'framer-motion'
import type { PokerTableState } from '../../poker/types'
import type { BettingActionType } from '../../poker/types'
import { Button, Input, Badge, Card } from '../components'
import './PokerTableHorseshoeControls.css'

export function PokerTableHorseshoeControls(props: {
  table: PokerTableState
  autoPlay: boolean
  onToggleAutoPlay: (v: boolean) => void
  onDealNext: () => void
  onResetGame?: () => void
  available: BettingActionType[]
  onFold: () => void
  onCheck: () => void
  onCall: () => void
  onBet: (amount?: number) => void
  onRaise?: (amount?: number) => void
  hideHoleCardsUntilShowdown: boolean
  onToggleHideHoleCards: (v: boolean) => void
  onExportLayout?: () => void
  onResetLayout?: () => void
  editLayoutMode?: boolean
  onToggleEditLayout?: (v: boolean) => void
  reviewInfo?: { handId: number; step: number; total: number } | null
  onReviewPrev?: () => void
  onReviewNext?: () => void
  onEndReview?: () => void
  onOpenHistory?: () => void
  onOpenLobby?: () => void
  mySeatIndex?: number | null
  playerNames?: Array<string | null>
  onRenameMe?: (newName: string) => void
  onLeaveSeat?: () => void
  variant?: 'toolbar' | 'sidebar'
  sidebarWidth?: number
}) {
  const {
    table,
    autoPlay,
    onToggleAutoPlay,
    onDealNext,
    onResetGame,
    available,
    onFold,
    onCheck,
    onCall,
    onBet,
    onRaise,
    hideHoleCardsUntilShowdown,
    onToggleHideHoleCards,
    onExportLayout,
    onResetLayout,
    editLayoutMode,
    onToggleEditLayout,
    reviewInfo,
    onReviewPrev,
    onReviewNext,
    onEndReview,
    onOpenHistory,
    mySeatIndex,
    playerNames,
    onRenameMe,
    onLeaveSeat,
  } = props

  const [betSize, setBetSize] = useState<'33'|'50'|'75'|'pot'|'shove'>('50')
  const layoutVariant = props.variant ?? 'toolbar'
  const sidebarWidth = props.sidebarWidth ?? 220
  const baseStyle: React.CSSProperties = layoutVariant === 'sidebar'
    ? {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        alignItems: 'stretch',
        width: sidebarWidth,
        padding: 'var(--space-3)',
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        zIndex: 1100,
      }
    : { display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }

  return (
    <Card
      variant="elevated"
      padding="sm"
      className={`poker-controlbar poker-controlbar--${layoutVariant}`}
      style={baseStyle}
    >
      <Button variant="primary" size="sm" onClick={() => onDealNext()} disabled={table.status === 'in_hand' || table.gameOver}>
        Deal
      </Button>
      
      {onResetGame && (
        <Button variant="secondary" size="sm" onClick={() => onResetGame()}>
          Reset Game
        </Button>
      )}
      
      <label className="control-label">
        <input type="checkbox" checked={autoPlay} onChange={(e) => onToggleAutoPlay(e.target.checked)} /> 
        Autoplay
      </label>
      
      {layoutVariant === 'toolbar' && <span className="control-separator" />}
      
      <div className="name-input-container">
        <Input
          label="Name"
          value={(mySeatIndex != null ? (playerNames?.[mySeatIndex] || '') : '')}
          placeholder={mySeatIndex != null ? `Player ${mySeatIndex}` : 'Spectator'}
          onChange={(e) => onRenameMe?.(e.target.value)}
          disabled={mySeatIndex == null || table.status === 'in_hand'}
          helperText="Your display name shown on your seat"
          size="sm"
        />
      </div>
      
      {mySeatIndex != null ? (
        <Badge variant="success" size="lg">
          🪑 Seated at Seat {mySeatIndex}
        </Badge>
      ) : (
        <Badge variant="outline" size="lg">
          👁️ Spectating
        </Badge>
      )}
      
      {onLeaveSeat && mySeatIndex != null && (
        <Button 
          variant="danger"
          size="sm"
          onClick={onLeaveSeat}
        >
          Leave Seat
        </Button>
      )}
      <label title="Hide all hole cards until showdown (except your own)">
        <input type="checkbox" checked={hideHoleCardsUntilShowdown} onChange={(e) => onToggleHideHoleCards(e.target.checked)} />
        Hide hole cards
      </label>
      <select value={betSize} onChange={(e)=>setBetSize(e.target.value as any)}>
        <option value="33">33%</option>
        <option value="50">50%</option>
        <option value="75">75%</option>
        <option value="pot">Pot</option>
        <option value="shove">Shove</option>
      </select>
      <Button onClick={() => {
        const pot = table.pot.main
        let amt = 0
        if (betSize === 'shove') amt = Number.MAX_SAFE_INTEGER
        else if (betSize === 'pot') amt = Math.floor(pot)
        else amt = Math.floor(pot * (parseInt(betSize,10)/100))
        onBet(amt)
      }} disabled={!available.includes('bet')}>Bet</Button>
      <Button onClick={() => {
        const toCall = Math.max(0, table.betToCall - (table.seats[0]?.committedThisStreet||0))
        const pot = table.pot.main
        let extra = 0
        if (betSize === 'shove') extra = Number.MAX_SAFE_INTEGER
        else if (betSize === 'pot') extra = Math.floor(pot + toCall)
        else extra = Math.floor((pot + toCall) * (parseInt(betSize,10)/100))
        onRaise?.(extra)
      }} disabled={!available.includes('raise')}>Raise</Button>
      <Button onClick={onFold} disabled={!available.includes('fold')}>Fold</Button>
      <Button onClick={onCheck} disabled={!available.includes('check')}>Check</Button>
      <Button onClick={onCall} disabled={!available.includes('call')}>Call</Button>
      {layoutVariant === 'toolbar' && <span className="control-separator" />}
      <label title="Edit and drag layout elements">
        <input type="checkbox" checked={!!editLayoutMode} onChange={(e) => onToggleEditLayout?.(e.target.checked)} /> Edit Layout
      </label>
      {onExportLayout && <Button onClick={onExportLayout}>Export Layout JSON</Button>}
      {onResetLayout && <Button onClick={onResetLayout}>Reset Layout</Button>}
      {layoutVariant === 'toolbar' && <span className="control-separator" />}
      {onOpenHistory && <Button onClick={onOpenHistory}>Open History</Button>}
      {props.onOpenLobby && <Button onClick={props.onOpenLobby}>Back to Lobby</Button>}
      {reviewInfo && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: layoutVariant === 'toolbar' ? 16 : 0 }}>
          <span style={{ opacity: 0.85 }}>Review Hand #{reviewInfo.handId} • Step {reviewInfo.step}/{reviewInfo.total}</span>
          <button onClick={onReviewPrev}>&laquo; Prev</button>
          <button onClick={onReviewNext}>Next &raquo;</button>
          <button onClick={onEndReview}>Exit Review</button>
        </div>
      )}
      {onLeaveSeat && <Button onClick={onLeaveSeat}>Leave Seat</Button>}
    </Card>
  )
}


