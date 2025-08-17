import React, { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react'
import type { LayoutOverrides } from '../types'
import './PokerTableLayout.css'

// Create a context for the drag system
const DragSystemContext = createContext<any>(null)

// Hook to use the drag system
export const useDragSystem = () => {
  const context = useContext(DragSystemContext)
  if (!context) {
    // Return a dummy drag system when context is not available
    return {
      registerDraggable: () => {},
      unregisterDraggable: () => {},
      isDragging: () => false,
      getCurrentLayout: () => ({}),
      isEditMode: false
    }
  }
  return context
}

export interface PokerTableLayoutProps {
  editLayoutMode?: boolean
  onLayoutChange: (layout: LayoutOverrides) => void
  children: React.ReactNode
}

// Interface for draggable objects
interface DraggableObject {
  id: string
  type: 'seat' | 'board' | 'pot' | 'stack' | 'bet' | 'control' | 'showdown'
  element: HTMLElement
  getLayout: () => any
  setLayout: (layout: any) => void
  priority: number // Higher priority = more likely to be selected
}

export function PokerTableLayout({ editLayoutMode, onLayoutChange, children }: PokerTableLayoutProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [layoutOverrides, setLayoutOverrides] = useState<LayoutOverrides>({ seats: {} })
  const defaultFromFileRef = useRef<LayoutOverrides | null>(null)
  const draggableObjectsRef = useRef<Map<string, DraggableObject>>(new Map())
  const currentLayoutRef = useRef<LayoutOverrides>({ seats: {} })
  const dragStateRef = useRef<{
    isDragging: boolean
    currentObject: DraggableObject | null
    startX: number
    startY: number
    startLayout: any
  }>({
    isDragging: false,
    currentObject: null,
    startX: 0,
    startY: 0,
    startLayout: null
  })

  const GRID_SIZE = 10
  const MAJOR_GRID_SIZE = 50

  // Allowed child keys for simplified control box schema
  const ALLOWED_CONTROL_KEYS = [
    'checkBtn', 'callBtn', 'foldBtn', 'betBtn', 'raiseBtn',
    'betBox', 'potSlider', 'stackSlider', 'stackLabel',
  ] as const

  type AllowedControlKey = typeof ALLOWED_CONTROL_KEYS[number]

  function sanitizeControlsChildren(input: Record<string, any> | undefined | null): Record<AllowedControlKey, any> {
    if (!input || typeof input !== 'object') return {} as any
    const entries = Object.entries(input).filter(([k]) => (ALLOWED_CONTROL_KEYS as readonly string[]).includes(k))
    return Object.fromEntries(entries) as any
  }

  // Register a draggable object
  const registerDraggable = useCallback((draggable: DraggableObject) => {
    // Wrap the setLayout function to provide real-time visual feedback
    const wrappedDraggable = {
      ...draggable,
      setLayout: (newLayout: any) => {
        // Call the original setLayout for real-time visual updates
        draggable.setLayout(newLayout)
        
        // Also update the local layoutOverrides state
        setLayoutOverrides(prev => {
          const updated = { ...prev }
          
          // Update the appropriate section based on the draggable type
          switch (draggable.type) {
            case 'seat':
              // Extract just the seat index number from the ID (remove "seat-" prefix)
              const seatIdx = draggable.id.replace('seat-', '')
              updated.seats = { ...prev.seats, [seatIdx]: newLayout }
              break
            case 'board':
              updated.board = newLayout
              break
            case 'pot':
              updated.pot = newLayout
              break
            case 'stack':
              const stackSeatIdx = draggable.id.replace('stack-', '')
              updated.stacks = { ...prev.stacks, [stackSeatIdx]: newLayout }
              break
            case 'bet':
              const betSeatIdx = draggable.id.replace('bet-', '')
              updated.bets = { ...prev.bets, [betSeatIdx]: newLayout }
              break
            case 'control':
              updated.controls = newLayout
              break
            case 'showdown':
              updated.showdown = newLayout
              break
          }
          
          // Update the ref with the new state
          currentLayoutRef.current = updated
          return updated
        })
      }
    }
    
    draggableObjectsRef.current.set(draggable.id, wrappedDraggable)
  }, [])

  // Unregister a draggable object
  const unregisterDraggable = useCallback((id: string) => {
    draggableObjectsRef.current.delete(id)
  }, [])

  // Find the closest draggable object to the mouse pointer
  const findClosestDraggable = useCallback((mouseX: number, mouseY: number): DraggableObject | null => {
    let closest: DraggableObject | null = null
    let closestDistance = Infinity

    for (const draggable of draggableObjectsRef.current.values()) {
      const rect = draggable.element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const distance = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2)
      
      // Apply priority bonus (higher priority objects are more likely to be selected)
      const adjustedDistance = distance / draggable.priority
      
      if (adjustedDistance < closestDistance) {
        closestDistance = adjustedDistance
        closest = draggable
      }
    }

    return closest
  }, [])

  // Grid snapping with boundary constraints
  const snapToGrid = useCallback((value: number, min: number, max: number): number => {
    const snapped = Math.round(value / GRID_SIZE) * GRID_SIZE
    return Math.max(min, Math.min(max, snapped))
  }, [])

  // Handle mouse down for drag initiation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!editLayoutMode) return

    // Check if the click target is actually a draggable component
    const target = e.target as HTMLElement
    let clickedOnDraggable = false
    
    // Check if the click target or any of its parents is a registered draggable
    for (const draggable of draggableObjectsRef.current.values()) {
      if (draggable.element === target || draggable.element.contains(target)) {
        clickedOnDraggable = true
        break
      }
    }
    
    // Only proceed if we clicked on a draggable component
    if (!clickedOnDraggable) return

    const closest = findClosestDraggable(e.clientX, e.clientY)
    if (!closest) return

    e.preventDefault()
    e.stopPropagation()

    const startLayout = closest.getLayout()
    dragStateRef.current = {
      isDragging: true,
      currentObject: closest,
      startX: e.clientX,
      startY: e.clientY,
      startLayout: { ...startLayout }
    }

    // Add global mouse event listeners
    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragStateRef.current.isDragging || !dragStateRef.current.currentObject) return

      const { startX, startY, startLayout } = dragStateRef.current
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY

      // Get container bounds for boundary constraints
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!containerRect) return

      // Calculate new position with grid snapping and boundary constraints
      const newLeft = snapToGrid(
        (startLayout.left || 0) + dx,
        0,
        containerRect.width - (startLayout.width || 100)
      )
      const newTop = snapToGrid(
        (startLayout.top || 0) + dy,
        0,
        containerRect.height - (startLayout.height || 100)
      )

      // Update the object's layout - this will update both visual position and layout state
      const newLayout = { ...startLayout, left: newLeft, top: newTop }
      dragStateRef.current.currentObject.setLayout(newLayout)
    }

    const handleMouseUp = () => {
      if (dragStateRef.current.isDragging && dragStateRef.current.currentObject) {
        // Finalize the layout change - use the ref to get current state
        onLayoutChange(currentLayoutRef.current)
      }

      dragStateRef.current = {
        isDragging: false,
        currentObject: null,
        startX: 0,
        startY: 0,
        startLayout: null
      }

      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [editLayoutMode, findClosestDraggable, snapToGrid, onLayoutChange])

  // Expose the drag system to child components
  const dragSystem = {
    registerDraggable,
    unregisterDraggable,
    isDragging: () => dragStateRef.current.isDragging,
    getCurrentLayout: () => currentLayoutRef.current,
    isEditMode: editLayoutMode
  }

  useEffect(() => {
    let applied = false
    
    // Try to load layout from file with a small delay to ensure dev server is ready
    const loadLayout = () => {
      console.log('[PokerTableLayout] Attempting to load layout from /horseshoe-layout.json')
      fetch('/horseshoe-layout.json')
        .then(response => {
          console.log('[PokerTableLayout] Response status:', response.status, response.statusText)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          console.log('[PokerTableLayout] About to parse JSON...')
          // Log the first 200 characters of the response to debug
          return response.text().then(text => {
            console.log('[PokerTableLayout] Response text (first 200 chars):', text.substring(0, 200))
            try {
              return JSON.parse(text)
            } catch (parseError) {
              console.error('[PokerTableLayout] JSON parse failed, response starts with:', text.substring(0, 50))
              throw parseError
            }
          })
        })
        .then((data) => {
          console.log('[PokerTableLayout] JSON parsed successfully, data type:', typeof data, 'keys:', data ? Object.keys(data) : 'null')
          console.log('[PokerTableLayout] Raw data:', data)
          if (data && typeof data === 'object') {
            console.log('[PokerTableLayout] Layout data loaded successfully')
            const seats = (data as any).seats ?? {}
            const next: LayoutOverrides = {
              seats: typeof seats === 'object' && seats ? seats : {},
              board: (data as any).board,
              pot: (data as any).pot,
              showdown: (data as any).showdown,
              bets: (data as any).bets ?? {},
              stacks: (data as any).stacks ?? {},
              controls: (data as any).controls ?? {},
              controlsChildren: sanitizeControlsChildren((data as any).controlsChildren ?? {}),
              controlsBox: (data as any).controlsBox ?? {},
            }
            
            defaultFromFileRef.current = next
            setLayoutOverrides(next)
            currentLayoutRef.current = next
            onLayoutChange(next)
            applied = true
          } else {
            console.log('[PokerTableLayout] Data validation failed - data:', data, 'type:', typeof data)
            throw new Error('Invalid layout data format')
          }
        })
        .catch((parseError) => {
          console.error('[PokerTableLayout] JSON parsing error:', parseError)
          throw parseError
        })
        .catch((error) => {
          if (!applied) {
            // Only log as info in development, warn in production
            if (import.meta.env.DEV) {
              console.info('[PokerTableLayout] Using default layout (layout file not available or invalid)')
            } else {
              console.warn('[PokerTableLayout] Failed to load layout from file, using defaults:', error)
            }
            
            // Set a minimal default layout to ensure seats are visible
            const defaultLayout: LayoutOverrides = {
              seats: {},
              board: undefined,
              pot: undefined,
              showdown: undefined,
              bets: {},
              stacks: {},
              controls: undefined,
              controlsChildren: {},
              controlsBox: undefined,
            }
            setLayoutOverrides(defaultLayout)
            currentLayoutRef.current = defaultLayout
            onLayoutChange(defaultLayout)
          }
        })
    }
    
    // Small delay to ensure dev server is ready
    const timer = setTimeout(loadLayout, 100)
    
    return () => clearTimeout(timer)
  }, [onLayoutChange])

  const exportLayoutToJson = () => {
    // Use the most up-to-date layout data
    const exportData = currentLayoutRef.current || layoutOverrides
    
    // Ensure we have all the expected structure
    const completeLayout = {
      seats: exportData.seats || {},
      board: exportData.board,
      pot: exportData.pot,
      showdown: exportData.showdown,
      bets: exportData.bets || {},
      stacks: exportData.stacks || {},
      controls: exportData.controls,
      controlsChildren: sanitizeControlsChildren(exportData.controlsChildren || {}),
      controlsBox: exportData.controlsBox,
    }
    
    const dataStr = JSON.stringify(completeLayout, null, 2)
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
      currentLayoutRef.current = defaultFromFileRef.current
      onLayoutChange(defaultFromFileRef.current)
    }
  }

  return (
    <DragSystemContext.Provider value={dragSystem}>
      <div ref={containerRef} className={editLayoutMode ? "poker-table-layout-editor" : ""}>
        {editLayoutMode && (
          <div className="layout-controls">
            <button onClick={exportLayoutToJson}>Export Layout</button>
            <button onClick={resetLayout}>Reset Layout</button>
          </div>
        )}
        <div 
          className={editLayoutMode ? "layout-grid" : ""}
          style={{ position: 'relative', width: '100%', height: '100%' }}
          onMouseDown={editLayoutMode ? handleMouseDown : undefined}
        >
          {/* Grid overlay for visual alignment - only in edit mode */}
          {editLayoutMode && (
                      <svg>
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
          )}
          
          {/* Render children */}
          {children}
        </div>
      </div>
    </DragSystemContext.Provider>
  )
}
