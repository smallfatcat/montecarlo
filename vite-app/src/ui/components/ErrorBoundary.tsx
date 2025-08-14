import React, { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary" style={{
          padding: '20px',
          margin: '20px',
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#fff5f5',
          color: '#c53030',
        }}>
          <h2>Something went wrong</h2>
          <p>The game encountered an unexpected error. Please try refreshing the page.</p>
          {import.meta.env.DEV && this.state.error && (
            <details style={{ marginTop: '10px' }}>
              <summary>Error Details (Development)</summary>
              <pre style={{ 
                marginTop: '10px', 
                padding: '10px', 
                backgroundColor: '#f7fafc', 
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Refresh Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Specialized error boundary for poker games
export class PokerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PokerErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="poker-error-boundary" style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'rgba(0,0,0,0.9)',
          color: 'white',
          borderRadius: '12px',
          margin: '20px',
        }}>
          <h2>Poker Game Error</h2>
          <p>The poker game encountered an error and needs to be restarted.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: '#38a169',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Restart Game
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
