import { useEffect, useState } from 'react'
import './PokerSliders.css'

export interface PokerPotSliderProps {
  pot: number
  betAmount: number
  setBetAmountSafe: (value: number) => void
  layout: { left?: number; top?: number; width?: number; height?: number }
  labelLayout?: { left?: number; top?: number; width?: number; height?: number }
  editLayout: boolean
  onLayoutChange?: (layout: Record<string, { left?: number; top?: number; width?: number; height?: number }>) => void
}

export function PokerPotSlider({
  pot,
  betAmount,
  setBetAmountSafe,
  layout,
  labelLayout,
  editLayout,
  onLayoutChange
}: PokerPotSliderProps) {
  function makeDragHandlers(key: string, rect?: { left?: number; top?: number; width?: number; height?: number }) {
    if (!editLayout) return {}
    return {
      onMouseDown: (e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        if (target && (target.tagName === 'INPUT' || target.closest('input,button,select,textarea'))) {
          // Allow normal interaction with inputs/buttons; do not drag
          return
        }
        e.preventDefault(); e.stopPropagation()
        const startX = e.clientX
        const startY = e.clientY
        const start = rect || {}
        const startLeft = (start.left ?? 0)
        const startTop = (start.top ?? 0)
        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startX
          const dy = ev.clientY - startY
          const snap = (v: number) => Math.round(v / 2) * 2
          const nextLeft = snap(startLeft + dx)
          const nextTop = snap(startTop + dy)
          const next = { [key]: { ...(rect || {}), left: nextLeft, top: nextTop } }
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

  const computePctFromBet = (bet: number) => {
    const high = Math.max(0, Math.floor(pot))
    if (high === 0) return 0
    const clamped = Math.max(0, Math.min(high, Math.floor(bet)))
    const pct = Math.round((clamped / high) * 100)
    return Math.max(0, Math.min(100, pct))
  }

  const [sliderPct, setSliderPct] = useState<number>(computePctFromBet(betAmount))

  // When legal bounds change (e.g., new street or stack change), rebase the slider to current bet
  useEffect(() => {
    setSliderPct(computePctFromBet(betAmount))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [betAmount, pot])

  // percentage shown inline in label below

  return (
    <>
      <div id="control-potSlider" style={{ position: 'absolute', left: layout.left, top: layout.top, transform: 'translate(-50%, -50%)', ...sized(layout) }} {...makeDragHandlers('potSlider', layout)}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%', height: '100%' }}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={sliderPct}
            onChange={(e) => {
              const pct = Math.max(0, Math.min(100, parseInt(e.target.value || '0')))
              const high = Math.max(0, Math.floor(pot))
              const target = Math.floor(high * (pct / 100))
              const desired = target
              setBetAmountSafe(desired)
              setSliderPct(pct)
            }}
            title="% of pot"
            className="vertical-slider"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', width: layout.height ?? 120, height: layout.width ?? 24 }}
          />
        </div>
      </div>
      {(() => {
        const computedLabelLayout = labelLayout || { left: layout.left, top: (layout.top ?? 0) + (layout.height ?? 120) + 10, width: layout.width }
        return (
          <div id="control-potSliderLabel" style={{ position: 'absolute', left: computedLabelLayout.left, top: computedLabelLayout.top, transform: 'translate(-50%, -50%)', pointerEvents: editLayout ? 'auto' : 'none', ...sized(computedLabelLayout) }} {...makeDragHandlers('potSliderLabel', computedLabelLayout)}>
            <span style={{ fontSize: 12, opacity: 0.9, userSelect: 'none' }}>Pot% {(() => {
              const high = Math.max(0, Math.floor(pot))
              if (high === 0) return '(0%)'
              const pct = Math.min(100, Math.round((Math.max(0, Math.min(high, Math.floor(betAmount))) / high) * 100))
              return `(${pct}%)`
            })()}</span>
          </div>
        )
      })()}
    </>
  )
}
