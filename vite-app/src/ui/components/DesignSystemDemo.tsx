import { useState } from 'react'
import { 
  Button, 
  Card, 
  Badge, 
  Input, 
  PokerTableCard,
  LoadingSpinner,
  ErrorBoundary,
  StatusMessage
} from './index'
import './DesignSystemDemo.css'

export function DesignSystemDemo() {
  const [inputValue, setInputValue] = useState('')
  // const [selectedVariant, setSelectedVariant] = useState('primary')
  const [showError, setShowError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSimulateError = () => {
    setShowError(true)
    setTimeout(() => setShowError(false), 3000)
  }

  const handleSimulateLoading = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }

  return (
    <div className="design-system-demo">
      <header className="design-system-demo__header">
        <h1>Poker Design System</h1>
        <p>A comprehensive collection of reusable UI components for the poker application</p>
      </header>

      <div className="design-system-demo__content">
        {/* Loading & Error States Section */}
        <section className="design-system-demo__section">
          <h2>Loading & Error States</h2>
          <p>Components for handling loading states, errors, and user feedback</p>
          
          <div className="design-system-demo__grid">
            <Card variant="outlined" className="design-system-demo__component">
              <h3>Loading Spinner</h3>
              <div className="design-system-demo__examples">
                <div>
                  <h4>Small</h4>
                  <LoadingSpinner size="small" />
                </div>
                <div>
                  <h4>Medium</h4>
                  <LoadingSpinner size="medium" />
                </div>
                <div>
                  <h4>Large</h4>
                  <LoadingSpinner size="large" />
                </div>
                <div>
                  <h4>With Text</h4>
                  <LoadingSpinner size="medium" text="Loading..." />
                </div>
                <div>
                  <h4>Custom Color</h4>
                  <LoadingSpinner size="medium" color="#10b981" />
                </div>
              </div>
            </Card>

            <Card variant="outlined" className="design-system-demo__component">
              <h3>Status Messages</h3>
              <div className="design-system-demo__examples">
                <StatusMessage
                  type="success"
                  title="Success!"
                  message="Your action was completed successfully."
                  details="Additional details can be shown here for debugging or user information."
                />
                
                <StatusMessage
                  type="warning"
                  title="Warning"
                  message="Please review your input before proceeding."
                  dismissible
                  onDismiss={() => console.log('Dismissed')}
                />
                
                <StatusMessage
                  type="error"
                  title="Error Occurred"
                  message="Something went wrong. Please try again."
                  actions={
                    <Button onClick={handleSimulateError} variant="danger" size="sm">
                      Simulate Error
                    </Button>
                  }
                />
                
                <StatusMessage
                  type="info"
                  message="This is an informational message for the user."
                />
                
                <StatusMessage
                  type="loading"
                  message="Processing your request..."
                />
              </div>
            </Card>

            <Card variant="outlined" className="design-system-demo__component">
              <h3>Error Boundary</h3>
              <p>Catches React errors and displays a fallback UI</p>
              <ErrorBoundary>
                <div>
                  <p>This content is wrapped in an error boundary.</p>
                  {showError && (
                    <button onClick={() => { throw new Error('Simulated error!') }}>
                      Throw Error
                    </button>
                  )}
                </div>
              </ErrorBoundary>
            </Card>
          </div>
        </section>

        {/* Interactive Examples Section */}
        <section className="design-system-demo__section">
          <h2>Interactive Examples</h2>
          <p>See the components in action with real interactions</p>
          
          <div className="design-system-demo__grid">
            <Card variant="outlined" className="design-system-demo__component">
              <h3>Loading States</h3>
              <div className="design-system-demo__examples">
                <Button 
                  onClick={handleSimulateLoading}
                  disabled={isLoading}
                  variant="primary"
                >
                  {isLoading ? 'Loading...' : 'Simulate Loading'}
                </Button>
                
                {isLoading && (
                  <div style={{ marginTop: 16 }}>
                    <LoadingSpinner size="small" text="Processing..." />
                  </div>
                )}
              </div>
            </Card>

            <Card variant="outlined" className="design-system-demo__component">
              <h3>Form Validation</h3>
              <div className="design-system-demo__examples">
                <Input
                  label="Player Name"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter your name"
                  helperText="Choose a unique display name"
                />
                
                {inputValue.length > 0 && inputValue.length < 3 && (
                  <StatusMessage
                    type="warning"
                    message="Name must be at least 3 characters long"
                    className="mt-2"
                  />
                )}
                
                {inputValue.length >= 3 && (
                  <StatusMessage
                    type="success"
                    message="Name looks good!"
                    className="mt-2"
                  />
                )}
              </div>
            </Card>
          </div>
        </section>

        {/* Base Components Section */}
        <section className="design-system-demo__section">
          <h2>Base Components</h2>
          <p>Fundamental UI building blocks</p>
          
          <div className="design-system-demo__grid">
            <Card variant="outlined" className="design-system-demo__component">
              <h3>Buttons</h3>
              <div className="design-system-demo__examples">
                <div>
                  <h4>Variants</h4>
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                </div>
                
                <div>
                  <h4>Sizes</h4>
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
                
                <div>
                  <h4>States</h4>
                  <Button disabled>Disabled</Button>
                  <Button loading>Loading</Button>
                </div>
              </div>
            </Card>

            <Card variant="outlined" className="design-system-demo__component">
              <h3>Cards</h3>
              <div className="design-system-demo__examples">
                <Card variant="default" padding="sm">
                  <h4>Default Card</h4>
                  <p>Basic card with default styling</p>
                </Card>
                
                <Card variant="elevated" padding="md">
                  <h4>Elevated Card</h4>
                  <p>Card with shadow and elevation</p>
                </Card>
                
                <Card variant="outlined" padding="lg">
                  <h4>Outlined Card</h4>
                  <p>Card with border emphasis</p>
                </Card>
              </div>
            </Card>

            <Card variant="outlined" className="design-system-demo__component">
              <h3>Badges</h3>
              <div className="design-system-demo__examples">
                <div>
                  <h4>Variants</h4>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
                
                <div>
                  <h4>Sizes</h4>
                  <Badge size="sm">Small</Badge>
                  <Badge size="md">Medium</Badge>
                  <Badge size="lg">Large</Badge>
                </div>
                
                <div>
                  <h4>Features</h4>
                  <Badge dot>With Dot</Badge>
                  <Badge removable onRemove={() => console.log('Removed')}>
                    Removable
                  </Badge>
                </div>
              </div>
            </Card>

            <Card variant="outlined" className="design-system-demo__component">
              <h3>Inputs</h3>
              <div className="design-system-demo__examples">
                <Input
                  label="Text Input"
                  placeholder="Enter text here"
                  helperText="This is helper text"
                />
                
                <Input
                  label="Required Input"
                  placeholder="This field is required"
                  required
                  error="This field is required"
                />
                
                <Input
                  label="Disabled Input"
                  placeholder="This input is disabled"
                  disabled
                  value="Disabled value"
                />
              </div>
            </Card>
          </div>
        </section>

        {/* Poker Components Section */}
        <section className="design-system-demo__section">
          <h2>Poker-Specific Components</h2>
          <p>Components designed specifically for poker gameplay</p>
          
          <div className="design-system-demo__grid">
            <Card variant="outlined" className="design-system-demo__component">
              <h3>Poker Table Card</h3>
              <div className="design-system-demo__examples">
                <PokerTableCard
                  table={{
                    tableId: 'demo-table-1',
                    status: 'waiting',
                    seats: 6,
                    humans: 2,
                    cpus: 1,
                    handId: null,
                    updatedAt: Date.now()
                  }}
                  onJoin={() => console.log('Join table')}
                  onSpectate={() => console.log('Spectate table')}
                />
                
                <PokerTableCard
                  table={{
                    tableId: 'demo-table-2',
                    status: 'in-game',
                    seats: 9,
                    humans: 6,
                    cpus: 2,
                    handId: 12345,
                    updatedAt: Date.now()
                  }}
                  onJoin={() => console.log('Join table')}
                  onSpectate={() => console.log('Spectate table')}
                />
              </div>
            </Card>
          </div>
        </section>

        {/* Design Tokens Section */}
        <section className="design-system-demo__section">
          <h2>Design Tokens</h2>
          <p>CSS custom properties that define the design system</p>
          
          <div className="design-system-demo__grid">
            <Card variant="outlined" className="design-system-demo__component">
              <h3>Colors</h3>
              <div className="design-system-demo__examples">
                <div className="design-system-demo__color-grid">
                  <div className="design-system-demo__color-swatch" style={{ backgroundColor: 'var(--color-primary-500)' }}>
                    <span>Primary 500</span>
                  </div>
                  <div className="design-system-demo__color-swatch" style={{ backgroundColor: 'var(--color-success-500)' }}>
                    <span>Success 500</span>
                  </div>
                  <div className="design-system-demo__color-swatch" style={{ backgroundColor: 'var(--color-warning-500)' }}>
                    <span>Warning 500</span>
                  </div>
                                  <div className="design-system-demo__color-swatch" style={{ backgroundColor: 'var(--color-error-500)' }}>
                  <span>Error 500</span>
                </div>
                  <div className="design-system-demo__color-swatch" style={{ backgroundColor: 'var(--color-neutral-500)' }}>
                    <span>Neutral 500</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="outlined" className="design-system-demo__component">
              <h3>Spacing</h3>
              <div className="design-system-demo__examples">
                <div className="design-system-demo__spacing-examples">
                  <div style={{ padding: 'var(--spacing-1)', backgroundColor: 'var(--color-neutral-200)' }}>
                    Spacing 1 (4px)
                  </div>
                  <div style={{ padding: 'var(--spacing-2)', backgroundColor: 'var(--color-neutral-200)' }}>
                    Spacing 2 (8px)
                  </div>
                  <div style={{ padding: 'var(--spacing-3)', backgroundColor: 'var(--color-neutral-200)' }}>
                    Spacing 3 (12px)
                  </div>
                  <div style={{ padding: 'var(--spacing-4)', backgroundColor: 'var(--color-neutral-200)' }}>
                    Spacing 4 (16px)
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
