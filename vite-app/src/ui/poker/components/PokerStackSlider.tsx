export interface PokerStackSliderProps {
  stack: number
  betAmount: number
  toCall?: number
  setBetAmountSafe: (value: number) => void
  layout: { left?: number; top?: number; width?: number; height?: number }
  editLayout: boolean
  onLayoutChange?: (layout: Record<string, { left?: number; top?: number; width?: number; height?: number }>) => void
}

export function PokerStackSlider({
  stack,
  betAmount,
  toCall,
  setBetAmountSafe,
  layout,
  editLayout,
  onLayoutChange
}: PokerStackSliderProps) {
  function makeDragHandlers(key: string) {
    if (!editLayout) return {}
    return {
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation()
        const startX = e.clientX
        const startY = e.clientY
        const start = layout || {}
        const startLeft = (start.left ?? 0)
        const startTop = (start.top ?? 0)
        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startX
          const dy = ev.clientY - startY
          const snap = (v: number) => Math.round(v / 2) * 2
          const nextLeft = snap(startLeft + dx)
          const nextTop = snap(startTop + dy)
          const next = { [key]: { ...(layout || {}), left: nextLeft, top: nextTop } }
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

  const currentSliderValue = (() => {
    // Calculate current slider position based on bet amount
    if (stack === 0 || betAmount === 0) return 0
    const callNeeded = Math.max(0, Math.floor(toCall || 0))
    const effectiveBet = callNeeded > 0 ? betAmount - callNeeded : betAmount
    const percentage = Math.min(100, Math.floor((effectiveBet / stack) * 100))
    return Math.max(0, percentage)
  })()

  const stackPercentage = (() => {
    if (stack === 0 || betAmount === 0) return ''
    const callNeeded = Math.max(0, Math.floor(toCall || 0))
    const effectiveBet = callNeeded > 0 ? betAmount - callNeeded : betAmount
    const percentage = Math.min(100, Math.floor((effectiveBet / stack) * 100))
    return `(${percentage}%)`
  })()

  return (
    <div id="control-stackSlider" style={{ position: 'absolute', left: layout.left, top: layout.top, transform: 'translate(-50%, -50%)', ...sized(layout) }} {...makeDragHandlers('stackSlider')}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%', height: '100%' }}>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={currentSliderValue}
          onChange={(e) => {
            const pct = Math.max(0, Math.min(100, parseInt(e.target.value || '0')))
            const target = Math.floor((stack || 0) * (pct / 100))
            const callNeeded = Math.max(0, Math.floor(toCall || 0))
            const desired = callNeeded > 0 ? Math.max(callNeeded, target) : target
            setBetAmountSafe(desired)
          }}
          title="% of stack"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', width: layout.height ?? 120, height: layout.width ?? 24 }}
        />
        <span style={{ fontSize: 12, opacity: 0.8 }}>
          Stack% {stackPercentage}
        </span>
      </div>
    </div>
  )
}
