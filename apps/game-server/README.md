## Game Server (Fastify + Socket.IO)

### Quick start

```bash
cp .env.example .env
npm install
npm run dev
# http://148.230.118.4:8080/healthz
```

### Environment

- The server preloads env via a local loader (`load-env.cjs`) using `NODE_OPTIONS=--require ./load-env.cjs`. It reads env from (low -> high precedence):
  1. root `.env`
  2. root `.env.local`
  3. `apps/game-server/.env`
  4. `apps/game-server/.env.local`
  1. `apps/game-server/.env.local`
  2. `apps/game-server/.env`
  3. Monorepo root `.env.local`
  4. Monorepo root `.env`
  (existing `process.env` values take precedence)

Backend variables:
- `HOST` default `127.0.0.1` (keep localhost on the Pi; use `0.0.0.0` only when needed)
- `PORT` default `8080`
- `FRONTEND_ORIGINS` comma-separated list for CORS and WS (e.g., GitHub Pages and custom domain)
- `CONVEX_INGEST_SECRET`, `INSTANCE_SECRET` should be stored in `.env.local` (git-ignored)

Frontend-only variables:
- `VITE_*` variables are for the browser and should live in root or `vite-app/.env`; they are not required here.

### Socket.IO testing

Connect locally via `ws://148.230.118.4:8080/socket.io` (dev). In production or behind TLS/tunnels use `wss://<host>/socket.io`. Listen for `ready` and emit `echo` to test round‑trip.



