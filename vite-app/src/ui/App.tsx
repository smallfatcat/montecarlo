import { useEffect } from 'react'
import { CONFIG } from '../config'
import { useAppRouting } from './hooks/useAppRouting'
import { AppContentRenderer } from './components/AppContentRenderer'
import VersionDisplay from '../components/VersionDisplay'
import '../styles/design-tokens.css'

export function App() {
  const routing = useAppRouting();

  // Set CSS variables for layout configuration
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-max-width', `${CONFIG.layout.appMaxWidthPx}px`);
    root.style.setProperty('--hands-columns', `${CONFIG.layout.handsColumns}`);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <AppContentRenderer {...routing} />
      
      {/* Version display positioned at bottom */}
      <div
        id="app-version"
        style={{
          position: 'fixed',
          bottom: 6,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 12,
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      >
        <VersionDisplay />
      </div>
    </div>
  )
}


