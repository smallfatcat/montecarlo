## Game Server (Fastify + Socket.IO)

### Quick start

```bash
cp .env.example .env
npm install
npm run dev
# http://127.0.0.1:8080/healthz
```

### Environment

- `HOST` default `127.0.0.1` (keep localhost on the Pi; use `0.0.0.0` only when needed)
- `PORT` default `8080`
- `FRONTEND_ORIGINS` comma-separated list for CORS and WS (e.g., GitHub Pages and custom domain)

### Socket.IO testing

Connect a client to `ws://127.0.0.1:8080/socket.io` and listen for `ready`. Emit `echo` to test round-trip.



