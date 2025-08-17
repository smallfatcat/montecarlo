import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { C2S, S2C } from './protocol.js';
import { createServerRuntimeTable } from './tables/serverRuntimeTable.js';
import crypto from 'crypto';
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
    // Identity management (simple in-memory token store)
    const tokenToName = new Map();
    function issueToken(name) {
        const token = crypto.randomBytes(16).toString('hex');
        tokenToName.set(token, name ?? null);
        return token;
    }
    function resolveIdentity(token, name) {
        if (token && tokenToName.has(token)) {
            if (name && !tokenToName.get(token))
                tokenToName.set(token, name);
            return { token, name: tokenToName.get(token) ?? null };
        }
        const t = issueToken(name);
        return { token: t, name: tokenToName.get(t) ?? null };
    }
    // Single runtime per table id across all connections
    const tables = new Map();
    function getTable(tableId) {
        let t = tables.get(tableId);
        if (!t) {
            t = createServerRuntimeTable(io, tableId, { onSummaryChange: (s) => io.emit('table_update', s) });
            tables.set(tableId, t);
        }
        return t;
    }
    function listTableSummaries() {
        return Array.from(tables.values()).map((t) => t.getSummary());
    }
    io.on('connection', (socket) => {
        const origin = socket.request?.headers?.origin || 'unknown';
        app.log.info({ id: socket.id, origin }, 'socket connected');
        socket.emit('ready', S2C.ready.parse({ serverTime: Date.now() }));
        // Ensure default table exists
        getTable('table-1');
        // Identity handshake
        socket.on('identify', (payload, ack) => {
            const p = C2S.identify.safeParse(payload);
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid identify' }));
            const id = resolveIdentity(p.data.token, p.data.name);
            try {
                socket.data = socket.data || {};
                socket.data.playerId = id.token;
            }
            catch { }
            ack?.(S2C.identity.parse(id));
        });
        // Lobby mechanics
        socket.on('joinLobby', (_payload, ack) => {
            const p = C2S.joinLobby.safeParse({});
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid lobby' }));
            socket.join('lobby');
            const list = listTableSummaries();
            ack?.(S2C.tableList.parse({ tables: list }));
        });
        socket.on('listTables', (_payload, ack) => {
            const p = C2S.listTables.safeParse({});
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid list' }));
            const list = listTableSummaries();
            ack?.(S2C.tableList.parse({ tables: list }));
        });
        socket.on('createTable', (payload, ack) => {
            const p = C2S.createTable.safeParse(payload);
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid createTable' }));
            const id = (p.data.tableId && p.data.tableId.length > 0) ? p.data.tableId : `table-${Math.floor(Math.random() * 10000)}`;
            if (!tables.has(id)) {
                const t = createServerRuntimeTable(io, id, { seats: p.data.seats ?? 6, startingStack: p.data.startingStack ?? 5000, onSummaryChange: (s) => io.emit('table_update', s) });
                tables.set(id, t);
            }
            const list = listTableSummaries();
            io.to('lobby').emit('table_update', list.find((x) => x.tableId === id));
            ack?.(S2C.tableList.parse({ tables: list }));
        });
        socket.on('join', (payload, ack) => {
            const p = C2S.joinTable.safeParse(payload);
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid join' }));
            const t = getTable(p.data.tableId);
            t.addClient(socket);
            // include only state snapshot; autoplay is client-owned UI now
            ack?.({ ok: true, state: t.getState() });
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
            const pid = socket.data?.playerId || socket.id;
            const result = t.actFromId(pid, p.data.action);
            if (!result.ok)
                return ack?.(S2C.error.parse({ message: result.error }));
            ack?.({ ok: true, state: t.getState() });
        });
        socket.on('sit', (payload, ack) => {
            const p = C2S.sit.safeParse(payload);
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid sit' }));
            const t = getTable(p.data.tableId);
            const pid = socket.data?.playerId || socket.id;
            const result = t.sitId(pid, p.data.seatIndex, p.data.name);
            if (!result.ok)
                return ack?.(S2C.error.parse({ message: result.error }));
            ack?.({ ok: true, state: t.getState() });
        });
        socket.on('leave', (payload, ack) => {
            const p = C2S.leave.safeParse(payload);
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid leave' }));
            const t = getTable(p.data.tableId);
            const pid = socket.data?.playerId || socket.id;
            const result = t.leaveId(pid);
            if (!result.ok)
                return ack?.(S2C.error.parse({ message: result.error }));
            ack?.({ ok: true, state: t.getState() });
        });
        socket.on('setAuto', (payload, ack) => {
            const p = C2S.setAuto.safeParse(payload);
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid setAuto' }));
            const t = getTable(p.data.tableId);
            const pid = socket.data?.playerId || socket.id;
            // Use the new per-client per-seat autoplay system
            t.setClientSeatAuto(pid, p.data.seatIndex, p.data.auto);
            // echo back state and current autoplay value for the specific seat
            ack?.({ ok: true, state: t.getState(), auto: t.getClientSeatAuto(pid, p.data.seatIndex) });
        });
        socket.on('reset', (payload, ack) => {
            const p = C2S.resetTable.safeParse(payload);
            if (!p.success)
                return ack?.(S2C.error.parse({ message: 'invalid reset' }));
            const t = getTable(p.data.tableId);
            t.reset();
            ack?.({ ok: true, state: t.getState() });
        });
        socket.on('echo', (payload, ack) => {
            socket.emit('echo', payload);
            if (ack)
                ack({ ok: true, echoedAt: Date.now() });
        });
        socket.on('disconnect', (reason) => {
            app.log.info({ id: socket.id, reason }, 'socket disconnected');
            const pid = socket.data?.playerId || socket.id;
            for (const t of tables.values()) {
                try {
                    t.removeClient(socket);
                }
                catch { }
                try {
                    t.handleDisconnect(pid);
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
