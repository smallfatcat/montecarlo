import type { BettingActionType } from '../../../poker/types'

export interface PokerBettingButtonsProps {
  available: BettingActionType[]
  disabled: boolean
  betAmount: number
  toCall?: number
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
  }

  function styleFor(action: BettingActionType): React.CSSProperties {
    const isActive = !disabled && available.includes(action)
    if (!isActive) return buttonStyle
    return {
      ...buttonStyle,
      boxShadow: '0 0 5px rgba(0,255,180,0.85), 0 0 20px rgba(0,255,180,0.55)',
      border: '1px solid rgba(31, 206, 54, 0.9)'
    }
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
      <div id="control-check" style={{ position: 'absolute', left: layout.check?.left, top: layout.check?.top, transform: 'translate(-50%, -50%)', ...sized(layout.check) }} {...makeDragHandlers('check')}>
        <button onClick={() => onCheck?.()} disabled={disabled || !available.includes('check')} style={styleFor('check')}>CHECK</button>
      </div>
      <div id="control-call" style={{ position: 'absolute', left: layout.call?.left, top: layout.call?.top, transform: 'translate(-50%, -50%)', ...sized(layout.call) }} {...makeDragHandlers('call')}>
        <button onClick={() => onCall?.()} disabled={disabled || !available.includes('call')} style={styleFor('call')}>CALL</button>
      </div>
      <div id="control-fold" style={{ position: 'absolute', left: layout.fold?.left, top: layout.fold?.top, transform: 'translate(-50%, -50%)', ...sized(layout.fold) }} {...makeDragHandlers('fold')}>
        <button onClick={() => onFold?.()} disabled={disabled || !available.includes('fold')} style={styleFor('fold')}>FOLD</button>
      </div>
      <div id="control-betBtn" style={{ position: 'absolute', left: layout.betBtn?.left, top: layout.betBtn?.top, transform: 'translate(-50%, -50%)', ...sized(layout.betBtn) }} {...makeDragHandlers('betBtn')}>
        <button onClick={() => onBet?.(betAmount)} disabled={disabled || !available.includes('bet')} style={styleFor('bet')}>BET</button>
      </div>
      <div id="control-raise" style={{ position: 'absolute', left: layout.raise?.left, top: layout.raise?.top, transform: 'translate(-50%, -50%)', ...sized(layout.raise) }} {...makeDragHandlers('raise')}>
        <button onClick={() => {
          const callNeeded = Math.max(0, Math.floor(toCall || 0))
          const extra = Math.max(0, betAmount - callNeeded)
          onRaise?.(extra)
        }} disabled={disabled || !available.includes('raise')} style={styleFor('raise')}>RAISE</button>
      </div>
    </>
  )
}
