import React from 'react'
import './Badge.css'

export interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
  dot?: boolean
  removable?: boolean
  onRemove?: () => void
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  dot = false,
  removable = false,
  onRemove,
}) => {
  const baseClass = 'badge'
  const variantClass = `badge--${variant}`
  const sizeClass = `badge--${size}`
  const dotClass = dot ? 'badge--dot' : ''
  const removableClass = removable ? 'badge--removable' : ''
  
  const combinedClassName = [
    baseClass,
    variantClass,
    sizeClass,
    dotClass,
    removableClass,
    className
  ].filter(Boolean).join(' ')

  return (
    <span className={combinedClassName}>
      {dot && <span className="badge__dot" />}
      <span className="badge__content">{children}</span>
      {removable && (
        <button
          type="button"
          className="badge__remove"
          onClick={onRemove}
          aria-label="Remove badge"
        >
          <svg
            className="badge__remove-icon"
            viewBox="0 0 16 16"
            fill="currentColor"
            width="16"
            height="16"
          >
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      )}
    </span>
  )
}

// Export specific badge variants for convenience
export const PrimaryBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="primary" {...props} />
)

export const SuccessBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="success" {...props} />
)

export const WarningBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="warning" {...props} />
)

export const ErrorBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="error" {...props} />
)

export const OutlineBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="outline" {...props} />
)

// Status badges for common use cases
export const StatusBadge: React.FC<{
  status: 'online' | 'offline' | 'away' | 'busy'
  children?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}> = ({ status, children, size = 'md' }) => {
  const statusConfig = {
    online: { variant: 'success' as const, text: 'Online' },
    offline: { variant: 'default' as const, text: 'Offline' },
    away: { variant: 'warning' as const, text: 'Away' },
    busy: { variant: 'error' as const, text: 'Busy' },
  }

  const config = statusConfig[status]
  
  return (
    <Badge variant={config.variant} size={size} dot>
      {children || config.text}
    </Badge>
  )
}
