import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { C2S, S2C } from './protocol.js';
import { createServerRuntimeTable } from './tables/serverRuntimeTable.js';
function parseAllowedOrigins() {
    const raw = process.env.FRONTEND_ORIGINS || '';
    const items = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    // Provide sane defaults for initial testing if none supplied
    if (items.length > 0)
        return items;
    return [
        // Local dev (Vite)
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:13799',
        'http://127.0.0.1:13799',
        // GitHub Pages / prod samples
        'https://smallfatcat.github.io',
        'https://smallfatcat.github.io/montecarlo/',
    ];
}
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8080);
const allowedOrigins = parseAllowedOrigins();
const ALLOW_ALL_ORIGINS = process.env.ALLOW_ALL_ORIGINS === '1';
async function buildServer() {
    const app = fastify({ logger: true });
    await app.register(cors, {
        origin: (origin, cb) => {
            if (ALLOW_ALL_ORIGINS) {
                cb(null, true);
                return;
            }
            if (!origin) {
                // Allow same-origin/no-origin (curl, health checks)
                cb(null, true);
                return;
            }
            const isAllowed = allowedOrigins.includes(origin);
            cb(null, isAllowed);
        },
        methods: ['GET', 'POST']
    });
    app.get('/healthz', async () => ({ ok: true }));
    app.get('/readyz', async () => ({ ready: true }));
    const io = new SocketIOServer(app.server, {
        cors: {
            origin: ALLOW_ALL_ORIGINS ? true : allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: false
        },
        path: '/socket.io'
    });
    // Single runtime per table id across all connections
    const tables = new Map();
    function getTable(tableId) {
        let t = tables.get(tableId);
        if (!t) {
            t = createServerRuntimeTable(io, tableId);
            tables.set(tableId, t);
        }
        return t;
    }
    io.on('connection', (socket) => {
        const origin = socket.request?.headers?.origin || 'unknown';
        app.log.info({ id: socket.id, origin }, 'socket connected');
        socket.emit('ready', S2C.ready.parse({ serverTime: Date.now() }));
        // Ensure default table exists
        const table = getTable('table-1');
        socket.on('join', (payload, ack) => {
            const p = C2S.joinTable.safeParse(payload);
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid join' }));
            const t = getTable(p.data.tableId);
            t.addClient(socket);
            // include current autoplay state alongside state snapshot
            ack?.({ ok: true, state: t.getState(), auto: t.getAuto?.() });
            // Also send current autoplay as a normal event for non-ack listeners
            try {
                socket.emit('autoplay', { auto: t.getAuto?.() });
            }
            catch { }
        });
        socket.on('begin', (payload, ack) => {
            const p = C2S.beginHand.safeParse(payload);
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid begin' }));
            const t = getTable(p.data.tableId);
            t.beginHand();
            ack?.({ ok: true, state: t.getState() });
        });
        socket.on('act', (payload, ack) => {
            const p = C2S.act.safeParse(payload);
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid action' }));
            const t = getTable(p.data.tableId);
            const result = t.actFrom(socket, p.data.action);
            if (!result.ok)
                return ack?.(S2C.error.parse({ message: result.error }));
            ack?.({ ok: true, state: t.getState() });
        });
        socket.on('sit', (payload, ack) => {
            const p = C2S.sit.safeParse(payload);
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid sit' }));
            const t = getTable(p.data.tableId);
            const result = t.sit(socket, p.data.seatIndex, p.data.name);
            if (!result.ok)
                return ack?.(S2C.error.parse({ message: result.error }));
            ack?.({ ok: true, state: t.getState() });
        });
        socket.on('leave', (payload, ack) => {
            const p = C2S.leave.safeParse(payload);
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid leave' }));
            const t = getTable(p.data.tableId);
            const result = t.leave(socket);
            if (!result.ok)
                return ack?.(S2C.error.parse({ message: result.error }));
            ack?.({ ok: true, state: t.getState() });
        });
        socket.on('setAuto', (payload, ack) => {
            const p = C2S.setAuto.safeParse(payload);
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid setAuto' }));
            const t = getTable(p.data.tableId);
            t.setAuto(p.data.auto);
            // echo back state and current autoplay value; other clients receive room broadcast from setAuto
            ack?.({ ok: true, state: t.getState(), auto: t.getAuto?.() });
        });
        socket.on('echo', (payload, ack) => {
            socket.emit('echo', payload);
            if (ack)
                ack({ ok: true, echoedAt: Date.now() });
        });
        socket.on('disconnect', (reason) => {
            app.log.info({ id: socket.id, reason }, 'socket disconnected');
            for (const t of tables.values()) {
                try {
                    t.removeClient(socket);
                }
                catch { }
            }
        });
    });
    async function start() {
        try {
            await app.listen({ host: HOST, port: PORT });
            app.log.info({ host: HOST, port: PORT, origins: allowedOrigins }, 'server started');
        }
        catch (err) {
            app.log.error({ err }, 'failed to start server');
            process.exit(1);
        }
    }
    return { app, io, start };
}
buildServer().then(({ start }) => start());
