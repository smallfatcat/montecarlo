import type { Socket } from 'socket.io-client'

// Table-related types
export interface TableSummary {
  tableId: string
  seats: number
  humans: number
  cpus: number
  status: string
  handId: number | null
  updatedAt: number
  reserved?: Array<{
    seatIndex: number
    playerName: string | null
    expiresAt: number
  }>
}

export interface TableConfig {
  tableId?: string
  seats: number
  startingStack: number
  blinds?: { small: number; big: number }
  gameType?: 'cash' | 'tournament' | 'sit-n-go'
  timeBank?: number
  autoStart?: boolean
  maxPlayers?: number
}

// Player-related types
export interface Player {
  name: string
  token: string | null
  isIdentified: boolean
  isIdentifying: boolean
}

// Connection-related types
export interface ConnectionState {
  socket: Socket | null
  isConnected: boolean
  connectionError: string | null
  isConnecting: boolean
}

// Filter and sorting types
export interface TableFilters {
  status: 'all' | 'waiting' | 'in-game' | 'finished'
  playerCount: 'all' | 'empty' | 'partial' | 'full'
  stakes: 'all' | 'low' | 'medium' | 'high'
  searchQuery: string
}

export interface SortOptions {
  field: 'updatedAt' | 'seats' | 'humans' | 'status'
  direction: 'asc' | 'desc'
}

// UI state types
export interface UIState {
  selectedTableId: string | null
  creatingTable: boolean
  refreshingTables: boolean
  showCreateTableModal: boolean
  showFilters: boolean
  viewMode: 'grid' | 'list' | 'compact'
}

// Lobby state interface
export interface LobbyState {
  // Connection state
  connection: ConnectionState
  
  // Player state
  player: Player
  
  // Tables state
  tables: TableSummary[]
  
  // UI state
  ui: UIState
  
  // Filters and sorting
  filters: TableFilters
  sortOptions: SortOptions
  
  // Computed values
  filteredTables: TableSummary[]
  sortedTables: TableSummary[]
  
  // Actions
  actions: LobbyActions
}

// Action interfaces
export interface LobbyActions {
  // Connection actions
  connectSocket: () => void
  disconnectSocket: () => void
  reconnectSocket: () => void
  
  // Player actions
  identifyPlayer: (name: string) => Promise<void>
  clearPlayer: () => void
  
  // Table actions
  createTable: (config: TableConfig) => Promise<void>
  joinTable: (tableId: string) => void
  spectateTable: (tableId: string) => void
  refreshTables: () => void
  
  // UI actions
  setSelectedTable: (tableId: string | null) => void
  setCreatingTable: (creating: boolean) => void
  toggleCreateTableModal: () => void
  toggleFilters: () => void
  setViewMode: (mode: UIState['viewMode']) => void
  
  // Filter and sort actions
  updateFilters: (filters: Partial<TableFilters>) => void
  clearFilters: () => void
  setSortOptions: (options: Partial<SortOptions>) => void
  
  // Utility actions
  resetState: () => void
}

// Store selector types
export type LobbySelector<T> = (state: LobbyState) => T

// Action result types
export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// Event types for real-time updates
export interface TableUpdateEvent {
  type: 'table_update' | 'table_removed' | 'table_created'
  data: TableSummary | { tableId: string }
}

// Error types
export interface LobbyError {
  code: string
  message: string
  details?: any
  timestamp: number
}
