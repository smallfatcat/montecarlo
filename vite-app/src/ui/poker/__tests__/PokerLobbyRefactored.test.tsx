import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { PokerLobbyRefactored } from '../PokerLobbyRefactored'

// Mock the stores to avoid WebSocket connection issues in tests
vi.mock('../../stores', () => ({
  useLobbyConnection: () => ({
    socket: null,
    isConnected: false,
    connectionError: null,
    isConnecting: false
  }),
  useLobbyPlayer: () => ({
    name: '',
    token: null,
    isIdentified: false,
    isIdentifying: false
  }),
  useLobbyTables: () => [],
  useLobbyUI: () => ({
    selectedTableId: null,
    creatingTable: false,
    refreshingTables: false,
    showCreateTableModal: false,
    showFilters: false,
    viewMode: 'grid' as const
  }),
  useLobbyFilters: () => ({
    status: 'all' as const,
    playerCount: 'all' as const,
    stakes: 'all' as const,
    searchQuery: ''
  }),
  useLobbyActions: () => ({
    connectSocket: vi.fn(),
    disconnectSocket: vi.fn(),
    reconnectSocket: vi.fn(),
    identifyPlayer: vi.fn(),
    clearPlayer: vi.fn(),
    createTable: vi.fn(),
    joinTable: vi.fn(),
    spectateTable: vi.fn(),
    refreshTables: vi.fn(),
    setSelectedTable: vi.fn(),
    setCreatingTable: vi.fn(),
    toggleCreateTableModal: vi.fn(),
    toggleFilters: vi.fn(),
    setViewMode: vi.fn(),
    updateFilters: vi.fn(),
    clearFilters: vi.fn(),
    setSortOptions: vi.fn(),
    resetState: vi.fn()
  }),
  useFilteredTables: () => [],
  useSortedTables: () => [],
  useIsConnected: () => false,
  useIsIdentified: () => false,
  useIsCreatingTable: () => false,
  useIsRefreshingTables: () => false
}))

describe('PokerLobbyRefactored', () => {
  it('should render without crashing', () => {
    const { container } = render(<PokerLobbyRefactored />)
    expect(container).toBeTruthy()
  })

  it('should display the lobby title', () => {
    const { getByText } = render(<PokerLobbyRefactored />)
    expect(getByText('Poker Lobby')).toBeTruthy()
  })

  it('should show player identification form when not identified', () => {
    const { getByText, getByPlaceholderText } = render(<PokerLobbyRefactored />)
    
    expect(getByText('Choose your display name')).toBeTruthy()
    expect(getByPlaceholderText('Enter name')).toBeTruthy()
    expect(getByText('Save')).toBeTruthy()
  })

  it('should show create table button', () => {
    const { getByText } = render(<PokerLobbyRefactored />)
    expect(getByText('Create Table')).toBeTruthy()
  })

  it('should show refresh button', () => {
    const { getByText } = render(<PokerLobbyRefactored />)
    expect(getByText('Refresh')).toBeTruthy()
  })

  it('should show filters toggle button', () => {
    const { getByText } = render(<PokerLobbyRefactored />)
    expect(getByText('Show Filters')).toBeTruthy()
  })

  it('should show view mode selector', () => {
    const { container } = render(<PokerLobbyRefactored />)
    const select = container.querySelector('select')
    expect(select).toBeTruthy()
    expect(select?.value).toBe('grid')
  })
})
