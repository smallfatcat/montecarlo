import React from 'react'
import { Card, Badge, StatusBadge } from './index'
import type { TableSummary } from '../../stores/types'
import './PokerTableCard.css'

export interface PokerTableCardProps {
  table: TableSummary
  onJoin?: (tableId: string) => void
  onSpectate?: (tableId: string) => void
  className?: string
}

export const PokerTableCard: React.FC<PokerTableCardProps> = ({
  table,
  onJoin,
  onSpectate,
  className = '',
}) => {
  const isFull = table.humans + table.cpus >= table.seats
  const isInProgress = table.handId !== null
  const canJoin = !isFull && !isInProgress
  
  const getStatusVariant = () => {
    if (isInProgress) return 'warning'
    if (isFull) return 'error'
    return 'success'
  }
  
  const getStatusText = () => {
    if (isInProgress) return 'In Progress'
    if (isFull) return 'Full'
    return 'Open'
  }
  
  const getPlayerCountText = () => {
    const total = table.humans + table.cpus
    return `${total}/${table.seats} players`
  }
  
  const getTableType = () => {
    if (table.cpus > 0) return 'Mixed'
    return 'Human Only'
  }

  return (
    <Card
      variant="elevated"
      padding="md"
      className={`poker-table-card ${className}`}
      hoverable
    >
      <div className="poker-table-card__header">
        <div className="poker-table-card__title">
          <h3 className="poker-table-card__name">Table {table.tableId.slice(0, 8)}</h3>
          <StatusBadge
            status={getStatusVariant() === 'success' ? 'online' : 'busy'}
            size="sm"
          >
            {getStatusText()}
          </StatusBadge>
        </div>
        
        <div className="poker-table-card__meta">
          <Badge variant="outline" size="sm">
            {getTableType()}
          </Badge>
          <Badge variant="default" size="sm">
            {getPlayerCountText()}
          </Badge>
        </div>
      </div>
      
      <div className="poker-table-card__body">
        <div className="poker-table-card__stats">
          <div className="poker-table-card__stat">
            <span className="poker-table-card__stat-label">Humans:</span>
            <span className="poker-table-card__stat-value">{table.humans}</span>
          </div>
          <div className="poker-table-card__stat">
            <span className="poker-table-card__stat-label">CPU:</span>
            <span className="poker-table-card__stat-value">{table.cpus}</span>
          </div>
          <div className="poker-table-card__stat">
            <span className="poker-table-card__stat-label">Seats:</span>
            <span className="poker-table-card__stat-value">{table.seats}</span>
          </div>
        </div>
        
        {table.reserved && table.reserved.length > 0 && (
          <div className="poker-table-card__reserved">
            <span className="poker-table-card__reserved-label">Reserved:</span>
            <div className="poker-table-card__reserved-players">
              {table.reserved.map((reservation, index) => (
                <Badge key={index} variant="outline" size="sm">
                  {reservation.playerName || `Seat ${reservation.seatIndex}`}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="poker-table-card__footer">
        <div className="poker-table-card__actions">
          {canJoin && onJoin && (
            <button
              className="poker-table-card__join-btn"
              onClick={() => onJoin(table.tableId)}
            >
              Join Table
            </button>
          )}
          
          {onSpectate && (
            <button
              className="poker-table-card__spectate-btn"
              onClick={() => onSpectate(table.tableId)}
            >
              Spectate
            </button>
          )}
        </div>
        
        <div className="poker-table-card__updated">
          Updated: {new Date(table.updatedAt).toLocaleTimeString()}
        </div>
      </div>
    </Card>
  )
}
