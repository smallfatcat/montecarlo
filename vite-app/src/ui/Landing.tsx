import './Landing.css'

export function Landing() {
  return (
    <div id="landing-root" style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Monte Carlo</h2>

      <nav id="landing-nav" aria-label="Primary" style={{ marginTop: 12 }}>
        <ul id="landing-links" className="landing-links">
          <li>
            <a className="landing-link-btn" href="#lobby">Poker Lobby</a>
          </li>
          <li>
            <a className="landing-link-btn" href="#poker-layout-editor">Layout Editor</a>
          </li>
          <li>
            <a className="landing-link-btn" href="#poker-history">Game History</a>
          </li>
        </ul>
      </nav>
    </div>
  )
}


