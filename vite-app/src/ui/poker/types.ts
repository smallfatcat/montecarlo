export type Rect = { left?: number; top?: number; width?: number; height?: number }

export type LayoutOverrides = {
  seats: Record<number, Rect>
  board?: Rect
  pot?: Rect
  showdown?: Rect
  bets?: Record<number, Rect>
  stacks?: Record<number, Rect>
  controls?: Rect
  controlsChildren?: Record<string, Rect>
  controlsBox?: { width?: number; height?: number }
}

export interface PokerTableViewHandle {
  exportLayoutToJson: () => void
  resetLayout: () => void
}

export interface LayoutEditorProps {
  editLayoutMode?: boolean
  onLayoutChange: (layout: LayoutOverrides) => void
  children: React.ReactNode
}
