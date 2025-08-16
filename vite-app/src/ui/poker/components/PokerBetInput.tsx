export interface PokerBetInputProps {
  betAmount: number
  minVal: number
  maxVal: number
  toCall?: number
  setBetAmountSafe: (value: number) => void
  layout: { left?: number; top?: number; width?: number; height?: number }
  inputLayout?: { left?: number; top?: number; width?: number; height?: number }
  editLayout: boolean
  onLayoutChange?: (layout: Record<string, { left?: number; top?: number; width?: number; height?: number }>) => void
}

export function PokerBetInput({
  betAmount,
  minVal,
  maxVal,
  toCall,
  setBetAmountSafe,
  layout,
  inputLayout,
  editLayout,
  onLayoutChange
}: PokerBetInputProps) {
  function makeDragHandlers(key: string, rect?: { left?: number; top?: number; width?: number; height?: number }) {
    if (!editLayout) return {}
    return {
      onMouseDown: (e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        if (target && (target.tagName === 'INPUT' || target.closest('input,button,select,textarea'))) {
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

  return (
    <>
      <div id="control-betLabel" style={{ position: 'absolute', left: layout.left, top: layout.top, transform: 'translate(-50%, -50%)', ...sized(layout) }} {...makeDragHandlers('betLabel', layout)}>
        <span style={{ opacity: 0.9, display: 'inline-block', width: '100%' }}>
          Bet: {betAmount > 0 ? `$${betAmount}` : ''}
        </span>
      </div>
      <div id="control-betInput" style={{ position: 'absolute', left: (inputLayout?.left ?? layout.left), top: (inputLayout?.top ?? ((layout.top || 0) + 30)), transform: 'translate(-50%, -50%)', ...sized(inputLayout || layout) }} {...makeDragHandlers('betInput', inputLayout || layout)}>
        <input
          type="number"
          value={betAmount}
          min={minVal}
          max={maxVal}
          step={1}
          title={`Bet amount: $${minVal} - $${maxVal}${(toCall || 0) > 0 ? ` (must call at least $${toCall})` : ''}`}
          onChange={(e) => {
            const inputValue = e.target.value
            if (inputValue === '') {
              // Allow empty input temporarily for better UX
              setBetAmountSafe(0)
              return
            }
            const parsed = parseInt(inputValue, 10)
            if (isNaN(parsed)) {
              // Invalid input, reset to current value
              return
            }
            setBetAmountSafe(parsed)
          }}
          onBlur={(e) => {
            // Ensure value is clamped when input loses focus
            const inputValue = e.target.value
            if (inputValue === '' || isNaN(parseInt(inputValue, 10))) {
              setBetAmountSafe(minVal)
            }
          }}
          style={{ 
            width: (inputLayout?.width ?? layout.width ?? 100), 
            padding: '4px 6px', 
            borderRadius: 8, 
            border: `1px solid ${betAmount === minVal || betAmount === maxVal ? 'rgba(255,255,0,0.5)' : 'rgba(255,255,255,0.25)'}`, 
            background: betAmount === minVal || betAmount === maxVal ? 'rgba(255,255,0,0.1)' : 'rgba(255,255,255,0.06)', 
            color: 'inherit',
            textAlign: 'center'
          }}
        />
      </div>
    </>
  )
}
