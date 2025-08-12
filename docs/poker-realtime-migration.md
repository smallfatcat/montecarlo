### Project: Split frontend and backend for Poker (Option 1 Node/TypeScript)

This document tracks the work to migrate the current single-app poker implementation into a user-facing frontend and an authoritative backend game server using WebSockets.

---

### Objectives
- Establish an authoritative game server to prevent client-side tampering.
- Keep the React UI responsive by streaming table state over WebSockets.
- Reuse as much existing TypeScript game logic as practical.
- Support reconnection, hand history, and spectators; enable future horizontal scaling.

### Scope
- In scope: WebSocket protocol, Node.js game server, shared types, extracting `PokerRuntime` server-side, UI client adapter, basic persistence for hand history, observability.
- Out of scope (initially): Payments/real-money ledger, full authentication system, anti-collusion, advanced matchmaking, cross-game platform.

### Architecture (target)
- Frontend: Vite + React (existing `vite-app`), renders state, sends user actions.
- Backend: Node.js + Fastify (HTTP) + Socket.IO (WS). Authoritative game engine per table.
- Shared library: `packages/shared` for message schemas, domain types, utilities.
- Poker engine: `packages/poker-engine` hosting extracted `PokerRuntime` and helpers.
- Data stores: PostgreSQL (players, tables, hands, history), Redis (pub/sub, presence, rate limits, Socket.IO adapter).
- Deployment: Docker Compose for dev; containerized services for prod with TLS termination.

### Monorepo structure (proposed)
- `vite-app/` (existing frontend)
- `apps/game-server/` (new Fastify + Socket.IO server)
- `packages/shared/` (new: message contracts, Zod schemas, small utilities)
- `packages/poker-engine/` (new: server-side engine extracted from `vite-app/src/poker/runtime/PokerRuntime.ts` and related)
- `docs/` (this document, plus sequence and protocol docs)

Notes:
- We will keep `vite-app` path stable initially and introduce `apps/game-server` and `packages/*` alongside it to avoid disruption.

### WebSocket protocol (initial)
- Envelope fields:
  - `type`: string (e.g., `join_table`, `action`, `state`, `ack`, `error`)
  - `reqId?`: client-generated id for request/ack correlation
  - `seq?`: server sequence number on state/delta events
  - `ts`: server timestamp (ms)
  - `payload`: event-specific data
- Core client→server events: `join_table`, `leave_table`, `action`, `resume_session`, `ping`
- Core server→client events: `state` (full or delta), `ack`, `error`, `pong`, `hand_history`
- Reliability:
  - Server emits monotonically increasing `seq` on `state` messages; client applies only if `seq` is newer.
  - Optional `ack` to confirm processing of user input; client retries idempotently with same `reqId` if needed.
  - Heartbeats via ping/pong; resume using `lastSeq` after reconnect.

Example shared TypeScript types:
```ts
export type ClientEvent =
  | { type: 'join_table'; reqId: string; payload: { tableId: string; token?: string } }
  | { type: 'leave_table'; reqId: string; payload: { tableId: string } }
  | { type: 'action'; reqId: string; payload: { tableId: string; move: 'fold'|'call'|'raise'; amount?: number } }
  | { type: 'resume_session'; reqId: string; payload: { tableId: string; lastSeq?: number } }
  | { type: 'ping'; ts: number };

export type ServerEvent =
  | { type: 'state'; seq: number; ts: number; payload: PokerTableState }
  | { type: 'ack'; reqId: string; ts: number }
  | { type: 'error'; ts: number; payload: { code: string; message: string } }
  | { type: 'pong'; ts: number }
  | { type: 'hand_history'; ts: number; payload: HandHistory };
```

### Phased plan and checklists

#### Phase 0 — Repo setup and DX
- [ ] Add Yarn/NPM workspace or PNPM to support `apps/*` and `packages/*`.
- [ ] Create `packages/shared` and set up TypeScript project references.
- [ ] CI: type-check and lint for all packages; formatters unified.
- [ ] Dev scripts: `dev:server`, `dev:client`, `dev:all` with concurrent watch.

#### Phase 1 — Extract shared types
- [ ] Identify existing poker domain types in `vite-app/src/poker/**` used by UI and engine.
- [ ] Move domain-safe, UI-agnostic types to `packages/shared`.
- [ ] Add Zod schemas mirroring types for runtime validation at the server boundary.
- [ ] Frontend imports types from `packages/shared` without behavior changes.

#### Phase 2 — Extract server-side engine
- [ ] Create `packages/poker-engine` and move `PokerRuntime` from `vite-app/src/poker/runtime/PokerRuntime.ts`.
- [ ] Refactor engine to be headless (no direct UI timers/animation hooks).
- [ ] Introduce explicit API: `createTable`, `applyAction`, `getState`, `subscribe(listener)`.
- [ ] Ensure deterministic RNG; seed per hand; surface seed in hand history.

