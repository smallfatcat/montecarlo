import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    
    // Path resolution
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'convex-api': path.resolve(__dirname, '../convex/_generated/api'),
        'convex-types': path.resolve(__dirname, '../convex/_generated/dataModel'),
      },
    },
    
    // Define global constants
    define: {
      __DEV__: mode === 'development',
    },
    
    // Development server configuration
    server: {
      port: 5173,
      host: true,
      headers: {
        // Content Security Policy for development
        'Content-Security-Policy': mode === 'development' 
          ? `
            default-src 'self';
            script-src 'self' 'unsafe-eval' 'unsafe-inline';
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
            img-src 'self' data: blob:;
            font-src 'self' data: https://fonts.gstatic.com;
            connect-src 'self' ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:* https://*.smallfatcat-dev.org wss://*.smallfatcat-dev.org https://convex.smallfatcat-dev.org wss://convex.smallfatcat-dev.org;
            object-src 'none';
            media-src 'self';
            frame-src 'none';
            worker-src 'self' blob:;
            child-src 'self';
            form-action 'self';
            base-uri 'self';
            manifest-src 'self';
          `.replace(/\s+/g, ' ').trim()
          : `
            default-src 'self';
            script-src 'self';
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
            img-src 'self' data: blob:;
            font-src 'self' data: https://fonts.gstatic.com;
            connect-src 'self' wss: https: https://*.smallfatcat-dev.org wss://*.smallfatcat-dev.org;
            object-src 'none';
            media-src 'self';
            frame-src 'none';
            worker-src 'self' blob:;
            child-src 'self';
            form-action 'self';
            base-uri 'self';
            manifest-src 'self';
            upgrade-insecure-requests;
          `.replace(/\s+/g, ' ').trim(),
        
        // Additional security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      }
    },
    
    // Build configuration
    build: {
      // Security-focused build settings
      target: 'esnext',
      sourcemap: mode === 'development',
      
      rollupOptions: {
        output: {
          // Secure file naming to prevent information disclosure
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      
      // Security optimizations
      minify: mode === 'production',
      
      // Remove console logs and debugger statements in production
      terserOptions: mode === 'production' ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      } : undefined,
    },
    
    // Environment variable configuration
    envPrefix: ['VITE_'],
    
    // Preview server configuration (for production builds)
    preview: {
      port: 4173,
      headers: {
        // Production CSP headers
        'Content-Security-Policy': `
          default-src 'self';
          script-src 'self';
          style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
          img-src 'self' data: blob:;
          font-src 'self' data: https://fonts.gstatic.com;
          connect-src 'self' wss: https: https://*.smallfatcat-dev.org wss://*.smallfatcat-dev.org;
          object-src 'none';
          media-src 'self';
          frame-src 'none';
          worker-src 'self' blob:;
          child-src 'self';
          form-action 'self';
          base-uri 'self';
          manifest-src 'self';
          upgrade-insecure-requests;
        `.replace(/\s+/g, ' ').trim(),
        
        // Additional security headers for production
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      }
    },
    
    // Test configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/build/**',
          '**/dist/**'
        ],
        thresholds: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
          }
        }
      }
    }
  }
})