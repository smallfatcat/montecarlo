import type { BettingActionType } from '../../../poker/types'

export interface PokerBettingButtonsProps {
  available: BettingActionType[]
  disabled: boolean
  betAmount: number
  toCall?: number
  minRaiseExtra?: number
  onCheck?: () => void
  onCall?: () => void
  onFold?: () => void
  onBet?: (amount?: number) => void
  onRaise?: (amount?: number) => void
  layout: Record<string, { left?: number; top?: number; width?: number; height?: number }>
  editLayout: boolean
  onLayoutChange?: (layout: Record<string, { left?: number; top?: number; width?: number; height?: number }>) => void
}

export function PokerBettingButtons({
  available,
  disabled,
  betAmount,
  toCall,
  minRaiseExtra,
  onCheck,
  onCall,
  onFold,
  onBet,
  onRaise,
  layout,
  editLayout,
  onLayoutChange
}: PokerBettingButtonsProps) {
  const buttonStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    background: 'rgba(15, 26, 15, 0.9)',
    border: '1px solid rgba(0, 255, 136, 0.4)',
    borderRadius: '8px',
    color: 'var(--color-neutral-50)',
    fontWeight: 600,
    fontSize: '14px',
    padding: '8px 16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    minWidth: '80px',
    position: 'relative',
    overflow: 'hidden',
  }

  function styleOk(): React.CSSProperties {
    return {
      ...buttonStyle,
      background: 'rgba(15, 26, 15, 0.9)',
      border: '1px solid rgba(0, 255, 136, 0.6)',
      boxShadow: '0 0 8px rgba(0, 255, 136, 0.4), 0 0 16px rgba(0, 255, 136, 0.2)',
    }
  }

  function styleError(): React.CSSProperties {
    return {
      ...buttonStyle,
      background: 'rgba(15, 26, 15, 0.9)',
      border: '1px solid rgba(255, 0, 0, 0.6)',
      boxShadow: '0 0 8px rgba(255, 0, 0, 0.4), 0 0 16px rgba(255, 0, 0, 0.2)',
    }
  }

  function styleRaise(): React.CSSProperties {
    return {
      ...buttonStyle,
      background: 'rgba(15, 26, 15, 0.9)',
      border: '1px solid rgba(255, 0, 0, 0.6)',
      boxShadow: '0 0 10px rgba(255, 0, 0, 0.5), 0 0 20px rgba(255, 0, 0, 0.3)',
    }
  }

  function styleForStatus({ availableAction, disabledGlobal, legal, isRaise }: { availableAction: boolean; disabledGlobal: boolean; legal: boolean; isRaise?: boolean }): React.CSSProperties {
    if (!availableAction || disabledGlobal) {
      return {
        ...buttonStyle,
        opacity: 0.5,
        cursor: 'not-allowed',
        background: 'rgba(100, 100, 100, 0.2)',
        borderColor: 'rgba(100, 100, 100, 0.3)',
        boxShadow: 'none',
      }
    }
    
    if (isRaise) {
      return legal ? styleRaise() : styleError()
    }
    
    return legal ? styleOk() : styleError()
  }

  function makeDragHandlers(key: string) {
    if (!editLayout) return {}
    return {
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation()
        const startX = e.clientX
        const startY = e.clientY
        const start = layout[key] || {}
        const startLeft = (start.left ?? 0)
        const startTop = (start.top ?? 0)
        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startX
          const dy = ev.clientY - startY
          const snap = (v: number) => Math.round(v / 2) * 2
          const nextLeft = snap(startLeft + dx)
          const nextTop = snap(startTop + dy)
          const next = { ...layout, [key]: { ...(layout?.[key] || {}), left: nextLeft, top: nextTop } }
          onLayoutChange?.(next)
        }
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      }
    }
  }

  function sized(rect?: { left?: number; top?: number; width?: number; height?: number }): React.CSSProperties {
    const style: React.CSSProperties = {}
    if (rect?.width != null) style.width = rect.width
    if (rect?.height != null) style.height = rect.height
    return style
  }

  return (
    <>
      <div id="control-checkBtn" style={{ position: 'absolute', left: (layout as any).checkBtn?.left, top: (layout as any).checkBtn?.top, transform: 'translate(-50%, -50%)', ...sized((layout as any).checkBtn) }} {...makeDragHandlers('checkBtn')}>
        <button 
          onClick={() => onCheck?.()} 
          disabled={disabled || !available.includes('check')} 
          style={styleForStatus({ availableAction: available.includes('check'), disabledGlobal: disabled, legal: true })}
          className="poker-betting-button poker-betting-button--check"
        >
          CHECK
        </button>
      </div>
      
      <div id="control-callBtn" style={{ position: 'absolute', left: (layout as any).callBtn?.left, top: (layout as any).callBtn?.top, transform: 'translate(-50%, -50%)', ...sized((layout as any).callBtn) }} {...makeDragHandlers('callBtn')}>
        {(() => {
          const availableCall = available.includes('call')
          const callNeeded = Math.max(0, Math.floor(toCall || 0))
          const equal = callNeeded === Math.max(0, Math.floor(betAmount))
          const isDisabled = disabled || !availableCall || !equal
          return (
            <button 
              onClick={() => onCall?.()} 
              disabled={isDisabled} 
              style={styleForStatus({ availableAction: availableCall, disabledGlobal: disabled, legal: equal })}
              className="poker-betting-button poker-betting-button--call"
            >
              CALL
            </button>
          )
        })()}
      </div>
      
      <div id="control-foldBtn" style={{ position: 'absolute', left: (layout as any).foldBtn?.left, top: (layout as any).foldBtn?.top, transform: 'translate(-50%, -50%)', ...sized((layout as any).foldBtn) }} {...makeDragHandlers('foldBtn')}>
        <button 
          onClick={() => onFold?.()} 
          disabled={disabled || !available.includes('fold')} 
          style={styleForStatus({ availableAction: available.includes('fold'), disabledGlobal: disabled, legal: true })}
          className="poker-betting-button poker-betting-button--fold"
        >
          FOLD
        </button>
      </div>
      
      <div id="control-betBtn" style={{ position: 'absolute', left: (layout as any).betBtn?.left, top: (layout as any).betBtn?.top, transform: 'translate(-50%, -50%)', ...sized((layout as any).betBtn) }} {...makeDragHandlers('betBtn')}>
        <button 
          onClick={() => onBet?.(betAmount)} 
          disabled={disabled || !available.includes('bet')} 
          style={styleForStatus({ availableAction: available.includes('bet'), disabledGlobal: disabled, legal: true })}
          className="poker-betting-button poker-betting-button--bet"
        >
          BET
        </button>
      </div>
      
      <div id="control-raiseBtn" style={{ position: 'absolute', left: (layout as any).raiseBtn?.left, top: (layout as any).raiseBtn?.top, transform: 'translate(-50%, -50%)', ...sized((layout as any).raiseBtn) }} {...makeDragHandlers('raiseBtn')}>
        {(() => {
          const availableRaise = available.includes('raise')
          const callNeeded = Math.max(0, Math.floor(toCall || 0))
          const minExtra = Math.max(0, Math.floor(minRaiseExtra || 0))
          const desiredExtra = Math.max(0, Math.floor(betAmount - callNeeded))
          const legal = callNeeded > 0 && desiredExtra >= minExtra
          const isDisabled = disabled || !availableRaise || !legal
          return (
            <button 
              onClick={() => {
                const extra = Math.max(desiredExtra, callNeeded > 0 ? minExtra : 0)
                onRaise?.(extra)
              }} 
              disabled={isDisabled} 
              style={styleForStatus({ availableAction: availableRaise, disabledGlobal: disabled, legal, isRaise: true })}
              className="poker-betting-button poker-betting-button--raise"
            >
              RAISE
            </button>
          )
        })()}
      </div>
    </>
  )
}
