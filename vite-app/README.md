## Vite App (React + Vite)

### Quick start

```bash
cp .env.example .env # if you need a template
npm install
npm run dev
```

### Environment

- Vite exposes only variables prefixed with `VITE_` to the client.
- Files auto-loaded by Vite (in `vite-app/`): `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`.
- Shared values (like `VITE_CONVEX_URL`) can live in the monorepo root `.env`; package-level `.env` entries override root.

Required vars:
- `VITE_WS_URL`: WebSocket endpoint (ws:// for local, wss:// for prod)
- `VITE_CONVEX_URL`: Convex HTTP endpoint

Notes:
- Backend-only variables (non-`VITE_`) are not available to the browser and should not be defined here.
