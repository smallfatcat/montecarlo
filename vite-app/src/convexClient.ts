import { ConvexReactClient } from 'convex/react'

// For Vite/frontend, we need to handle environment variables differently
// Vite only exposes variables prefixed with VITE_ to import.meta.env
const url = import.meta.env.VITE_CONVEX_URL as string | undefined

if (!url) {
  console.error('❌ VITE_CONVEX_URL environment variable is required')
  console.error('Please set VITE_CONVEX_URL in your .env file')
  throw new Error('Missing required environment variable: VITE_CONVEX_URL')
}

// Validate URL format
try {
  new URL(url)
} catch (error) {
  console.error('❌ VITE_CONVEX_URL must be a valid URL')
  throw new Error('Invalid VITE_CONVEX_URL format')
}

console.log('✅ Convex client configured with URL:', url)

// Create Convex client with validated URL
export const convex = new ConvexReactClient(url)

// Export environment for use in other parts of the app
export const env = {
  VITE_CONVEX_URL: url,
  NODE_ENV: import.meta.env.MODE
}


