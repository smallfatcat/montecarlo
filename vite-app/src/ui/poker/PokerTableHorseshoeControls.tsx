import { } from 'react'
// import { motion } from 'framer-motion'
import type { PokerTableState } from '../../poker/types'
import type { } from '../../poker/types'
import { Button, Input, Badge, Card } from '../components'
import { CardBackCycler } from '../components/CardBackCycler'
import './PokerTableHorseshoeControls.css'

export function PokerTableHorseshoeControls(props: {
  table: PokerTableState
  autoPlay: boolean
  onToggleAutoPlay: (v: boolean) => void
  onDealNext: () => void
  onResetGame?: () => void
  // Removed action controls from sidebar
  hideHoleCardsUntilShowdown: boolean
  onToggleHideHoleCards: (v: boolean) => void
  // Removed layout editing controls from sidebar
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
  // State Machine Debug Controls
  debugMode?: boolean
  onToggleDebugMode?: (enabled: boolean) => void
}) {
  const {
    table,
    autoPlay,
    onToggleAutoPlay,
    onDealNext,
    onResetGame,
    hideHoleCardsUntilShowdown,
    onToggleHideHoleCards,
    reviewInfo,
    onReviewPrev,
    onReviewNext,
    onEndReview,
    onOpenHistory,
    mySeatIndex,
    playerNames,
    onRenameMe,
    onLeaveSeat,
    debugMode = false,
    onToggleDebugMode,
  } = props

  // Removed bet sizing control from sidebar
  const layoutVariant = props.variant ?? 'toolbar'
  const sidebarWidth = props.sidebarWidth ?? 220
  const baseStyle: React.CSSProperties = layoutVariant === 'sidebar'
    ? {
        display: 'flex',
        flexWrap: 'wrap',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        alignItems: 'stretch',
        boxSizing: 'border-box',
        width: sidebarWidth,
        maxWidth: sidebarWidth,
        padding: 'var(--space-3)',
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
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
      
      {layoutVariant === 'toolbar' && <CardBackCycler />}
      
      {onResetGame && (
        <Button variant="secondary" size="sm" onClick={() => onResetGame()}>
          Reset Game
        </Button>
      )}
      
      <label className="control-label">
        <input type="checkbox" checked={autoPlay} onChange={(e) => onToggleAutoPlay(e.target.checked)} /> 
        Autoplay
      </label>
      
      {/* State Machine Debug Toggle */}
      {onToggleDebugMode && (
        <label className="control-label" title="Toggle state machine debug logging">
          <input 
            type="checkbox" 
            checked={debugMode} 
            onChange={(e) => onToggleDebugMode(e.target.checked)} 
          /> 
          🔧 Debug Mode
        </label>
      )}
      
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
      
      <CardBackCycler />
      {/* Removed bet controls and action buttons for simplified sidebar */}
      {layoutVariant === 'toolbar' && <span className="control-separator" />}
      {/* Removed layout editing controls and export/reset layout buttons */}
      {layoutVariant === 'toolbar' && <span className="control-separator" />}
      {onOpenHistory && (
        <a
          className="as-button"
          href="#poker-history"
          onClick={(e) => { try { onOpenHistory?.() } catch {} }}
        >
          Open History
        </a>
      )}
      {props.onOpenLobby && (
        <a
          className="as-button"
          href="#lobby"
          onClick={(e) => { try { props.onOpenLobby?.() } catch {} }}
        >
          Back to Lobby
        </a>
      )}
      {reviewInfo && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: layoutVariant === 'toolbar' ? 16 : 0 }}>
          <span style={{ opacity: 0.85 }}>Review Hand #{reviewInfo.handId} • Step {reviewInfo.step}/{reviewInfo.total}</span>
          <button onClick={onReviewPrev}>&laquo; Prev</button>
          <button onClick={onReviewNext}>Next &raquo;</button>
          <button onClick={onEndReview}>Exit Review</button>
        </div>
      )}
      {/* Removed duplicate Leave Seat button at bottom */}
    </Card>
  )
}


