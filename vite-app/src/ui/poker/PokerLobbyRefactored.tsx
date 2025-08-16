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
import { 
  StatusMessage, 
  LoadingSpinner, 
  Button, 
  Card, 
  Badge 
} from '../../ui/components'
import './PokerLobbyRefactored.css'

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
  
  // Local state for form inputs and error handling
  const [nameDraft, setNameDraft] = useState<string>(() => 
    (sessionStorage?.getItem('playerName') || '').trim()
  )
  const [nameError, setNameError] = useState<string>('')
  const [createTableError, setCreateTableError] = useState<string>('')
  
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
    
    setNameError('')
    try {
      await actions.identifyPlayer(trimmed)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to identify player'
      setNameError(errorMessage)
      console.error('Failed to identify player:', error)
    }
  }
  
  // Handle table creation
  const handleCreateTable = async () => {
    setCreateTableError('')
    try {
      await actions.createTable({
        seats: 6,
        startingStack: 5000
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create table'
      setCreateTableError(errorMessage)
      console.error('Failed to create table:', error)
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
        <StatusMessage
          type="error"
          title="Connection Error"
          message={connection.connectionError}
          actions={
            <button 
              onClick={actions.reconnectSocket}
              disabled={connection.isConnecting}
              style={{ 
                padding: '8px 16px',
                backgroundColor: 'var(--color-danger-600)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {connection.isConnecting ? 'Reconnecting...' : 'Reconnect'}
            </button>
          }
        />
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
          
          {/* Name Error */}
          {nameError && (
            <StatusMessage
              type="error"
              message={nameError}
              dismissible
              onDismiss={() => setNameError('')}
              className="mt-3"
            />
          )}
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
      
      {/* Create Table Error */}
      {createTableError && (
        <StatusMessage
          type="error"
          title="Table Creation Failed"
          message={createTableError}
          dismissible
          onDismiss={() => setCreateTableError('')}
          className="mb-4"
        />
      )}
      
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
      <div className={`poker-lobby__tables poker-lobby__tables--${ui.viewMode}`}>
        {sortedTables.map((table) => (
          <Card 
            key={table.tableId} 
            variant="elevated"
            className={`poker-lobby__table-card ${ui.selectedTableId === table.tableId ? 'poker-lobby__table-card--selected' : ''}`}
            data-status={table.status}
          >
            <div className="poker-lobby__table-header">
              <h3 className="poker-lobby__table-id">{table.tableId}</h3>
              <Badge 
                variant={table.status === 'waiting' ? 'success' : table.status === 'in-game' ? 'warning' : 'outline'}
                size="sm"
              >
                {table.status} {table.handId != null ? `(hand ${table.handId})` : ''}
              </Badge>
            </div>
            
            <div className="poker-lobby__table-info">
              <div className="poker-lobby__table-seats">
                Seats: {table.humans}/{table.seats} humans, {table.cpus} CPUs
              </div>
              
              {table.reserved && table.reserved.length > 0 && (
                <div className="poker-lobby__table-reservations">
                  Reserved: {table.reserved.map(r => (
                    <span key={r.seatIndex} className="poker-lobby__reservation">
                      {r.playerName ? r.playerName : 'Unknown'}@{r.seatIndex} 
                      ({formatReservationTime(r.expiresAt)})
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="poker-lobby__table-actions">
              <Button 
                onClick={() => handleJoinTable(table.tableId)} 
                disabled={!isIdentified}
                variant="primary"
                size="sm"
              >
                Join
              </Button>
              <Button 
                onClick={() => actions.spectateTable(table.tableId)}
                disabled={!isIdentified}
                variant="outline"
                size="sm"
              >
                Watch
              </Button>
            </div>
          </Card>
        ))}
        
        {sortedTables.length === 0 && (
          <Card variant="outlined" className="poker-lobby__empty-state">
            {isRefreshingTables ? (
              <div className="poker-lobby__loading-state">
                <LoadingSpinner size="medium" />
                <span>Loading tables...</span>
              </div>
            ) : (
              <div className="poker-lobby__no-tables">
                <p>No tables found. Create one to get started.</p>
              </div>
            )}
          </Card>
        )}
      </div>
      
      {/* Debug Info (remove in production) */}
      {import.meta.env.DEV && (
        <Card variant="outlined" className="poker-lobby__debug">
          <h3 className="poker-lobby__debug-title">Debug Info</h3>
          <div className="poker-lobby__debug-content">
            <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
            <div>Identified: {isIdentified ? 'Yes' : 'No'}</div>
            <div>Tables: {tables.length}</div>
            <div>Filtered: {filteredTables.length}</div>
            <div>View Mode: {ui.viewMode}</div>
            <div>Filters: {JSON.stringify(filters)}</div>
          </div>
        </Card>
      )}
    </div>
  )
}
