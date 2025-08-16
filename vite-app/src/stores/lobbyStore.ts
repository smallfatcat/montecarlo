import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { io } from 'socket.io-client'
import type { 
  LobbyState, 
  TableSummary, 
  TableConfig, 
  TableFilters, 
  SortOptions
} from './types'

// Helper functions for computed values
const filterTables = (tables: TableSummary[], filters: TableFilters): TableSummary[] => {
  return tables.filter(table => {
    // Status filter
    if (filters.status !== 'all') {
      const status = table.status.toLowerCase()
      if (filters.status === 'waiting' && status !== 'waiting') return false
      if (filters.status === 'in-game' && status !== 'in_hand') return false
      if (filters.status === 'finished' && status !== 'finished') return false
    }

    // Player count filter
    if (filters.playerCount !== 'all') {
      const availableSeats = table.seats - table.humans - table.cpus
      if (filters.playerCount === 'empty' && availableSeats !== table.seats) return false
      if (filters.playerCount === 'partial' && (availableSeats === 0 || availableSeats === table.seats)) return false
      if (filters.playerCount === 'full' && availableSeats !== 0) return false
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      if (!table.tableId.toLowerCase().includes(query)) return false
    }

    return true
  })
}

const sortTables = (tables: TableSummary[], sortOptions: SortOptions): TableSummary[] => {
  const sorted = [...tables]
  
  sorted.sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sortOptions.field) {
      case 'updatedAt':
        aValue = a.updatedAt
        bValue = b.updatedAt
        break
      case 'seats':
        aValue = a.seats
        bValue = b.seats
        break
      case 'humans':
        aValue = a.humans
        bValue = b.humans
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      default:
        return 0
    }
    
    if (sortOptions.direction === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })
  
  return sorted
}

// Initial state
const initialState = {
  connection: {
    socket: null,
    isConnected: false,
    connectionError: null,
    isConnecting: false
  },
  player: {
    name: '',
    token: null,
    isIdentified: false,
    isIdentifying: false
  },
  tables: [],
  ui: {
    selectedTableId: null,
    creatingTable: false,
    refreshingTables: false,
    showCreateTableModal: false,
    showFilters: false,
    viewMode: 'grid' as const
  },
  filters: {
    status: 'all' as const,
    playerCount: 'all' as const,
    stakes: 'all' as const,
    searchQuery: ''
  },
  sortOptions: {
    field: 'updatedAt' as const,
    direction: 'desc' as const
  }
}

