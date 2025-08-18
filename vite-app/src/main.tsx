import React from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import { App } from './ui/App'
import { ConvexProvider } from 'convex/react'
import { convex } from './convexClient'
import { CONFIG } from './config'

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>
)

// Map CONFIG.layout to CSS variables at runtime
const root = document.documentElement
root.style.setProperty('--app-max-width', `${CONFIG.layout.appMaxWidthPx}px`)
root.style.setProperty('--hands-columns', `${CONFIG.layout.handsColumns}`)


