import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { loadServerConfig } from './config/env.js'
import { createHttpServer } from './server/http.js'
import { createSocketServer } from './server/socket.js'
import { registerSocketHandlers } from './sockets/handlers.js'
import { ConvexPublisher } from './ingest/convexPublisher.js'
import { StateMachineAdapter } from './ingest/stateMachineAdapter.js'
import type { TableId } from './tables/serverRuntimeTable.js'
import { createServerRuntimeTable } from './tables/serverRuntimeTable.js'
import { InMemoryTokenStore } from './identity/tokenStore.js'

// Load .env file from the game-server directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../.env') })

async function buildServer() {
  const cfg = loadServerConfig()
  const app = createHttpServer(cfg)
  const io = createSocketServer(app, cfg)

  // Identity management (simple in-memory token store)
  const tokens = new InMemoryTokenStore()
  const resolveIdentity = (token?: string, name?: string) => tokens.resolveIdentity(token, name)

  // Single runtime per table id across all connections
  const tables: Map<TableId, ReturnType<typeof createServerRuntimeTable>> = new Map()
  // Store state machine adapters separately
  const stateMachineAdapters: Map<TableId, StateMachineAdapter> = new Map()
  // Self-hosted Convex HTTP routes require /http prefix
  const convex = new ConvexPublisher({ 
    baseUrl: cfg.convexIngestUrl + '/http', 
    secret: cfg.convexIngestSecret 
  })
  
  // Debug environment variables
  console.log('[DEBUG] Environment variables loaded:')
  console.log('[DEBUG] VITE_CONVEX_URL:', cfg.convexIngestUrl)
  console.log('[DEBUG] INSTANCE_SECRET:', cfg.ingestSecret ? `${cfg.ingestSecret.substring(0, 8)}...` : 'undefined')
  console.log('[DEBUG] Convex publisher enabled:', convex.enabled)
  console.log('[DEBUG] Convex base URL:', cfg.convexIngestUrl + '/http')

  function getTable(tableId: TableId) {
    let t = tables.get(tableId)
    if (!t) {
      // Create state machine adapter for this table
      const stateMachineAdapter = new StateMachineAdapter(convex, tableId)
      stateMachineAdapters.set(tableId, stateMachineAdapter)
      
      t = createServerRuntimeTable(io, tableId, { 
        onSummaryChange: (s) => io.emit('table_update', s), 
        publisher: convex.enabled ? {
          handStarted: (p) => {
            // Set current hand for state machine tracking
            stateMachineAdapter.setCurrentHand(p.handId)
            return convex.handStarted(p)
          },
          action: (p) => {
            // Capture action processing for state machine
            stateMachineAdapter.captureActionProcessed(p.type, p.seatIndex, { 
              street: p.street, 
              amount: p.amount,
              playerToken: p.playerToken 
            })
            return convex.action(p as any)
          },
          seat: (p) => {
            // Capture seat state change
            stateMachineAdapter.captureSeatStateChange(p.seatIndex, 'seated', { 
              playerToken: p.playerToken, 
              playerName: p.playerName 
            })
            return convex.seat?.({ ...p, tableId }) ?? Promise.resolve()
          },
          unseat: (p) => {
            // Capture seat state change
            stateMachineAdapter.captureSeatStateChange(p.seatIndex, 'unseated', { 
              playerToken: p.playerToken 
            })
            return convex.unseat?.({ ...p, tableId }) ?? Promise.resolve()
          },
          handEnded: (p: any) => {
            // Capture final game state
            stateMachineAdapter.captureGameEvent('hand_ended', { 
              board: p.board, 
              results: p.results 
            })
            return (convex as any).handEnded?.(p) ?? Promise.resolve()
          },
        } : undefined,
        stateMachineAdapter: convex.enabled ? stateMachineAdapter : undefined
      })
      tables.set(tableId, t)
    }
    return t
  }

  function listTableSummaries() {
    return Array.from(tables.values()).map((t) => t.getSummary())
  }
  registerSocketHandlers(app, io, { getTable, listSummaries: listTableSummaries }, resolveIdentity)

  async function start() {
    try {
      await app.listen({ host: cfg.host, port: cfg.port })
      app.log.info({ host: cfg.host, port: cfg.port, origins: cfg.allowedOrigins }, 'server started')
    } catch (err) {
      app.log.error({ err }, 'failed to start server')
      process.exit(1)
    }
  }

  return { app, io, start }
}

buildServer().then(({ start }) => start())

