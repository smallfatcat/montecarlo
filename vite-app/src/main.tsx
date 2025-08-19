import React from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';
import { App } from './ui/App';
import { ConvexProvider } from 'convex/react';
import { convex } from './convexClient';
import { CONFIG } from './config';

/**
 * Initialize CSS custom properties from configuration
 */
function initializeCSSVariables(): void {
  const root = document.documentElement;
  root.style.setProperty('--app-max-width', `${CONFIG.layout.appMaxWidthPx}px`);
  root.style.setProperty('--hands-columns', `${CONFIG.layout.handsColumns}`);
}

/**
 * Main application entry point
 */
function initializeApp(): void {
  // Initialize CSS variables
  initializeCSSVariables();
  
  // Render the React application
  const rootElement = document.getElementById('app');
  if (!rootElement) {
    throw new Error('Root element "app" not found');
  }
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </React.StrictMode>
  );
}

// Start the application
initializeApp();


