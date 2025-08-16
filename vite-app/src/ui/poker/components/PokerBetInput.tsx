export interface PokerBetInputProps {
  betAmount: number
  minVal: number
  maxVal: number
  toCall?: number
  setBetAmountSafe: (value: number) => void
  // Single rectangle to contain label + input (mandatory in new schema)
  boxLayout: { left?: number; top?: number; width?: number; height?: number }
  editLayout: boolean
  onLayoutChange?: (layout: Record<string, { left?: number; top?: number; width?: number; height?: number }>) => void
}

export function PokerBetInput({
  betAmount,
  minVal,
  maxVal,
  toCall,
  setBetAmountSafe,
  boxLayout,
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
      <div id="control-betBox" style={{ position: 'absolute', left: boxLayout.left, top: boxLayout.top, transform: 'translate(-50%, -50%)', ...sized(boxLayout) }} {...makeDragHandlers('betBox', boxLayout)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', height: '100%', boxSizing: 'border-box' }}>
          <label style={{ 
            color: '#fbbf24', 
            fontWeight: 600, 
            fontSize: '14px', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap'
          }}>
            Bet:
          </label>
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
              width: (boxLayout?.width ?? 100), 
              padding: '6px 10px', 
              borderRadius: 6, 
              border: '2px solid #fbbf24', 
              background: 'rgba(15, 26, 15, 0.9)', 
              color: 'var(--color-neutral-50)',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 500,
              minWidth: '60px'
            }}
            className="poker-bet-input"
          />
        </div>
      </div>
    </>
  )
}
