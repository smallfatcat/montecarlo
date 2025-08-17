import { useState, useEffect } from 'react'
import './Landing.css'

export function Landing() {
  const [version, setVersion] = useState('v0.3.0')
  
  useEffect(() => {
    // Try to load version from BUILD_INFO
    fetch('/BUILD_INFO')
      .then(response => response.ok ? response.text() : null)
      .then(text => {
        if (text) {
          const lines = text.split('\n')
          for (const line of lines) {
            if (line.startsWith('VITE_APP_VERSION=')) {
              const versionValue = line.split('=')[1]?.trim()
              if (versionValue) {
                setVersion(`v${versionValue}`)
                break
              }
            }
          }
        }
      })
      .catch(() => {
        // Fallback to package.json version
        setVersion('v0.3.0')
      })
  }, [])

  const navigateTo = (hash: string) => {
    window.location.hash = hash
  }

  return (
    <div className="landing-container">
      {/* Header Section */}
      <header className="landing-header">
        <h1 className="landing-title">Monte Carlo</h1>
        <p className="landing-subtitle">Casino Game Application</p>
        <div className="version-badge">
          <span>{version}</span>
        </div>
      </header>

      {/* Main Navigation Section */}
      <section className="landing-section">
        <h2 className="section-title">🎮 Play Games</h2>
        <div className="nav-grid">
          <div className="nav-card primary" onClick={() => navigateTo('#lobby')}>
            <div className="nav-icon">♠️</div>
            <h3>Poker Lobby</h3>
            <p>Join multiplayer Texas Hold'em tables</p>
            <div className="nav-badge">Live</div>
          </div>
          
          <div className="nav-card" onClick={() => navigateTo('#poker-test')}>
            <div className="nav-icon">🎯</div>
            <h3>Poker Test</h3>
            <p>Test poker game mechanics</p>
          </div>
          
          <div className="nav-card disabled">
            <div className="nav-icon">🃏</div>
            <h3>Blackjack</h3>
            <p>Coming soon - simulation engine ready</p>
            <div className="nav-badge">Soon</div>
          </div>
        </div>
      </section>

      {/* Tools & Utilities Section */}
      <section className="landing-section">
        <h2 className="section-title">🛠️ Tools & Utilities</h2>
        <div className="nav-grid">
          <div className="nav-card" onClick={() => navigateTo('#poker-layout-editor')}>
            <div className="nav-icon">🎨</div>
            <h3>Layout Editor</h3>
            <p>Customize poker table layouts</p>
          </div>
          
          <div className="nav-card" onClick={() => navigateTo('#poker-history')}>
            <div className="nav-icon">📊</div>
            <h3>Game History</h3>
            <p>Review past poker hands</p>
          </div>
          
          <div className="nav-card" onClick={() => navigateTo('#cards')}>
            <div className="nav-icon">🃏</div>
            <h3>Card Gallery</h3>
            <p>Browse card designs</p>
          </div>
        </div>
      </section>

      {/* Development Section */}
      <section className="landing-section">
        <h2 className="section-title">🔧 Development</h2>
        <div className="nav-grid">
          <div className="nav-card" onClick={() => navigateTo('#design-system')}>
            <div className="nav-icon">🎨</div>
            <h3>Design System</h3>
            <p>UI components and design tokens</p>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="landing-section">
        <h2 className="section-title">🔗 Quick Links</h2>
        <div className="quick-links">
          <button 
            className="quick-link-btn"
            onClick={() => navigateTo('#lobby')}
          >
            Join Poker Lobby
          </button>
          <button 
            className="quick-link-btn"
            onClick={() => navigateTo('#poker-test')}
          >
            Test Poker Game
          </button>
          <button 
            className="quick-link-btn"
            onClick={() => navigateTo('#cards')}
          >
            View Cards
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>Built with React, TypeScript, and WebSocket technology</p>
        <p>Real-time multiplayer poker with authoritative server</p>
      </footer>
    </div>
  )
}


