import { defineConfig } from 'vite'
import path from 'node:path'
import fs from 'node:fs'

function readVersion(): string {
  // Try to read from generated VERSION file first
  const versionPath = path.resolve(__dirname, 'VERSION')
  try {
    if (fs.existsSync(versionPath)) {
      const version = fs.readFileSync(versionPath, 'utf-8').trim()
      if (version) {
        return version
      }
    }
  } catch (error) {
    console.warn('[version] Could not read VERSION file:', error)
  }
  
  // Fallback to package.json
  const pkgPath = path.resolve(__dirname, 'package.json')
  try {
    const raw = fs.readFileSync(pkgPath, 'utf-8')
    const json = JSON.parse(raw) as { version?: string }
    return json.version ?? '0.0.0'
  } catch (error) {
    console.warn('[version] Could not read package.json:', error)
    return '0.0.0'
  }
}

export default defineConfig(({ command }) => ({
  base: '/montecarlo/',
  server: {
    watch: {
      usePolling: true,
      interval: 200,
    },
  },
  plugins: [
    {
      name: 'restart-on-package-json-change',
      apply: 'serve',
      configureServer(server) {
        const pkgPath = path.resolve(__dirname, 'package.json')
        const versionPath = path.resolve(__dirname, 'VERSION')
        server.watcher.add(pkgPath)
        server.watcher.add(versionPath)
        const isPkg = (file: string) => path.basename(file) === 'package.json'
        const isVersion = (file: string) => path.basename(file) === 'VERSION'
        server.watcher.on('all', (_event, file) => {
          if (file && (isPkg(file) || isVersion(file))) {
            // eslint-disable-next-line no-console
            console.log('[version-watch] Detected package.json or VERSION change; restarting Vite dev server...')
            server.restart()
          }
        })
      },
      handleHotUpdate(ctx) {
        if (path.basename(ctx.file) === 'package.json') {
          // eslint-disable-next-line no-console
          console.log('[version-watch] HMR package.json change; requesting restart...')
          ctx.server.restart()
          return []
        }
      }
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(readVersion()),
  },
}))


