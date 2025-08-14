import { useEffect, useRef, useState } from 'react'
import type { BettingActionType } from '../../poker/types'

type Rect = { left?: number; top?: number; width?: number; height?: number }
type ControlsLayout = Record<string, Rect>

export function PokerInlineControls(props: {
  available: BettingActionType[]
  disabled: boolean
  pot: number
  stack: number
  toCall?: number
  minOpen?: number
  onCheck?: () => void
  onCall?: () => void
  onFold?: () => void
  onBet?: (amount?: number) => void
  onRaise?: (amount?: number) => void
  scale?: number
  boxWidth?: number
  boxHeight?: number
  // Edit mode for positioning child elements
  editLayout?: boolean
  layout?: ControlsLayout
  onLayoutChange?: (next: ControlsLayout) => void
}) {
  const { available, disabled, pot, stack, toCall, minOpen, onCheck, onCall, onFold, onBet, onRaise, scale = 1, boxWidth = 320, boxHeight = 220, editLayout = false, layout, onLayoutChange } = props

  const [betAmount, setBetAmount] = useState<number>(0)
  const prevDisabledRef = useRef<boolean>(true)
  const minVal = (() => {
    const stackCapped = Math.max(0, Math.floor(stack || 0))
    const callNeeded = Math.max(0, Math.floor(toCall || 0))
    if (callNeeded > 0) return Math.min(stackCapped, callNeeded)
    const minOpenLocal = Math.max(1, Math.floor(minOpen || 1))
    return Math.min(stackCapped, minOpenLocal)
  })()
  const maxVal = Math.max(0, Math.floor(stack || 0))

  useEffect(() => {
    const callNeeded = Math.max(0, Math.floor(toCall || 0))
    const stackCapped = Math.max(0, Math.floor(stack || 0))
    const initHalfPot = Math.min(Math.floor((pot || 0) * 0.5), stackCapped)
    const init = callNeeded > 0 ? Math.min(callNeeded, stackCapped) : initHalfPot
    const wasDisabled = prevDisabledRef.current
    // Re-initialize when controls become enabled for a new turn
    if (wasDisabled && !disabled) setBetAmount(init)
    // If disabled, keep tracking; don't override mid-turn changes otherwise
    prevDisabledRef.current = disabled
  }, [disabled, pot, stack, toCall])

  // Clamp to current legal bounds when constraints change during the turn
  useEffect(() => {
    if (disabled) return
    setBetAmount((prev) => {
      const clamped = Math.max(minVal, Math.min(maxVal, Math.floor(prev)))
      return clamped
    })
  }, [toCall, minOpen, stack, disabled])

  const rootRef = useRef<HTMLDivElement | null>(null)

  const DEFAULTS: ControlsLayout = {
    check: { left: 70, top: 30 },
    call: { left: 70, top: 65 },
    fold: { left: 70, top: 100 },
    betBtn: { left: 70, top: 135 },
    raise: { left: 70, top: 170 },
    betLabel: { left: 230, top: 26 },
    betInput: { left: 290, top: 26 },
    potSlider: { left: 230, top: 120 },
    stackSlider: { left: 290, top: 120 },
    stackLabel: { left: 270, top: 200 },
  }

  const currentLayout: ControlsLayout = { ...DEFAULTS, ...(layout || {}) }

  function sized(rect?: Rect): React.CSSProperties {
    const style: React.CSSProperties = {}
    if (rect?.width != null) style.width = rect.width
    if (rect?.height != null) style.height = rect.height
    return style
  }

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

  function makeDragHandlers(key: keyof typeof DEFAULTS) {
    if (!editLayout) return {}
    return {
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation()
        const startX = e.clientX
        const startY = e.clientY
        const start = currentLayout[key] || {}
        const startLeft = (start.left ?? 0)
        const startTop = (start.top ?? 0)
        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startX
          const dy = ev.clientY - startY
          const snap = (v: number) => Math.round(v / 2) * 2
          const nextLeft = snap(startLeft + dx)
          const nextTop = snap(startTop + dy)
          const next: ControlsLayout = { ...(layout || {}) , [key]: { ...(layout?.[key] || {}), left: nextLeft, top: nextTop } }
          onLayoutChange?.(next)
        }
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      }
    }
  }

  return (
    <div
      ref={rootRef}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        width: boxWidth,
        height: boxHeight,
        padding: 10,
        borderRadius: 14,
        background: 'rgba(0,0,0,0.28)',
        border: '1px solid rgba(255,255,255,0.18)',
        position: 'relative',
      }}
    >
      {/* Buttons column */}
      <div id="control-check" style={{ position: 'absolute', left: currentLayout.check.left, top: currentLayout.check.top, transform: 'translate(-50%, -50%)', ...sized(currentLayout.check) }} {...makeDragHandlers('check')}>
        <button onClick={() => onCheck?.()} disabled={disabled || !available.includes('check')} style={styleFor('check')}>CHECK</button>
      </div>
      <div id="control-call" style={{ position: 'absolute', left: currentLayout.call.left, top: currentLayout.call.top, transform: 'translate(-50%, -50%)', ...sized(currentLayout.call) }} {...makeDragHandlers('call')}>
        <button onClick={() => onCall?.()} disabled={disabled || !available.includes('call')} style={styleFor('call')}>CALL</button>
      </div>
      <div id="control-fold" style={{ position: 'absolute', left: currentLayout.fold.left, top: currentLayout.fold.top, transform: 'translate(-50%, -50%)', ...sized(currentLayout.fold) }} {...makeDragHandlers('fold')}>
        <button onClick={() => onFold?.()} disabled={disabled || !available.includes('fold')} style={styleFor('fold')}>FOLD</button>
      </div>
      <div id="control-betBtn" style={{ position: 'absolute', left: currentLayout.betBtn.left, top: currentLayout.betBtn.top, transform: 'translate(-50%, -50%)', ...sized(currentLayout.betBtn) }} {...makeDragHandlers('betBtn')}>
        <button onClick={() => onBet?.(betAmount)} disabled={disabled || !available.includes('bet')} style={styleFor('bet')}>BET</button>
      </div>
      <div id="control-raise" style={{ position: 'absolute', left: currentLayout.raise.left, top: currentLayout.raise.top, transform: 'translate(-50%, -50%)', ...sized(currentLayout.raise) }} {...makeDragHandlers('raise')}>
        <button onClick={() => {
          const callNeeded = Math.max(0, Math.floor(toCall || 0))
          const extra = Math.max(0, betAmount - callNeeded)
          onRaise?.(extra)
        }} disabled={disabled || !available.includes('raise')} style={styleFor('raise')}>RAISE</button>
      </div>

      {/* Right column: Bet label/input */}
      <div id="control-betLabel" style={{ position: 'absolute', left: currentLayout.betLabel.left, top: currentLayout.betLabel.top, transform: 'translate(-50%, -50%)', ...sized(currentLayout.betLabel) }} {...makeDragHandlers('betLabel')}>
        <span style={{ opacity: 0.9, display: 'inline-block', width: '100%' }}>Bet:</span>
      </div>
      <div id="control-betInput" style={{ position: 'absolute', left: currentLayout.betInput.left, top: currentLayout.betInput.top, transform: 'translate(-50%, -50%)', ...sized(currentLayout.betInput) }} {...makeDragHandlers('betInput')}>
        <input
          type="number"
          value={betAmount}
          min={minVal}
          max={maxVal}
          onChange={(e) => {
            const raw = Math.floor(parseInt(e.target.value || '0'))
            const clamped = Math.max(minVal, Math.min(maxVal, raw))
            setBetAmount(clamped)
          }}
          style={{ width: currentLayout.betInput.width ?? 100, padding: '4px 6px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', color: 'inherit' }}
        />
      </div>

      {/* Sliders */}
      <div id="control-potSlider" style={{ position: 'absolute', left: currentLayout.potSlider.left, top: currentLayout.potSlider.top, transform: 'translate(-50%, -50%)', ...sized(currentLayout.potSlider) }} {...makeDragHandlers('potSlider')}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%', height: '100%' }}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            onChange={(e) => {
              const pct = Math.max(0, Math.min(100, parseInt(e.target.value || '0')))
              const target = Math.floor((pot || 0) * (pct / 100))
              // When facing a bet, ensure total includes at least toCall
              const callNeeded = Math.max(0, Math.floor(toCall || 0))
              const desired = callNeeded > 0 ? Math.max(callNeeded, target) : target
              const clamped = Math.max(minVal, Math.min(maxVal, desired))
              setBetAmount(clamped)
            }}
            title="% of pot"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', width: currentLayout.potSlider.height ?? 120, height: currentLayout.potSlider.width ?? 24 }}
          />
          <span style={{ fontSize: 12, opacity: 0.8 }}>Pot%</span>
        </div>
      </div>
      <div id="control-stackSlider" style={{ position: 'absolute', left: currentLayout.stackSlider.left, top: currentLayout.stackSlider.top, transform: 'translate(-50%, -50%)', ...sized(currentLayout.stackSlider) }} {...makeDragHandlers('stackSlider')}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%', height: '100%' }}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            onChange={(e) => {
              const pct = Math.max(0, Math.min(100, parseInt(e.target.value || '0')))
              const target = Math.floor((stack || 0) * (pct / 100))
              const callNeeded = Math.max(0, Math.floor(toCall || 0))
              const desired = callNeeded > 0 ? Math.max(callNeeded, target) : target
              const clamped = Math.max(minVal, Math.min(maxVal, desired))
              setBetAmount(clamped)
            }}
            title="% of stack"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', width: currentLayout.stackSlider.height ?? 120, height: currentLayout.stackSlider.width ?? 24 }}
          />
          <span style={{ fontSize: 12, opacity: 0.8 }}>Stack%</span>
        </div>
      </div>

      {/* Stack label */}
      <div id="control-stackLabel" style={{ position: 'absolute', left: currentLayout.stackLabel.left, top: currentLayout.stackLabel.top, transform: 'translate(-50%, -50%)', ...sized(currentLayout.stackLabel) }} {...makeDragHandlers('stackLabel')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, width: currentLayout.stackLabel.width ?? 120 }}>
          <span style={{ opacity: 0.9 }}>Stack:</span>
          <span style={{ opacity: 0.95 }}>{stack}</span>
        </div>
      </div>
    </div>
  )
}


