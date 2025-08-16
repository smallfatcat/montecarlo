import React from 'react'
import './Card.css'

export interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
  style?: React.CSSProperties
  id?: string
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  onClick,
  hoverable = false,
  style,
  id,
}) => {
  const baseClass = 'card'
  const variantClass = `card--${variant}`
  const paddingClass = `card--padding-${padding}`
  const interactiveClass = onClick ? 'card--interactive' : ''
  const hoverableClass = hoverable ? 'card--hoverable' : ''
  
  const combinedClassName = [
    baseClass,
    variantClass,
    paddingClass,
    interactiveClass,
    hoverableClass,
    className
  ].filter(Boolean).join(' ')

  const Component = onClick ? 'button' : 'div'
  const componentProps = onClick ? { onClick, type: 'button' as const } : {}

  return (
    <Component className={combinedClassName} style={style} id={id} {...componentProps}>
      {children}
    </Component>
  )
}

// Export specific card variants for convenience
export const ElevatedCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card variant="elevated" {...props} />
)

export const OutlinedCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card variant="outlined" {...props} />
)

export const InteractiveCard: React.FC<Omit<CardProps, 'variant'> & { onClick: () => void }> = (props) => (
  <Card variant="interactive" {...props} />
)
