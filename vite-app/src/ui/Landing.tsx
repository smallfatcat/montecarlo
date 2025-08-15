export function Landing() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Montecarlo</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>Choose a game</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => { window.location.hash = '#blackjack' }}>Blackjack</button>
        <button onClick={() => { window.location.hash = '#poker' }}>Poker</button>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, opacity: 0.8, fontSize: 14 }}>
        <a href="#cards">Card Gallery</a>
        <span>·</span>
        <a href="#poker-test">Poker Test</a>
        <span>·</span>
        <a href="#poker-layout-editor">Layout Editor</a>
      </div>
    </div>
  )
}


