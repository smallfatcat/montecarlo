export interface PokerStackLabelProps {
  stack: number
  layout: { left?: number; top?: number; width?: number; height?: number }
  editLayout: boolean
  onLayoutChange?: (layout: Record<string, { left?: number; top?: number; width?: number; height?: number }>) => void
}

export function PokerStackLabel({
  stack,
  layout,
  editLayout,
  onLayoutChange
}: PokerStackLabelProps) {
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

  return (
    <div id="control-stackLabel" style={{ position: 'absolute', left: layout.left, top: layout.top, transform: 'translate(-50%, -50%)', ...sized(layout) }} {...makeDragHandlers('stackLabel')}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        fontWeight: 600, 
        width: layout.width ?? 120,
        padding: '4px 8px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <span style={{ opacity: 0.9, fontSize: '12px' }}>Stack:</span>
        <span style={{ 
          opacity: 0.95, 
          fontSize: '13px',
          fontWeight: 700,
          color: '#ffd54f',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
        }}>${stack}</span>
      </div>
    </div>
  )
}
