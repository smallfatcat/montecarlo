import { useEffect, useState } from 'react'
import {
  useLobbyConnection,
  useLobbyPlayer,
  useLobbyTables,
  useLobbyUI,
  useLobbyFilters,
  useLobbyActions,
  useFilteredTables,
  useSortedTables,
  useIsConnected,
  useIsIdentified,
  useIsCreatingTable,
  useIsRefreshingTables
} from '../../stores'

export function PokerLobbyRefactored() {
  // Store selectors
  const connection = useLobbyConnection()
  const player = useLobbyPlayer()
  const tables = useLobbyTables()
  const ui = useLobbyUI()
  const filters = useLobbyFilters()
  const actions = useLobbyActions()
  
  // Computed selectors
  const filteredTables = useFilteredTables()
  const sortedTables = useSortedTables()
  const isConnected = useIsConnected()
  const isIdentified = useIsIdentified()
  const isCreatingTable = useIsCreatingTable()
  const isRefreshingTables = useIsRefreshingTables()
  
  // Local state for form inputs
  const [nameDraft, setNameDraft] = useState<string>(() => 
    (sessionStorage?.getItem('playerName') || '').trim()
  )
  
  // Auto-connect on mount
  useEffect(() => {
    if (!connection.socket && !connection.isConnecting) {
      actions.connectSocket()
    }
  }, [connection.socket, connection.isConnecting, actions])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Note: We don't disconnect here as other components might need the connection
      // The connection will be managed at a higher level
    }
  }, [])
  
  // Handle name submission
  const handleSubmitName = async () => {
    const trimmed = (nameDraft || '').trim()
    if (!trimmed || !isConnected) return
    
    try {
      await actions.identifyPlayer(trimmed)
    } catch (error) {
      console.error('Failed to identify player:', error)
      // TODO: Add proper error handling UI
    }
  }
  
  // Handle table creation
  const handleCreateTable = async () => {
    try {
      await actions.createTable({
        seats: 6,
        startingStack: 5000
      })
    } catch (error) {
      console.error('Failed to create table:', error)
      // TODO: Add proper error handling UI
    }
  }
  
  // Handle table joining
  const handleJoinTable = (tableId: string) => {
    actions.joinTable(tableId)
  }
  
  // Handle refresh
  const handleRefresh = () => {
    actions.refreshTables()
  }
  
  // Format time for reservations
  const formatReservationTime = (expiresAt: number) => {
    const now = Date.now()
    const seconds = Math.max(0, Math.ceil((expiresAt - now) / 1000))
    return seconds > 0 ? `${seconds}s` : 'expired'
  }
  
  return (
    <div style={{ padding: 16 }}>
      <h2>Poker Lobby</h2>
      
      {/* Connection Status */}
      {connection.connectionError && (
        <div style={{ 
          margin: '12px 0', 
          padding: 12, 
          border: '1px solid #ef4444', 
          borderRadius: 8, 
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444'
        }}>
          <div style={{ fontWeight: 600 }}>Connection Error</div>
          <div>{connection.connectionError}</div>
          <button 
            onClick={actions.reconnectSocket}
            disabled={connection.isConnecting}
            style={{ marginTop: 8 }}
          >
            {connection.isConnecting ? 'Reconnecting...' : 'Reconnect'}
          </button>
        </div>
      )}
      
      {/* Player Identification */}
      {!isIdentified ? (
        <div style={{ 
          margin: '12px 0', 
          padding: 12, 
          border: '1px solid #444', 
          borderRadius: 8, 
          maxWidth: 420 
        }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>
            Choose your display name
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Enter name"
              maxLength={32}
              style={{ flex: 1 }}
              disabled={!isConnected || player.isIdentifying}
            />
            <button 
              onClick={handleSubmitName} 
              disabled={!isConnected || player.isIdentifying || (nameDraft || '').trim().length === 0}
            >
              {player.isIdentifying ? 'Saving...' : 'Save'}
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            Your name is shown on the table when you sit.
          </div>
        </div>
      ) : (
        <div style={{ margin: '12px 0', opacity: 0.85 }}>
          You are <span style={{ fontWeight: 600 }}>{player.name}</span>
          <button 
            onClick={actions.clearPlayer}
            style={{ marginLeft: 12, fontSize: 12, padding: '4px 8px' }}
          >
            Change
          </button>
        </div>
      )}
      
      {/* Actions Bar */}
      <div style={{ 
        marginBottom: 12, 
        display: 'flex', 
        gap: 12, 
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <button 
          onClick={handleCreateTable} 
          disabled={!isConnected || isCreatingTable || !isIdentified}
        >
          {isCreatingTable ? 'Creating...' : 'Create Table'}
        </button>
        
        <button 
          onClick={handleRefresh}
          disabled={!isConnected || isRefreshingTables}
        >
          {isRefreshingTables ? 'Refreshing...' : 'Refresh'}
        </button>
        
        <button 
          onClick={actions.toggleFilters}
          style={{ marginLeft: 'auto' }}
        >
          {ui.showFilters ? 'Hide' : 'Show'} Filters
        </button>
        
        <select 
          value={ui.viewMode}
          onChange={(e) => actions.setViewMode(e.target.value as 'grid' | 'list' | 'compact')}
          style={{ marginLeft: 8 }}
        >
          <option value="grid">Grid</option>
          <option value="list">List</option>
          <option value="compact">Compact</option>
        </select>
      </div>
      
      {/* Filters */}
      {ui.showFilters && (
        <div style={{ 
          marginBottom: 16, 
          padding: 16, 
          border: '1px solid #444', 
          borderRadius: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{ marginBottom: 12, fontWeight: 600 }}>Filters</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Status</label>
              <select 
                value={filters.status}
                onChange={(e) => actions.updateFilters({ status: e.target.value as any })}
              >
                <option value="all">All</option>
                <option value="waiting">Waiting</option>
                <option value="in-game">In Game</option>
                <option value="finished">Finished</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Player Count</label>
              <select 
                value={filters.playerCount}
                onChange={(e) => actions.updateFilters({ playerCount: e.target.value as any })}
              >
                <option value="all">All</option>
                <option value="empty">Empty</option>
                <option value="partial">Partial</option>
                <option value="full">Full</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Search</label>
              <input
                type="text"
                placeholder="Table ID..."
                value={filters.searchQuery}
                onChange={(e) => actions.updateFilters({ searchQuery: e.target.value })}
                style={{ width: 150 }}
              />
            </div>
            
            <button 
              onClick={actions.clearFilters}
              style={{ alignSelf: 'end', fontSize: 12, padding: '6px 12px' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
      
      {/* Tables Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: ui.viewMode === 'compact' 
          ? 'repeat(auto-fill, minmax(200px, 1fr))'
          : ui.viewMode === 'list'
          ? '1fr'
          : 'repeat(auto-fill, minmax(240px, 1fr))', 
        gap: 12 
      }}>
        {sortedTables.map((table) => (
          <div 
            key={table.tableId} 
            style={{ 
              border: '1px solid #444', 
              borderRadius: 8, 
              padding: ui.viewMode === 'compact' ? 8 : 12,
              backgroundColor: ui.selectedTableId === table.tableId 
                ? 'rgba(100, 216, 203, 0.1)' 
                : 'transparent'
            }}
          >
            <div style={{ fontWeight: 600 }}>{table.tableId}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {table.status} {table.handId != null ? `(hand ${table.handId})` : ''}
            </div>
            <div style={{ marginTop: 8 }}>
              Seats: {table.humans}/{table.seats} humans, {table.cpus} CPUs
            </div>
            
            {table.reserved && table.reserved.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                Reserved: {table.reserved.map(r => (
                  <span key={r.seatIndex} style={{ marginRight: 8 }}>
                    {r.playerName ? r.playerName : 'Unknown'}@{r.seatIndex} 
                    ({formatReservationTime(r.expiresAt)})
                  </span>
                ))}
              </div>
            )}
            
            <div style={{ marginTop: 12 }}>
              <button 
                onClick={() => handleJoinTable(table.tableId)} 
                disabled={!isIdentified}
                style={{ marginRight: 8 }}
              >
                Join
              </button>
              <button 
                onClick={() => actions.spectateTable(table.tableId)}
                disabled={!isIdentified}
                style={{ fontSize: 12, padding: '4px 8px' }}
              >
                Watch
              </button>
            </div>
          </div>
        ))}
        
        {sortedTables.length === 0 && (
          <div style={{ 
            opacity: 0.7, 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '40px 20px' 
          }}>
            {isRefreshingTables ? 'Loading tables...' : 'No tables found. Create one to get started.'}
          </div>
        )}
      </div>
      
      {/* Debug Info (remove in production) */}
      {import.meta.env.DEV && (
        <div style={{ 
          marginTop: 20, 
          padding: 16, 
          border: '1px solid #666', 
          borderRadius: 8, 
          fontSize: 12, 
          opacity: 0.7 
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Debug Info</div>
          <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
          <div>Identified: {isIdentified ? 'Yes' : 'No'}</div>
          <div>Tables: {tables.length}</div>
          <div>Filtered: {filteredTables.length}</div>
          <div>View Mode: {ui.viewMode}</div>
          <div>Filters: {JSON.stringify(filters)}</div>
        </div>
      )}
    </div>
  )
}