// Create the store
export const useLobbyStore = create<LobbyState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // Computed values
    get filteredTables() {
      const { tables, filters } = get()
      return filterTables(tables, filters)
    },
    
    get sortedTables() {
      const { filteredTables, sortOptions } = get()
      return sortTables(filteredTables, sortOptions)
    },
    
    // Actions
    actions: {
      // Connection actions
      connectSocket: () => {
        const wsUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined
        if (!wsUrl) {
          set(state => ({
            connection: {
              ...state.connection,
              connectionError: 'WebSocket URL not configured'
            }
          }))
          return
        }
        
        set(state => ({
          connection: {
            ...state.connection,
            isConnecting: true,
            connectionError: null
          }
        }))
        
        const socket = io(wsUrl, {
          path: '/socket.io',
          transports: ['websocket'],
          upgrade: false,
          withCredentials: false,
          timeout: 12000,
        })
        
        // Connection events
        socket.on('connect', () => {
          set(state => ({
            connection: {
              ...state.connection,
              socket,
              isConnected: true,
              isConnecting: false,
              connectionError: null
            }
          }))
          
          // Auto-identify if we have a stored player name
          const storedName = sessionStorage.getItem('playerName')
          if (storedName) {
            get().actions.identifyPlayer(storedName)
          }
        })
        
        socket.on('connect_error', (err) => {
          set(state => ({
            connection: {
              ...state.connection,
              isConnected: false,
              isConnecting: false,
              connectionError: err.message || 'Connection failed'
            }
          }))
          
          // Auto-reconnect after delay
          setTimeout(() => {
            get().actions.reconnectSocket()
          }, 1000)
        })
        
        socket.on('disconnect', () => {
          set(state => ({
            connection: {
              ...state.connection,
              isConnected: false,
              isConnecting: false
            }
          }))
        })
        
        // Table update events
        socket.on('table_update', (summary: TableSummary) => {
          const { tables } = get()
          const existingIndex = tables.findIndex(t => t.tableId === summary.tableId)
          
          if (existingIndex === -1) {
            set({ tables: [...tables, summary] })
          } else {
            const updatedTables = [...tables]
            updatedTables[existingIndex] = summary
            set({ tables: updatedTables })
          }
        })
        
        socket.on('table_removed', (message: { tableId: string }) => {
          const { tables } = get()
          set({ 
            tables: tables.filter(t => t.tableId !== message.tableId) 
          })
        })
        
        // Store socket reference
        set(state => ({
          connection: {
            ...state.connection,
            socket
          }
        }))
      },
      
      disconnectSocket: () => {
        const { connection } = get()
        if (connection.socket) {
          connection.socket.disconnect()
        }
        
        set(state => ({
          connection: {
            ...state.connection,
            socket: null,
            isConnected: false,
            isConnecting: false
          }
        }))
      },
      
      reconnectSocket: () => {
        const { connection } = get()
        if (connection.socket) {
          connection.socket.disconnect()
        }
        get().actions.connectSocket()
      },
      
      // Player actions
      identifyPlayer: async (name: string): Promise<void> => {
        const { connection } = get()
        if (!connection.socket) {
          throw new Error('Socket not connected')
        }
        
        const trimmedName = name.trim()
        if (!trimmedName) {
          throw new Error('Player name cannot be empty')
        }
        
        set(state => ({
          player: {
            ...state.player,
            isIdentifying: true
          }
        }))
        
        try {
          // Store name in session storage
          sessionStorage.setItem('playerName', trimmedName)
          
          // Get stored token if available
          const token = sessionStorage.getItem('playerToken')
          
          // Send identification request
          const ack = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Identification timeout')), 10000)
            
            connection.socket!.emit('identify', { token, name: trimmedName }, (response: any) => {
              clearTimeout(timeout)
              resolve(response)
            })
          })
          
          // Handle response
          if (ack && typeof ack === 'object' && 'token' in ack) {
            sessionStorage.setItem('playerToken', ack.token as string)
            
            set(state => ({
              player: {
                ...state.player,
                name: trimmedName,
                token: ack.token as string,
                isIdentified: true,
                isIdentifying: false
              }
            }))
            
            // Join lobby after successful identification
            connection.socket!.emit('joinLobby', {}, (resp: any) => {
              if (Array.isArray(resp?.tables)) {
                set({ tables: resp.tables })
              }
            })
          } else {
            throw new Error('Invalid identification response')
          }
        } catch (error) {
          set(state => ({
            player: {
              ...state.player,
              isIdentifying: false
            }
          }))
          throw error
        }
      },
      
      clearPlayer: () => {
        sessionStorage.removeItem('playerName')
        sessionStorage.removeItem('playerToken')
        
        set(state => ({
          player: {
            ...state.player,
            name: '',
            token: null,
            isIdentified: false,
            isIdentifying: false
          }
        }))
      },
      
      // Table actions
      createTable: async (config: TableConfig): Promise<void> => {
        const { connection } = get()
        if (!connection.socket) {
          throw new Error('Socket not connected')
        }
        
        set(state => ({
          ui: {
            ...state.ui,
            creatingTable: true
          }
        }))
        
        try {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Table creation timeout')), 10000)
            
            connection.socket!.emit('createTable', config, (response: any) => {
              clearTimeout(timeout)
              if (response && response.error) {
                reject(new Error(response.error))
              } else {
                resolve(response)
              }
            })
          })
        } finally {
          set(state => ({
            ui: {
              ...state.ui,
              creatingTable: false
            }
          }))
        }
      },
      
      joinTable: (tableId: string) => {
        try {
          window.location.hash = `#poker/${tableId}`
        } catch (error) {
          console.error('Failed to navigate to table:', error)
        }
      },
      
      spectateTable: (tableId: string) => {
        // TODO: Implement spectate functionality
        console.log('Spectating table:', tableId)
      },
      
      refreshTables: () => {
        const { connection } = get()
        if (!connection.socket) return
        
        set(state => ({
          ui: {
            ...state.ui,
            refreshingTables: true
          }
        }))
        
        connection.socket.emit('listTables', {}, (resp: any) => {
          if (Array.isArray(resp?.tables)) {
            set({ 
              tables: resp.tables,
              ui: {
                ...get().ui,
                refreshingTables: false
              }
            })
          }
        })
      },
      
      // UI actions
      setSelectedTable: (tableId: string | null) => {
        set(state => ({
          ui: {
            ...state.ui,
            selectedTableId: tableId
          }
        }))
      },
      
      setCreatingTable: (creating: boolean) => {
        set(state => ({
          ui: {
            ...state.ui,
            creatingTable: creating
          }
        }))
      },
      
      toggleCreateTableModal: () => {
        set(state => ({
          ui: {
            ...state.ui,
            showCreateTableModal: !state.ui.showCreateTableModal
          }
        }))
      },
      
      toggleFilters: () => {
        set(state => ({
          ui: {
            ...state.ui,
            showFilters: !state.ui.showFilters
          }
        }))
      },
      
      setViewMode: (mode: 'grid' | 'list' | 'compact') => {
        set(state => ({
          ui: {
            ...state.ui,
            viewMode: mode
          }
        }))
      },
      
      // Filter and sort actions
      updateFilters: (filters: Partial<TableFilters>) => {
        set(state => ({
          filters: {
            ...state.filters,
            ...filters
          }
        }))
      },
      
      clearFilters: () => {
        set({
          filters: {
            status: 'all',
            playerCount: 'all',
            stakes: 'all',
            searchQuery: ''
          }
        })
      },
      
      setSortOptions: (options: Partial<SortOptions>) => {
        set(state => ({
          sortOptions: {
            ...state.sortOptions,
            ...options
          }
        }))
      },
      
      // Utility actions
      resetState: () => {
        set(initialState)
      }
    }
  }))
)

// Selector hooks for common state access
export const useLobbyConnection = () => useLobbyStore(state => state.connection)
export const useLobbyPlayer = () => useLobbyStore(state => state.player)
export const useLobbyTables = () => useLobbyStore(state => state.tables)
export const useLobbyUI = () => useLobbyStore(state => state.ui)
export const useLobbyFilters = () => useLobbyStore(state => state.filters)
export const useLobbySortOptions = () => useLobbyStore(state => state.sortOptions)
export const useLobbyActions = () => useLobbyStore(state => state.actions)

// Computed selectors
export const useFilteredTables = () => useLobbyStore(state => state.filteredTables)
export const useSortedTables = () => useLobbyStore(state => state.sortedTables)
export const useIsConnected = () => useLobbyStore(state => state.connection.isConnected)
export const useIsIdentified = () => useLobbyStore(state => state.player.isIdentified)
export const useIsCreatingTable = () => useLobbyStore(state => state.ui.creatingTable)
export const useIsRefreshingTables = () => useLobbyStore(state => state.ui.refreshingTables)
