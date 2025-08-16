// React import not required with modern jsx runtime
import './LoadingSpinner.css'

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  color?: string
  className?: string
  text?: string
  overlay?: boolean
}

export function LoadingSpinner({ 
  size = 'medium', 
  color, 
  className = '', 
  text,
  overlay = false 
}: LoadingSpinnerProps) {
  const spinnerClasses = [
    'loading-spinner',
    `loading-spinner--${size}`,
    className
  ].filter(Boolean).join(' ')

  const spinner = (
    <div className={spinnerClasses}>
      <div className="loading-spinner__spinner" style={{ borderTopColor: color }}></div>
      {text && <div className="loading-spinner__text">{text}</div>}
    </div>
  )

  if (overlay) {
    return (
      <div className="loading-spinner__overlay">
        {spinner}
      </div>
    )
  }

  return spinner
}
