import { useState } from 'react'
import type { BettingActionType, PokerTableState } from '../../poker/types'

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
  onRaise: (amount?: number) => void
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
  mySeatIndex?: number | null
  playerNames?: Array<string | null>
  onRenameMe?: (newName: string) => void
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
  } = props

  const [betSize, setBetSize] = useState<'33'|'50'|'75'|'pot'|'shove'>('50')
  const layoutVariant = props.variant ?? 'toolbar'
  const sidebarWidth = props.sidebarWidth ?? 220
  const baseStyle: React.CSSProperties = layoutVariant === 'sidebar'
    ? {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'stretch',
        width: sidebarWidth,
        padding: 10,
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.12)',
        borderRight: '1px solid rgba(255,255,255,0.12)',
        zIndex: 1100,
      }
    : { display: 'flex', gap: 12, alignItems: 'center' }

  return (
    <div id="poker-controlbar" style={baseStyle}>
      <button onClick={() => onDealNext()} disabled={table.status === 'in_hand' || table.gameOver}>Deal</button>
      {onResetGame && <button onClick={() => onResetGame()} style={{ marginLeft: 4 }}>Reset Game</button>}
      <label><input type="checkbox" checked={autoPlay} onChange={(e) => onToggleAutoPlay(e.target.checked)} /> Autoplay</label>
      {layoutVariant === 'toolbar' && <span className="sep" />}
      <label title="Your display name shown on your seat">
        Name: <input
          type="text"
          value={(mySeatIndex != null ? (playerNames?.[mySeatIndex] || '') : '')}
          placeholder={mySeatIndex != null ? `Player ${mySeatIndex}` : 'Spectator'}
          onChange={(e) => onRenameMe?.(e.target.value)}
          disabled={mySeatIndex == null || table.status === 'in_hand'}
          style={{ width: 140 }}
        />
      </label>
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
      <button onClick={() => {
        const pot = table.pot.main
        let amt = 0
        if (betSize === 'shove') amt = Number.MAX_SAFE_INTEGER
        else if (betSize === 'pot') amt = Math.floor(pot)
        else amt = Math.floor(pot * (parseInt(betSize,10)/100))
        onBet(amt)
      }} disabled={!available.includes('bet')}>Bet</button>
      <button onClick={() => {
        const toCall = Math.max(0, table.betToCall - (table.seats[0]?.committedThisStreet||0))
        const pot = table.pot.main
        let extra = 0
        if (betSize === 'shove') extra = Number.MAX_SAFE_INTEGER
        else if (betSize === 'pot') extra = Math.floor(pot + toCall)
        else extra = Math.floor((pot + toCall) * (parseInt(betSize,10)/100))
        onRaise(extra)
      }} disabled={!available.includes('raise')}>Raise</button>
      <button onClick={onFold} disabled={!available.includes('fold')}>Fold</button>
      <button onClick={onCheck} disabled={!available.includes('check')}>Check</button>
      <button onClick={onCall} disabled={!available.includes('call')}>Call</button>
      {layoutVariant === 'toolbar' && <span className="sep" />}
      <label title="Edit and drag layout elements">
        <input type="checkbox" checked={!!editLayoutMode} onChange={(e) => onToggleEditLayout?.(e.target.checked)} /> Edit Layout
      </label>
      {onExportLayout && <button onClick={onExportLayout}>Export Layout JSON</button>}
      {onResetLayout && <button onClick={onResetLayout}>Reset Layout</button>}
      {layoutVariant === 'toolbar' && <span className="sep" />}
      {onOpenHistory && <button onClick={onOpenHistory}>Open History</button>}
      {reviewInfo && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: layoutVariant === 'toolbar' ? 16 : 0 }}>
          <span style={{ opacity: 0.85 }}>Review Hand #{reviewInfo.handId} • Step {reviewInfo.step}/{reviewInfo.total}</span>
          <button onClick={onReviewPrev}>&laquo; Prev</button>
          <button onClick={onReviewNext}>Next &raquo;</button>
          <button onClick={onEndReview}>Exit Review</button>
        </div>
      )}
    </div>
  )
}


