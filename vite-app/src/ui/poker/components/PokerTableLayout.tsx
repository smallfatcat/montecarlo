import { useEffect, useRef, useState } from 'react'
import type { LayoutOverrides } from '../types'

export interface PokerTableLayoutProps {
  editLayoutMode?: boolean
  onLayoutChange: (layout: LayoutOverrides) => void
  children: React.ReactNode
}

export function PokerTableLayout({ editLayoutMode, onLayoutChange, children }: PokerTableLayoutProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [layoutOverrides, setLayoutOverrides] = useState<LayoutOverrides>({ seats: {} })
  const defaultFromFileRef = useRef<LayoutOverrides | null>(null)

  const GRID_SIZE = 10
  const MAJOR_GRID_SIZE = 50

  useEffect(() => {
    let applied = false
    fetch('./horseshoe-layout.json')
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        if (data && typeof data === 'object') {
          const seats = (data as any).seats ?? {}
          const next: LayoutOverrides = {
            seats: typeof seats === 'object' && seats ? seats : {},
            board: (data as any).board,
            pot: (data as any).pot,
            showdown: (data as any).showdown,
            bets: (data as any).bets ?? {},
            stacks: (data as any).stacks ?? {},
            controls: (data as any).controls,
            controlsChildren: (data as any).controlsChildren ?? {},
            controlsBox: (data as any).controlsBox ?? {},
          }


          defaultFromFileRef.current = next
          setLayoutOverrides(next)
          onLayoutChange(next)
          applied = true
        }
      })
      .catch(() => {
        if (!applied) {
          console.warn('Failed to load layout from file, using defaults')
        }
      })
  }, [onLayoutChange])

  const exportLayoutToJson = () => {
    const dataStr = JSON.stringify(layoutOverrides, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'horseshoe-layout.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const resetLayout = () => {
    if (defaultFromFileRef.current) {
      setLayoutOverrides(defaultFromFileRef.current)
      onLayoutChange(defaultFromFileRef.current)
    }
  }



  if (!editLayoutMode) {
    return <div ref={containerRef}>{children}</div>
  }

  return (
    <div ref={containerRef} className="poker-table-layout-editor">
      <div className="layout-controls">
        <button onClick={exportLayoutToJson}>Export Layout</button>
        <button onClick={resetLayout}>Reset Layout</button>
      </div>
      <div className="layout-grid">
        {/* Grid overlay for visual alignment */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <defs>
            <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#ddd" strokeWidth="0.5" />
            </pattern>
            <pattern id="majorGrid" width={MAJOR_GRID_SIZE} height={MAJOR_GRID_SIZE} patternUnits="userSpaceOnUse">
              <path d={`M ${MAJOR_GRID_SIZE} 0 L 0 0 0 ${MAJOR_GRID_SIZE}`} fill="none" stroke="#999" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#majorGrid)" />
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {children}
      </div>
    </div>
  )
}
