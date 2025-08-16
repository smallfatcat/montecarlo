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
        alignItems: 'center',
        justifyContent: 'space-between',
        width: layout.width ?? 160,
        height: layout.height != null ? '100%' : undefined,
        boxSizing: 'border-box',
        overflow: 'hidden',
        padding: '6px 10px',
        background: 'rgba(15, 26, 15, 0.9)',
        borderRadius: '6px',
        border: '2px solid #fbbf24'
      }}>
        <span style={{ 
          color: '#fbbf24', 
          fontWeight: 600, 
          fontSize: '14px', 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px'
        }}>
          Stack:
        </span>
        <span style={{ 
          fontSize: '14px',
          fontWeight: 600,
          color: '#fbbf24'
        }}>
          ${stack}
        </span>
      </div>
    </div>
  )
}
