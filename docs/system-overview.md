### System Overview

This project delivers a poker UI backed by an authoritative realtime server. The frontend renders the table and user interactions; the backend enforces game rules and streams state over WebSockets.

---

## Components

- Frontend (`vite-app/`)
  - React + Vite SPA.
  - Renders poker tables, captures user actions (deal, bet, fold).
  - Connects to the backend via Socket.IO using `VITE_WS_URL` (ws/wss).

- Backend (`apps/game-server/`)
  - Node.js (Fastify HTTP + Socket.IO for realtime).
  - Hosts table instances and applies validated actions to the engine.
  - Broadcasts authoritative table state to connected clients.

- Shared packages (`packages/`)
  - `packages/shared`: Shared types and message contracts (Zod-ready).
  - `packages/poker-engine`: Extracted engine with deterministic state transitions.

---

## How it works (happy path)

1) User opens the frontend (local dev or hosted). The app reads `VITE_WS_URL` and connects to the Socket.IO endpoint.
2) Client sends `join_table` (and later `action` events like call/raise/fold).
3) Server validates messages, updates the engine, and emits `state` events with a monotonically increasing sequence number.
4) Frontend listens to `state` and updates the UI accordingly. Optional `ack` confirms processed inputs.
5) On reconnect, the client resumes using the last known sequence to catch up.

---

## Running locally

- Backend: `apps/game-server` on `127.0.0.1:8080` (Socket.IO path `/socket.io`).
- Frontend: set `vite-app/.env.local`:
```
VITE_WS_URL=ws://127.0.0.1:8080
```

---

## Hosted/production

- Frontend: static hosting (e.g., GitHub Pages).
- Backend: hosted or tunnelled (e.g., Raspberry Pi + Cloudflare Tunnel).
- Frontend build-time env:
```
VITE_WS_URL=wss://<your-backend-host>
```

Ensure backend CORS/Socket.IO `origin` allowlist includes your frontend origin(s).

---

## Directory map

- `vite-app/` — React SPA (UI)
- `apps/game-server/` — Fastify + Socket.IO (authoritative server)
- `packages/shared/` — shared types/contracts
- `packages/poker-engine/` — engine logic used by server
- `docs/` — guides (usage, hosting, sequences)

---

## References

- Usage and hosting: `docs/poker-realtime-usage.md`
- Server quick start: `apps/game-server/README.md`
- Poker sequence: `docs/poker-hand-sequence.md`


