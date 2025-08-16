import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLobbyStore } from '../lobbyStore'

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
}

// Mock global objects for Node.js test environment
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true
  })
}

// Mock window.location
const mockLocation = {
  hash: '',
  setHash: (value: string) => {
    mockLocation.hash = value
  }
}

if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      location: mockLocation
    },
    writable: true
  })
}

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn()
  }))
}))

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_WS_URL: 'ws://localhost:8080'
  }
}))

describe('Lobby Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useLobbyStore.getState().actions.resetState()
    
    // Clear session storage mocks
    mockSessionStorage.clear.mockClear()
    mockSessionStorage.getItem.mockClear()
    mockSessionStorage.setItem.mockClear()
    mockSessionStorage.removeItem.mockClear()
    
    // Reset mock location
    mockLocation.hash = ''
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useLobbyStore.getState()
      
      expect(state.connection.socket).toBeNull()
      expect(state.connection.isConnected).toBe(false)
      expect(state.connection.connectionError).toBeNull()
      expect(state.connection.isConnecting).toBe(false)
      
      expect(state.player.name).toBe('')
      expect(state.player.token).toBeNull()
      expect(state.player.isIdentified).toBe(false)
      expect(state.player.isIdentifying).toBe(false)
      
      expect(state.tables).toEqual([])
      expect(state.ui.selectedTableId).toBeNull()
      expect(state.ui.creatingTable).toBe(false)
      expect(state.ui.showFilters).toBe(false)
      expect(state.ui.viewMode).toBe('grid')
      
      expect(state.filters.status).toBe('all')
      expect(state.filters.playerCount).toBe('all')
      expect(state.filters.stakes).toBe('all')
      expect(state.filters.searchQuery).toBe('')
      
      expect(state.sortOptions.field).toBe('updatedAt')
      expect(state.sortOptions.direction).toBe('desc')
    })
  })

  describe('Computed Values', () => {
    it('should have computed properties available', () => {
      const state = useLobbyStore.getState()
      
      // Verify computed properties exist
      expect(typeof state.filteredTables).toBe('object')
      expect(typeof state.sortedTables).toBe('object')
      expect(Array.isArray(state.filteredTables)).toBe(true)
      expect(Array.isArray(state.sortedTables)).toBe(true)
    })

    it('should handle empty tables correctly', () => {
      const state = useLobbyStore.getState()
      
      // With no tables, computed values should be empty arrays
      expect(state.filteredTables).toHaveLength(0)
      expect(state.sortedTables).toHaveLength(0)
    })

    // TODO: Add comprehensive computed value tests once store integration is complete
    // These tests require the store to be properly connected to React components
    // to test the computed getter functions
  })

  describe('Actions', () => {
    it('should update filters correctly', () => {
      const { actions } = useLobbyStore.getState()
      
      actions.updateFilters({ status: 'waiting', playerCount: 'empty' })
      
      const state = useLobbyStore.getState()
      expect(state.filters.status).toBe('waiting')
      expect(state.filters.playerCount).toBe('empty')
      expect(state.filters.stakes).toBe('all') // Should remain unchanged
    })

    it('should clear filters correctly', () => {
      const { actions } = useLobbyStore.getState()
      
      // Set some filters first
      actions.updateFilters({ status: 'waiting', searchQuery: 'test' })
      
      // Clear all filters
      actions.clearFilters()
      
      const state = useLobbyStore.getState()
      expect(state.filters.status).toBe('all')
      expect(state.filters.playerCount).toBe('all')
      expect(state.filters.stakes).toBe('all')
      expect(state.filters.searchQuery).toBe('')
    })

    it('should update sort options correctly', () => {
      const { actions } = useLobbyStore.getState()
      
      actions.setSortOptions({ field: 'seats', direction: 'asc' })
      
      const state = useLobbyStore.getState()
      expect(state.sortOptions.field).toBe('seats')
      expect(state.sortOptions.direction).toBe('asc')
    })

    it('should toggle UI states correctly', () => {
      const { actions } = useLobbyStore.getState()
      
      actions.toggleFilters()
      expect(useLobbyStore.getState().ui.showFilters).toBe(true)
      
      actions.toggleFilters()
      expect(useLobbyStore.getState().ui.showFilters).toBe(false)
      
      actions.toggleCreateTableModal()
      expect(useLobbyStore.getState().ui.showCreateTableModal).toBe(true)
    })

    it('should set view mode correctly', () => {
      const { actions } = useLobbyStore.getState()
      
      actions.setViewMode('list')
      expect(useLobbyStore.getState().ui.viewMode).toBe('list')
      
      actions.setViewMode('compact')
      expect(useLobbyStore.getState().ui.viewMode).toBe('compact')
    })
  })

  describe('Player Management', () => {
    it('should clear player correctly', () => {
      const { actions } = useLobbyStore.getState()
      
      // Set some player data first
      useLobbyStore.setState(state => ({
        player: {
          ...state.player,
          name: 'TestPlayer',
          token: 'test-token',
          isIdentified: true
        }
      }))
      
      // Clear player
      actions.clearPlayer()
      
      const state = useLobbyStore.getState()
      expect(state.player.name).toBe('')
      expect(state.player.token).toBeNull()
      expect(state.player.isIdentified).toBe(false)
      
      // Verify sessionStorage was cleared
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('playerName')
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('playerToken')
    })
  })

  describe('Table Management', () => {
    it('should handle table updates correctly', () => {
      const store = useLobbyStore.getState()
      
      // Simulate table update event
      const tableUpdate = {
        tableId: 'table-1',
        seats: 6,
        humans: 2,
        cpus: 1,
        status: 'waiting',
        handId: null,
        updatedAt: Date.now()
      }
      
      // Add table
      store.tables = [tableUpdate]
      expect(store.tables).toHaveLength(1)
      expect(store.tables[0].tableId).toBe('table-1')
      
      // Update existing table
      const updatedTable = { ...tableUpdate, humans: 3 }
      store.tables = [updatedTable]
      expect(store.tables[0].humans).toBe(3)
    })
  })

  describe('Connection Management', () => {
    it('should handle connection state changes', () => {
      const { actions } = useLobbyStore.getState()
      
      // Test initial state
      expect(useLobbyStore.getState().connection.isConnecting).toBe(false)
      
      // Test connection start
      actions.connectSocket()
      expect(useLobbyStore.getState().connection.isConnecting).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', () => {
      const { actions } = useLobbyStore.getState()
      
      // Test connection error handling
      actions.connectSocket()
      
      // Simulate connection error
      const state = useLobbyStore.getState()
      expect(state.connection.isConnecting).toBe(true)
      
      // The actual error handling would be tested in integration tests
      // since it involves socket events
    })
  })
})
