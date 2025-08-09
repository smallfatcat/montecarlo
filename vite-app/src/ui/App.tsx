import { useEffect, useState } from 'react'
import { TableMulti } from './TableMulti'
import { TableFlat } from './TableFlat'
import { CONFIG } from '../config'

export function App() {
  const [view, setView] = useState<'multi' | 'flat'>('multi')
  useEffect(() => {
    const root = document.documentElement
    if (view === 'flat') {
      root.style.setProperty('--app-max-width', '1600px')
    } else {
      root.style.setProperty('--app-max-width', `${CONFIG.layout.appMaxWidthPx}px`)
    }
  }, [view])
  return (
    <div className="table">
      <h1>Blackjack</h1>
      <div style={{ marginBottom: 12 }}>
        <label>View: </label>
        <select value={view} onChange={(e) => setView(e.target.value as any)}>
          <option value="multi">Multi-seat Grid</option>
          <option value="flat">Flat (Dealer Top, Players Bottom)</option>
        </select>
      </div>
      {view === 'multi' ? <TableMulti /> : <TableFlat />}
    </div>
  )
}


