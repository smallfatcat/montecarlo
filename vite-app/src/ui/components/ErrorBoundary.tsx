import React, { Component, type ReactNode } from 'react'
import { Card } from './Card'
import { Button } from './Button'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
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
    this.setState({
      error,
      errorInfo
    })
    
    this.props.onError?.(error, errorInfo)
    
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleReport = () => {
    // In a real app, this would send the error to an error reporting service
    const errorReport = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString()
    }
    
    console.log('Error Report:', errorReport)
    
    // You could send this to your backend or error reporting service
    // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorReport) })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <Card variant="outlined" className="error-boundary__card">
            <div className="error-boundary__header">
              <div className="error-boundary__icon">⚠️</div>
              <h3 className="error-boundary__title">Something went wrong</h3>
            </div>
            
            <div className="error-boundary__content">
              <p className="error-boundary__message">
                An unexpected error occurred while rendering this component.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="error-boundary__details">
                  <summary className="error-boundary__summary">Error Details</summary>
                  <pre className="error-boundary__error-stack">
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            
            <div className="error-boundary__actions">
              <Button onClick={this.handleRetry} variant="primary">
                Try Again
              </Button>
              <Button onClick={this.handleReport} variant="outline">
                Report Issue
              </Button>
            </div>
          </Card>
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
