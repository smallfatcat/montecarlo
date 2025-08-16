import React, { forwardRef } from 'react'
import './Input.css'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'outlined' | 'filled'
  size?: 'sm' | 'md' | 'lg'
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'default',
  size = 'md',
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  const hasError = !!error
  
  const baseClass = 'input'
  const variantClass = `input--${variant}`
  const sizeClass = `input--${size}`
  const stateClass = hasError ? 'input--error' : ''
  const fullWidthClass = fullWidth ? 'input--full-width' : ''
  
  const combinedClassName = [
    baseClass,
    variantClass,
    sizeClass,
    stateClass,
    fullWidthClass,
    className
  ].filter(Boolean).join(' ')

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={inputId} className="input__label">
          {label}
        </label>
      )}
      
      <div className="input__container">
        {leftIcon && (
          <span className="input__icon input__icon--left">
            {leftIcon}
          </span>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={combinedClassName}
          aria-invalid={hasError}
          aria-describedby={helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        
        {rightIcon && (
          <span className="input__icon input__icon--right">
            {rightIcon}
          </span>
        )}
      </div>
      
      {(error || helperText) && (
        <div className="input__message">
          {error && (
            <span className="input__error" id={`${inputId}-error`}>
              {error}
            </span>
          )}
          {helperText && !error && (
            <span className="input__helper" id={`${inputId}-helper`}>
              {helperText}
            </span>
          )}
        </div>
      )}
    </div>
  )
})

Input.displayName = 'Input'

// Export specific input variants for convenience
export const OutlinedInput: React.FC<Omit<InputProps, 'variant'>> = (props) => (
  <Input variant="outlined" {...props} />
)

export const FilledInput: React.FC<Omit<InputProps, 'variant'>> = (props) => (
  <Input variant="filled" {...props} />
)
