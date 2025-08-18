### System Overview

This project delivers a casino game application with a poker UI backed by an authoritative realtime server, plus high-speed simulation capabilities for both poker and blackjack. The frontend currently renders poker tables and user interactions; the backend enforces game rules and streams state over WebSockets. Blackjack is implemented as a backend simulation engine only and does not yet have a UI.

---

## Components

- Frontend (`vite-app/`)
  - React + Vite SPA.
  - Renders poker tables and captures user actions (deal, bet, fold).
  - High-speed simulation runner available as a hook; UI integration pending.
  - Connects to the backend via Socket.IO using `VITE_WS_URL` (ws/wss).

- Backend (`apps/game-server/`)
  - Node.js (Fastify HTTP + Socket.IO for realtime).
  - **Authoritative Game Server**: Single source of truth for multiplayer poker games.
  - **Real-time Protocol**: WebSocket-based communication with Zod validation.
  - **Table Management**: Dynamic table creation and multi-table support.
  - **State Enforcement**: Enforces game rules and validates all player actions.
  - **CPU Integration**: Seamless AI player integration for single-player games.
  - Hosts table instances and applies validated actions to the engine.
  - Broadcasts authoritative table state to connected clients.

- Shared packages (`packages/`)
  - `packages/shared`: Shared types and message contracts (Zod-ready).
  - `packages/poker-engine`: Extracted engine with deterministic state transitions.

---

## Game Types

### Poker
- Texas Hold'em with configurable rules
- Real-time multiplayer gameplay via game-server
- Hand evaluation and equity calculations
- Game history and replay functionality
- Layout editor for custom table configurations
- CPU players for single-player games

### Blackjack
- Standard blackjack rules with configurable house rules (backend engine)
- Multi-deck shoe management (backend engine)
- Basic strategy implementation (backend engine)
- High-speed Monte Carlo simulations (backend engine)
- Bankroll tracking and analysis (backend engine)
- **Note**: Backend-only at this time (no UI or multiplayer server support)

---

## Simulation Features

The application includes a high-performance simulation runner:

- **Backend Engine**: Pure function simulation engine for maximum performance
- **Web Worker Support**: Background processing capabilities
- **Monte Carlo Analysis**: High-volume statistical simulations
- **Status**: Engine implemented; UI to control and visualize simulations is pending

**Note**: While the simulation engine exists and is fully functional, users cannot currently control or run simulations through the interface.

### Simulation Use Cases

- **Strategy Analysis**: Test different playing strategies
- **Rule Impact**: Analyze house rule effects on player advantage
- **Bankroll Management**: Study long-term bankroll behavior
- **Performance Testing**: Benchmark game engine performance

---

## Architecture Flow

### Multiplayer Poker (via Game Server)
1. Client connects to game-server via WebSocket
2. Client joins table and takes a seat
3. Game server manages authoritative state
4. All actions validated and processed server-side
5. State updates broadcast to all connected clients
6. Real-time synchronization maintained

### Single-player & Simulations
1. Local game logic execution
2. Web Worker-based simulations
3. No server communication required
4. Maximum performance for analysis

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

- `vite-app/` — React SPA (UI + simulations)
- `apps/game-server/` — Fastify + Socket.IO (authoritative multiplayer server)
- `packages/shared/` — shared types/contracts
- `packages/poker-engine/` — engine logic used by server
- `docs/` — guides (usage, hosting, sequences)

---

## References

- Usage and hosting: `docs/poker-realtime-usage.md`
- Getting started: `docs/getting-started.md`
- Architecture: `docs/architecture.md`
- Server quick start: `apps/game-server/README.md`


