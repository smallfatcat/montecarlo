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
  }

  function styleOk(): React.CSSProperties {
    return {
      ...buttonStyle,
      boxShadow: '0 0 5px rgba(0,255,180,0.85), 0 0 20px rgba(0,255,180,0.55)',
      border: '1px solid rgba(31, 206, 54, 0.9)'
    }
  }

  function styleError(): React.CSSProperties {
    return {
      ...buttonStyle,
      boxShadow: '0 0 6px rgba(255,0,0,0.9), 0 0 18px rgba(255,0,0,0.5)',
      border: '1px solid rgba(255,0,0,0.9)'
    }
  }

  function styleForStatus({ availableAction, disabledGlobal, legal }: { availableAction: boolean; disabledGlobal: boolean; legal: boolean }): React.CSSProperties {
    if (!availableAction || disabledGlobal) return buttonStyle
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
      <div id="control-check" style={{ position: 'absolute', left: layout.check?.left, top: layout.check?.top, transform: 'translate(-50%, -50%)', ...sized(layout.check) }} {...makeDragHandlers('check')}>
        <button onClick={() => onCheck?.()} disabled={disabled || !available.includes('check')} style={styleForStatus({ availableAction: available.includes('check'), disabledGlobal: disabled, legal: true })}>CHECK</button>
      </div>
      <div id="control-call" style={{ position: 'absolute', left: layout.call?.left, top: layout.call?.top, transform: 'translate(-50%, -50%)', ...sized(layout.call) }} {...makeDragHandlers('call')}>
        {(() => {
          const availableCall = available.includes('call')
          const callNeeded = Math.max(0, Math.floor(toCall || 0))
          const equal = callNeeded === Math.max(0, Math.floor(betAmount))
          const isDisabled = disabled || !availableCall || !equal
          return (
            <button onClick={() => onCall?.()} disabled={isDisabled} style={styleForStatus({ availableAction: availableCall, disabledGlobal: disabled, legal: equal })}>CALL</button>
          )
        })()}
      </div>
      <div id="control-fold" style={{ position: 'absolute', left: layout.fold?.left, top: layout.fold?.top, transform: 'translate(-50%, -50%)', ...sized(layout.fold) }} {...makeDragHandlers('fold')}>
        <button onClick={() => onFold?.()} disabled={disabled || !available.includes('fold')} style={styleForStatus({ availableAction: available.includes('fold'), disabledGlobal: disabled, legal: true })}>FOLD</button>
      </div>
      <div id="control-betBtn" style={{ position: 'absolute', left: layout.betBtn?.left, top: layout.betBtn?.top, transform: 'translate(-50%, -50%)', ...sized(layout.betBtn) }} {...makeDragHandlers('betBtn')}>
        <button onClick={() => onBet?.(betAmount)} disabled={disabled || !available.includes('bet')} style={styleForStatus({ availableAction: available.includes('bet'), disabledGlobal: disabled, legal: true })}>BET</button>
      </div>
      <div id="control-raise" style={{ position: 'absolute', left: layout.raise?.left, top: layout.raise?.top, transform: 'translate(-50%, -50%)', ...sized(layout.raise) }} {...makeDragHandlers('raise')}>
        {(() => {
          const availableRaise = available.includes('raise')
          const callNeeded = Math.max(0, Math.floor(toCall || 0))
          const minExtra = Math.max(0, Math.floor(minRaiseExtra || 0))
          const desiredExtra = Math.max(0, Math.floor(betAmount - callNeeded))
          const legal = callNeeded > 0 && desiredExtra >= minExtra
          const isDisabled = disabled || !availableRaise || !legal
          return (
            <button onClick={() => {
              const extra = Math.max(desiredExtra, callNeeded > 0 ? minExtra : 0)
              onRaise?.(extra)
            }} disabled={isDisabled} style={styleForStatus({ availableAction: availableRaise, disabledGlobal: disabled, legal })}>RAISE</button>
          )
        })()}
      </div>
    </>
  )
}
