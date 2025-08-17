import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Card } from '../Card'

describe('Card Component', () => {
  it('renders with default props', () => {
    render(<Card>Card content</Card>)
    const card = screen.getByText('Card content')
    expect(card).toBeInTheDocument()
    expect(card.closest('.card')).toBeTruthy()
  })

  it('renders different variants correctly', () => {
    const { rerender } = render(<Card variant="elevated">Elevated</Card>)
    expect(screen.getByText('Elevated')).toBeInTheDocument()

    rerender(<Card variant="outlined">Outlined</Card>)
    expect(screen.getByText('Outlined')).toBeInTheDocument()

    rerender(<Card variant="interactive">Interactive</Card>)
    expect(screen.getByText('Interactive')).toBeInTheDocument()
  })

  it('renders different padding sizes correctly', () => {
    const { rerender } = render(<Card padding="none">No Padding</Card>)
    expect(screen.getByText('No Padding')).toBeInTheDocument()

    rerender(<Card padding="sm">Small Padding</Card>)
    expect(screen.getByText('Small Padding')).toBeInTheDocument()

    rerender(<Card padding="lg">Large Padding</Card>)
    expect(screen.getByText('Large Padding')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Card className="custom-class">Custom</Card>)
    const card = screen.getByText('Custom').closest('.card')
    expect(card?.className).toContain('custom-class')
  })

  it('handles click events when interactive', () => {
    const handleClick = vi.fn()
    render(<Card onClick={handleClick}>Clickable</Card>)
    
    const card = screen.getByText('Clickable').closest('.card')
    expect(card).toBeTruthy()
    
    card?.click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies hoverable class when specified', () => {
    render(<Card hoverable>Hoverable</Card>)
    const card = screen.getByText('Hoverable').closest('.card')
    expect(card?.className).toContain('card--hoverable')
  })

  it('renders as button when onClick is provided', () => {
    render(<Card onClick={() => {}}>Button Card</Card>)
    const button = screen.getByText('Button Card').closest('button')
    expect(button).toBeInTheDocument()
  })

  it('renders as div when no onClick is provided', () => {
    render(<Card>Div Card</Card>)
    const div = screen.getByText('Div Card').closest('div')
    expect(div).toBeInTheDocument()
  })
})
