import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Badge } from '../Badge'

describe('Badge Component', () => {
  it('renders with default props', () => {
    render(<Badge>Default Badge</Badge>)
    const badge = screen.getByText('Default Badge')
    expect(badge).toBeInTheDocument()
    expect(badge.closest('.badge')).toBeTruthy()
  })

  it('renders different variants correctly', () => {
    const { rerender } = render(<Badge variant="primary">Primary</Badge>)
    expect(screen.getByText('Primary')).toBeInTheDocument()

    rerender(<Badge variant="success">Success</Badge>)
    expect(screen.getByText('Success')).toBeInTheDocument()

    rerender(<Badge variant="warning">Warning</Badge>)
    expect(screen.getByText('Warning')).toBeInTheDocument()

    rerender(<Badge variant="error">Error</Badge>)
    expect(screen.getByText('Error')).toBeInTheDocument()

    rerender(<Badge variant="outline">Outline</Badge>)
    expect(screen.getByText('Outline')).toBeInTheDocument()
  })

  it('renders different sizes correctly', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>)
    expect(screen.getByText('Small')).toBeInTheDocument()

    rerender(<Badge size="lg">Large</Badge>)
    expect(screen.getByText('Large')).toBeInTheDocument()
  })

  it('shows dot indicator when specified', () => {
    render(<Badge dot>With Dot</Badge>)
    const dot = screen.getByText('With Dot').closest('.badge')?.querySelector('.badge__dot')
    expect(dot).toBeTruthy()
  })

  it('shows removable badge with close button', () => {
    const handleRemove = vi.fn()
    render(<Badge removable onRemove={handleRemove}>Removable</Badge>)
    
    const removeButton = screen.getByText('Removable').closest('.badge')?.querySelector('.badge__remove')
    expect(removeButton).toBeTruthy()
    
    removeButton?.click()
    expect(handleRemove).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(<Badge className="custom-badge">Custom</Badge>)
    const badge = screen.getByText('Custom').closest('.badge')
    expect(badge?.className).toContain('custom-badge')
  })

  it('renders content in badge__content span', () => {
    render(<Badge>Content Test</Badge>)
    const content = screen.getByText('Content Test').closest('.badge__content')
    expect(content).toBeTruthy()
  })
})
