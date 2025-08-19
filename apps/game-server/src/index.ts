import 'dotenv/config'
import { loadServerConfig } from './config/env.js'
import { createHttpServer } from './server/http.js'
import { createSocketServer } from './server/socket.js'
import { registerSocketHandlers } from './sockets/handlers.js'
import { ConvexPublisher } from './ingest/convexPublisher.js'
import type { TableId } from './tables/serverRuntimeTable.js'
import { createServerRuntimeTable } from './tables/serverRuntimeTable.js'
import { InMemoryTokenStore } from './identity/tokenStore.js'

async function buildServer() {
  const cfg = loadServerConfig()
  const app = createHttpServer(cfg)
  const io = createSocketServer(app, cfg)

  // Identity management (simple in-memory token store)
  const tokens = new InMemoryTokenStore()
  const resolveIdentity = (token?: string, name?: string) => tokens.resolveIdentity(token, name)

  // Single runtime per table id across all connections
  const tables: Map<TableId, ReturnType<typeof createServerRuntimeTable>> = new Map()
  // Include /http prefix for self-hosted Convex HTTP routes
  const convex = new ConvexPublisher({ baseUrl: (process.env.CONVEX_INGEST_URL || '').replace(/\/$/, '') + '/http', secret: process.env.INGEST_SECRET })

  function getTable(tableId: TableId) {
    let t = tables.get(tableId)
    if (!t) {
      t = createServerRuntimeTable(io, tableId, { onSummaryChange: (s) => io.emit('table_update', s), publisher: convex.enabled ? {
        handStarted: (p) => convex.handStarted(p),
        action: (p) => convex.action(p as any),
        seat: (p) => convex.seat?.(p) ?? Promise.resolve(),
        unseat: (p) => convex.unseat?.(p) ?? Promise.resolve(),
        handEnded: (p: any) => (convex as any).handEnded?.(p) ?? Promise.resolve(),
      } : undefined })
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

