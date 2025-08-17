import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { Button } from '../Button'

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button.className).toContain('btn')
    expect(button.className).toContain('btn--primary')
    expect(button.className).toContain('btn--md')
  })

  it('renders different variants correctly', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button').className).toContain('btn--secondary')

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button').className).toContain('btn--outline')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button').className).toContain('btn--ghost')

    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button').className).toContain('btn--danger')
  })

  it('renders different sizes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button').className).toContain('btn--sm')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button').className).toContain('btn--lg')
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state correctly', () => {
    render(<Button loading>Loading</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toBeDisabled()
    expect(button.className).toContain('btn--loading')
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('can be disabled', () => {
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>Disabled</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    
    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    
    expect(screen.getByRole('button').className).toContain('custom-class')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Ref Test</Button>)
    
    expect(ref.current).toBe(screen.getByRole('button'))
  })
})
