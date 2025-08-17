import React from 'react'
import { Card } from './Card'
import { Badge } from './Badge'
import './StatusMessage.css'

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'loading'

export interface StatusMessageProps {
  type: StatusType
  title?: string
  message: string
  details?: string
  actions?: React.ReactNode
  className?: string
  dismissible?: boolean
  onDismiss?: () => void
}

const statusConfig = {
  success: {
    icon: '✅',
    color: 'success',
    bgColor: 'var(--color-neutral-800)',
    borderColor: 'var(--color-success-500)',
    textColor: 'var(--color-neutral-50)'
  },
  warning: {
    icon: '⚠️',
    color: 'warning',
    bgColor: 'var(--color-neutral-800)',
    borderColor: 'var(--color-warning-500)',
    textColor: 'var(--color-neutral-50)'
  },
  error: {
    icon: '❌',
    color: 'danger',
    bgColor: 'var(--color-neutral-800)',
    borderColor: 'var(--color-error-500)',
    textColor: 'var(--color-neutral-50)'
  },
  info: {
    icon: 'ℹ️',
    color: 'info',
    bgColor: 'var(--color-neutral-800)',
    borderColor: 'var(--color-primary-500)',
    textColor: 'var(--color-neutral-50)'
  },
  loading: {
    icon: '⏳',
    color: 'info',
    bgColor: 'var(--color-neutral-800)',
    borderColor: 'var(--color-primary-500)',
    textColor: 'var(--color-neutral-50)'
  }
}

export function StatusMessage({ 
  type, 
  title, 
  message, 
  details, 
  actions, 
  className = '',
  dismissible = false,
  onDismiss 
}: StatusMessageProps) {
  const config = statusConfig[type]
  const classes = ['status-message', `status-message--${type}`, className].filter(Boolean).join(' ')

  return (
    <Card 
      variant="outlined" 
      className={classes}
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        color: config.textColor
      }}
    >
      <div className="status-message__header">
        <div className="status-message__icon">{config.icon}</div>
        <div className="status-message__content">
          {title && <h4 className="status-message__title">{title}</h4>}
          <p className="status-message__message">{message}</p>
        </div>
        {dismissible && onDismiss && (
          <button 
            className="status-message__dismiss"
            onClick={onDismiss}
            aria-label="Dismiss message"
          >
            ×
          </button>
        )}
      </div>
      
      {details && (
        <div className="status-message__details">
          <details>
            <summary className="status-message__summary">Show Details</summary>
            <div className="status-message__details-content">{details}</div>
          </details>
        </div>
      )}
      
      {actions && (
        <div className="status-message__actions">
          {actions}
        </div>
      )}
      
      <Badge 
        variant={config.color as any} 
        size="sm" 
        className="status-message__badge"
      >
        {type}
      </Badge>
    </Card>
  )
}
