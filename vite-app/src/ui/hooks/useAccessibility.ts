import { useCallback, useEffect, useState } from 'react'

export interface AccessibilityConfig {
  enableKeyboardNavigation?: boolean
  enableScreenReader?: boolean
  enableHighContrast?: boolean
}

export function useAccessibility(config: AccessibilityConfig = {}) {
  const [isHighContrast, setIsHighContrast] = useState(false)
  const [currentFocusIndex, setCurrentFocusIndex] = useState(0)

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent, options: {
    itemCount: number
    onEnter?: () => void
    onEscape?: () => void
    onTab?: (direction: 'forward' | 'backward') => void
  }) => {
    if (!config.enableKeyboardNavigation) return

    const { itemCount, onEnter, onEscape, onTab } = options

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault()
        setCurrentFocusIndex(prev => (prev + 1) % itemCount)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault()
        setCurrentFocusIndex(prev => (prev - 1 + itemCount) % itemCount)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        onEnter?.()
        break
      case 'Escape':
        e.preventDefault()
        onEscape?.()
        break
      case 'Tab':
        if (e.shiftKey) {
          onTab?.('backward')
        } else {
          onTab?.('forward')
        }
        break
    }
  }, [config.enableKeyboardNavigation])

  // High contrast mode
  const toggleHighContrast = useCallback(() => {
    setIsHighContrast(prev => !prev)
  }, [])

  // Apply high contrast styles
  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.style.setProperty('--high-contrast', '1')
    } else {
      document.documentElement.style.removeProperty('--high-contrast')
    }
  }, [isHighContrast])

  // Generate ARIA labels
  const generateAriaLabel = useCallback((action: string, context?: string) => {
    if (!config.enableScreenReader) return undefined
    
    if (context) {
      return `${action} ${context}`
    }
    return action
  }, [config.enableScreenReader])

  // Focus management
  const focusItem = useCallback((index: number) => {
    setCurrentFocusIndex(index)
  }, [])

  return {
    // State
    isHighContrast,
    currentFocusIndex,
    
    // Actions
    handleKeyDown,
    toggleHighContrast,
    generateAriaLabel,
    focusItem,
  }
}
