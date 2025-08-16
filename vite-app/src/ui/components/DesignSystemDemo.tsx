import React, { useState } from 'react'
import { Button, Card, Badge, StatusBadge, Input, PokerTableCard } from './index'
import type { TableSummary } from '../../stores/types'
import './DesignSystemDemo.css'

export const DesignSystemDemo: React.FC = () => {
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState('')
  
  // Mock table data for demo - more realistic poker scenarios
  const mockTables: TableSummary[] = [
    {
      tableId: 'high-stakes-001',
      seats: 9,
      humans: 3,
      cpus: 2,
      status: 'playing',
      handId: 12345,
      updatedAt: Date.now() - 30000,
      reserved: [
        { seatIndex: 1, playerName: 'Alice', expiresAt: Date.now() + 30000 },
        { seatIndex: 3, playerName: 'Bob', expiresAt: Date.now() + 30000 }
      ]
    },
    {
      tableId: 'quick-play-002',
      seats: 6,
      humans: 1,
      cpus: 4,
      status: 'waiting',
      handId: null,
      updatedAt: Date.now() - 15000
    },
    {
      tableId: 'tournament-003',
      seats: 8,
      humans: 6,
      cpus: 0,
      status: 'playing',
      handId: 12346,
      updatedAt: Date.now() - 10000
    }
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (e.target.value.length < 3) {
      setInputError('Player name must be at least 3 characters')
    } else {
      setInputError('')
    }
  }

  return (
    <div className="design-system-demo">
      <div className="demo-header">
        <h1>Monte Carlo Design System</h1>
        <p>A professional design system built for high-stakes poker applications, featuring consistent components, accessibility, and a sophisticated visual hierarchy.</p>
      </div>

      <div className="demo-section">
        <h2>Design Foundation</h2>
        <div className="demo-grid">
          <div className="demo-item">
            <h3>Color Palette</h3>
            <div className="color-palette">
              <div className="color-swatch" style={{ backgroundColor: 'var(--color-poker-green)' }}>
                <span>Poker Green</span>
              </div>
              <div className="color-swatch" style={{ backgroundColor: 'var(--color-poker-gold)' }}>
                <span>Poker Gold</span>
              </div>
              <div className="color-swatch" style={{ backgroundColor: 'var(--color-primary-600)' }}>
                <span>Primary Blue</span>
              </div>
              <div className="color-swatch" style={{ backgroundColor: 'var(--color-success-500)' }}>
                <span>Success Green</span>
              </div>
            </div>
            <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', color: 'var(--color-neutral-300)' }}>
              Professional color scheme optimized for poker table aesthetics
            </p>
          </div>
          
          <div className="demo-item">
            <h3>Spacing System</h3>
            <div className="spacing-demo">
              <div className="spacing-item" style={{ marginBottom: 'var(--space-1)' }}>4px - Micro spacing</div>
              <div className="spacing-item" style={{ marginBottom: 'var(--space-2)' }}>8px - Component padding</div>
              <div className="spacing-item" style={{ marginBottom: 'var(--space-4)' }}>16px - Section margins</div>
              <div className="spacing-item" style={{ marginBottom: 'var(--space-8)' }}>32px - Major sections</div>
            </div>
            <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', color: 'var(--color-neutral-300)' }}>
              Consistent spacing scale for professional layouts
            </p>
          </div>
        </div>
      </div>

      <div className="demo-section">
        <h2>Interactive Components</h2>
        <div className="demo-grid">
          <div className="demo-item">
            <h3>Action Buttons</h3>
            <div className="button-group">
              <Button variant="primary">CALL</Button>
              <Button variant="outline">CHECK</Button>
              <Button variant="danger">FOLD</Button>
            </div>
            <div className="button-group" style={{ marginTop: 'var(--space-3)' }}>
              <Button variant="primary" size="lg">RAISE</Button>
              <Button variant="secondary" size="lg">ALL IN</Button>
            </div>
            <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', color: 'var(--color-neutral-300)' }}>
              Poker action buttons with clear visual hierarchy
            </p>
          </div>
          
          <div className="demo-item">
            <h3>Button States</h3>
            <div className="button-group">
              <Button loading>Processing...</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="button-group" style={{ marginTop: 'var(--space-3)' }}>
              <Button variant="ghost" size="sm">Settings</Button>
              <Button variant="outline" size="sm">Help</Button>
            </div>
            <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', color: 'var(--color-neutral-300)' }}>
              Loading states and disabled states for better UX
            </p>
          </div>
        </div>
      </div>

      <div className="demo-section">
        <h2>Information Display</h2>
        <div className="demo-grid">
          <div className="demo-item">
            <Card variant="elevated" padding="md">
              <div className="card__header">
                <h3 className="card__title">Player Statistics</h3>
                <p className="card__subtitle">Session performance overview</p>
              </div>
              <div className="card__body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-poker-gold)' }}>$2,450</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-400)' }}>Total Winnings</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-success-500)' }}>68%</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-400)' }}>Win Rate</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          <div className="demo-item">
            <Card variant="outlined" padding="md">
              <div className="card__header">
                <h3 className="card__title">Game Status</h3>
                <p className="card__subtitle">Current hand information</p>
              </div>
              <div className="card__body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-neutral-300)' }}>Pot Size:</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-poker-gold)' }}>$1,200</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-neutral-300)' }}>Players:</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-primary-400)' }}>6 active</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-neutral-300)' }}>Blinds:</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-neutral-200)' }}>$10/$20</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="demo-section">
        <h2>Status & Indicators</h2>
        <div className="demo-grid">
          <div className="demo-item">
            <h3>Player Status</h3>
            <div className="badge-group">
              <StatusBadge status="online">Online</StatusBadge>
              <StatusBadge status="away">Away</StatusBadge>
              <StatusBadge status="busy">In Game</StatusBadge>
              <StatusBadge status="offline">Offline</StatusBadge>
            </div>
            <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', color: 'var(--color-neutral-300)' }}>
              Clear status indicators for player availability
            </p>
          </div>
          
          <div className="demo-item">
            <h3>Game Indicators</h3>
            <div className="badge-group">
              <Badge variant="success" dot>Active</Badge>
              <Badge variant="warning" dot>Waiting</Badge>
              <Badge variant="error" dot>Full</Badge>
              <Badge variant="primary" dot>Tournament</Badge>
            </div>
            <div className="badge-group" style={{ marginTop: 'var(--space-3)' }}>
              <Badge variant="outline" size="lg">VIP Table</Badge>
              <Badge variant="outline" size="lg">High Stakes</Badge>
            </div>
            <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', color: 'var(--color-neutral-300)' }}>
              Game state and table type indicators
            </p>
          </div>
        </div>
      </div>

      <div className="demo-section">
        <h2>Form Elements</h2>
        <div className="demo-grid">
          <div className="demo-item">
            <h3>Player Input</h3>
            <Input
              label="Player Name"
              placeholder="Enter your poker alias..."
              helperText="Choose a unique name for the poker room"
              fullWidth
            />
            <Input
              label="Buy-in Amount"
              placeholder="Enter amount in dollars"
              helperText="Minimum buy-in: $100"
              fullWidth
              style={{ marginTop: 'var(--space-4)' }}
            />
          </div>
          
          <div className="demo-item">
            <h3>Validation & Errors</h3>
            <Input
              label="Email Address"
              placeholder="your@email.com"
              value={inputValue}
              onChange={handleInputChange}
              error={inputError}
              fullWidth
            />
            <Input
              variant="outlined"
              label="Password"
              type="password"
              placeholder="Enter your password"
              helperText="Must be at least 8 characters"
              fullWidth
              style={{ marginTop: 'var(--space-4)' }}
            />
          </div>
        </div>
      </div>

      <div className="demo-section">
        <h2>Poker Table Components</h2>
        <div className="demo-grid">
          {mockTables.map((table, index) => (
            <div key={table.tableId} className="demo-item">
              <h3>Table {index + 1}</h3>
              <PokerTableCard
                table={table}
                onJoin={(tableId) => console.log('Joining table:', tableId)}
                onSpectate={(tableId) => console.log('Spectating table:', tableId)}
                className="poker-table-card"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="demo-section">
        <h2>Responsive Design</h2>
        <p style={{ textAlign: 'center', marginBottom: 'var(--space-6)', color: 'var(--color-neutral-300)', fontSize: 'var(--font-size-lg)' }}>
          This design system is built with mobile-first responsive design principles, ensuring optimal experience across all devices.
        </p>
        
        <div className="responsive-demo">
          <div className="responsive-item">
            <h4>Mobile Optimized</h4>
            <p>Touch-friendly controls and mobile-optimized layouts for on-the-go poker gaming.</p>
          </div>
          <div className="responsive-item">
            <h4>Tablet Ready</h4>
            <p>Perfect balance of information density and usability for tablet devices.</p>
          </div>
          <div className="responsive-item">
            <h4>Desktop Enhanced</h4>
            <p>Full-featured interface with advanced controls and multi-table support.</p>
          </div>
        </div>
      </div>

      <div className="demo-section">
        <h2>Accessibility Features</h2>
        <div className="demo-grid">
          <div className="demo-item">
            <h3>Screen Reader Support</h3>
            <p style={{ color: 'var(--color-neutral-300)', textAlign: 'center' }}>
              All components include proper ARIA labels, semantic HTML, and keyboard navigation support.
            </p>
            <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
              <Badge variant="success">WCAG 2.1 AA Compliant</Badge>
            </div>
          </div>
          
          <div className="demo-item">
            <h3>Keyboard Navigation</h3>
            <p style={{ color: 'var(--color-neutral-300)', textAlign: 'center' }}>
              Full keyboard support with visible focus indicators and logical tab order.
            </p>
            <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
              <Badge variant="primary">Tab Navigation</Badge>
              <Badge variant="primary" className="ml-2">Arrow Keys</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
