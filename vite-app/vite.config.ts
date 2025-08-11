import { defineConfig } from 'vite'
import path from 'node:path'
import fs from 'node:fs'

function readPkgVersion(): string {
  const pkgPath = path.resolve(__dirname, 'package.json')
  const raw = fs.readFileSync(pkgPath, 'utf-8')
  const json = JSON.parse(raw) as { version?: string }
  return json.version ?? '0.0.0'
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
        server.watcher.add(pkgPath)
        const isPkg = (file: string) => path.basename(file) === 'package.json'
        server.watcher.on('all', (_event, file) => {
          if (file && isPkg(file)) {
            // eslint-disable-next-line no-console
            console.log('[version-watch] Detected package.json change; restarting Vite dev server...')
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
    __APP_VERSION__: JSON.stringify(readPkgVersion()),
  },
}))