#### Phase 3 — Game server (Fastify + Socket.IO)
- [ ] Scaffold `apps/game-server` with Fastify HTTP and Socket.IO.
- [ ] Implement auth stub: accept optional token; map to `playerId`.
- [ ] Table registry: create/get table instance; seat management.
- [ ] WS handlers: `join_table`, `leave_table`, `action`, `resume_session`, `ping`.
- [ ] Broadcast `state` with `seq` to room `table:{tableId}`; implement `ack`.
- [ ] Validation: Zod parse on all inbound/outbound messages.

#### Phase 4 — Frontend WS client adapter
- [ ] Add WS client with reconnect/backoff; map to the message protocol.
- [ ] Replace local runtime usage with server-driven state in `vite-app` (feature-flagged).
- [ ] Preserve current `#poker-history` using server-provided history.
- [ ] UI: handle pending actions, acks, and error toasts.

#### Phase 5 — Persistence and history
- [ ] PostgreSQL schema for players, tables, hands, and events.
- [ ] Append-only event log per hand; finalize hand to history table.
- [ ] HTTP endpoints: fetch hand history and table summaries.
- [ ] Data retention and IDs suitable for deep-linking replays.

#### Phase 6 — Observability and SLOs
- [ ] Structured JSON logs with request IDs and table IDs.
- [ ] Metrics: p95 WS latency, active connections, actions/min, engine step timings.
- [ ] Health checks and readiness endpoints.

#### Phase 7 — Scale-out
- [ ] Introduce Redis and Socket.IO Redis adapter.
- [ ] Sticky sessions or consistent hashing by `tableId` at load balancer.
- [ ] Backpressure policies (max tables per instance, CPU/mem guards).

#### Phase 8 — QA and load testing
- [ ] Artillery/k6 scenarios (join, play a hand, reconnect).
- [ ] Fuzz invalid actions and protocol violations; validate server robustness.
- [ ] Chaos: kill a server while a hand is active; verify recovery.

#### Phase 9 — Launch
- [ ] Feature flag default to WS-backed mode.
- [ ] Rollout plan, monitoring dashboards, and rollback procedure.

### Technical decisions (current)
- WS library: Socket.IO (rooms, acks, reconnection; Redis adapter available). Status: decided.
- HTTP framework: Fastify. Status: decided.
- Validation: Zod schemas in `packages/shared`. Status: decided.
- Serialization: JSON initially; reserve option for Protobuf later. Status: decided.
- Persistence: PostgreSQL + Prisma (or Knex). Status: pending selection.
- Cache/broker: Redis. Status: decided.

### Hosting notes (GitHub Pages)
- GitHub Pages is static-only. It cannot host a Node.js/Fastify/Socket.IO backend or accept WebSocket upgrades. The backend must live elsewhere.
- Recommended pairing:
  - Frontend: GitHub Pages (static SPA built by Vite).
  - Backend: Cloudflare Workers + Durable Objects (supports WebSockets, free tier), Fly.io, Render, or Railway.
  - Use a custom domain for a single-origin experience: `app.example.com` → GH Pages, `ws.example.com` → backend. Configure CORS/Socket.IO to allow the frontend origin.
- Not supported/workarounds that won’t work:
  - Hosting the WebSocket server on GH Pages (no server runtime).
  - Proxying WebSockets via a Service Worker from GH Pages (no WS upgrade support).
- Static-only alternative (not recommended for fairness/availability): Peer-hosted engine via WebRTC DataChannels with one browser acting as the authoritative host. Requires third-party signaling and TURN; host tab leaving ends the game.

### Risks and mitigations
- Engine/UI coupling causes extraction delays → Create clear server-engine API; remove UI-specific timers from engine.
- Message drift between client/server → Single source of truth schemas in `packages/shared` with CI checks.
- Reconnection edge cases → Use `seq` and `lastSeq`; comprehensive reconnection tests.
- Performance regressions under load → Bench per-table CPU; cap tables/instance; add metrics early.

### Acceptance criteria
- Frontend renders live table state from server for standard flows (post blinds → river → showdown) as specified in `docs/poker-hand-sequence.md`.
- All client actions route through WS to server; server validates and updates state; acks returned.
- Reconnect within 30s restores session and state using `lastSeq`.
- Hand histories can be fetched and replayed in the UI.
- Basic load test: 200 concurrent clients across 20 tables, p95 state push < 100ms in single-node dev.

### References
- Existing sequence: `docs/poker-hand-sequence.md`
- Current engine location: `vite-app/src/poker/runtime/PokerRuntime.ts`

### Open questions
- Authentication: JWT vs. ephemeral signed tokens; spectator access rules?
- Table lifecycle: who can create/close tables; max seats; private vs public.
- Action timeouts: server-enforced timers and penalties; grace periods.
- Persistence depth for MVP: events only vs. full normalized schema.

### Next actions (immediate)
- Approve this plan.
- Initialize workspaces and create `packages/shared` skeleton with protocol types and Zod schemas.
- Scaffold `apps/game-server` with Fastify + Socket.IO and a health endpoint.


