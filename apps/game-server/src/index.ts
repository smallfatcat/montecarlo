import 'dotenv/config'
import fastify from 'fastify'
import cors from '@fastify/cors'
import { Server as SocketIOServer } from 'socket.io'
import { C2S, S2C } from './protocol'
import { createInMemoryTable } from './tables/inMemoryTable'
import { createServerRuntimeTable } from './tables/serverRuntimeTable'

function parseAllowedOrigins(): string[] {
  const raw = process.env.FRONTEND_ORIGINS || ''
  const items = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  // Provide sane defaults for initial testing if none supplied
  if (items.length > 0) return items
  return [
    // Local dev (Vite)
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:13799',
    'http://127.0.0.1:13799',
    // GitHub Pages / prod samples
    'https://smallfatcat.github.io',
    'https://smallfatcat.github.io/montecarlo/',
    'https://app.yourdomain.com',
  ]
}

const HOST = process.env.HOST || '127.0.0.1'
const PORT = Number(process.env.PORT || 8080)
const allowedOrigins = parseAllowedOrigins()
const ALLOW_ALL_ORIGINS = process.env.ALLOW_ALL_ORIGINS === '1'

async function buildServer() {
  const app = fastify({ logger: true })

  await app.register(cors as any, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      if (ALLOW_ALL_ORIGINS) { cb(null, true); return }
      if (!origin) {
        // Allow same-origin/no-origin (curl, health checks)
        cb(null, true)
        return
      }
      const isAllowed = allowedOrigins.includes(origin)
      cb(null, isAllowed)
    },
    methods: ['GET', 'POST']
  })

  app.get('/healthz', async () => ({ ok: true }))
  app.get('/readyz', async () => ({ ready: true }))

  const io = new SocketIOServer(app.server, {
    cors: {
      origin: ALLOW_ALL_ORIGINS ? true : allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: false
    },
    path: '/socket.io'
  })

  io.on('connection', (socket) => {
    const origin = (socket.request?.headers?.origin as string | undefined) || 'unknown'
    app.log.info({ id: socket.id, origin }, 'socket connected')
    socket.emit('ready', S2C.ready.parse({ serverTime: Date.now() }))

    // Use runtime-backed table for real-time migration testing
    const table = createServerRuntimeTable(io, 'table-1')

    socket.on('join', (payload: unknown, ack?: (resp: unknown) => void) => {
      const p = C2S.joinTable.safeParse(payload)
      if (!p.success) return ack?.(S2C.error.parse({ message: 'invalid join' }))
      table.addClient(socket)
      ack?.({ ok: true, state: table.getState() })
    })

    socket.on('begin', (payload: unknown, ack?: (resp: unknown) => void) => {
      const p = C2S.beginHand.safeParse(payload)
      if (!p.success) return ack?.(S2C.error.parse({ message: 'invalid begin' }))
      table.beginHand()
      ack?.({ ok: true, state: table.getState() })
    })

    socket.on('act', (payload: unknown, ack?: (resp: unknown) => void) => {
      const p = C2S.act.safeParse(payload)
      if (!p.success) return ack?.(S2C.error.parse({ message: 'invalid action' }))
      const result = table.actFrom(socket, p.data.action)
      if (!result.ok) return ack?.(S2C.error.parse({ message: result.error }))
      ack?.({ ok: true, state: table.getState() })
    })

    socket.on('setAuto', (payload: unknown, ack?: (resp: unknown) => void) => {
      const p = C2S.setAuto.safeParse(payload)
      if (!p.success) return ack?.(S2C.error.parse({ message: 'invalid setAuto' }))
      table.setAuto(p.data.auto)
      ack?.({ ok: true, state: table.getState() })
    })

    socket.on('echo', (payload: unknown, ack?: (resp: unknown) => void) => {
      socket.emit('echo', payload)
      if (ack) ack({ ok: true, echoedAt: Date.now() })
    })

    socket.on('disconnect', (reason) => {
      app.log.info({ id: socket.id, reason }, 'socket disconnected')
      table.removeClient(socket)
    })
  })

  async function start() {
    try {
      await app.listen({ host: HOST, port: PORT })
      app.log.info({ host: HOST, port: PORT, origins: allowedOrigins }, 'server started')
    } catch (err) {
      app.log.error({ err }, 'failed to start server')
      process.exit(1)
    }
  }

  return { app, io, start }
}

buildServer().then(({ start }) => start())

