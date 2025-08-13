### Poker realtime: local Pi and Cloudflare usage

This document explains how to run the Node.js backend on a Raspberry Pi and connect the React frontend to it, first over the LAN, then via Cloudflare Tunnel.

---

## 1) Prerequisites
- Raspberry Pi (64‑bit OS). Recommended: Raspberry Pi OS Lite (Bookworm) or Ubuntu Server 24.04 (arm64).
- Node.js 20 on the Pi:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
node -v && npm -v
```
- Repo cloned on the Pi:
```bash
git clone https://github.com/<you>/montecarlo.git
cd montecarlo
```

---

## 2) Build shared packages (first time or when they change)
The server depends on two local packages. Build them once (rebuild after you change these packages):
```bash
# Shared protocol
cd packages/shared
npm install
npm run build

# Poker engine
cd ../poker-engine
npm install
npm run build
```

---

## 3) Start the backend (LAN mode)
Configure environment and start the Socket.IO server on all interfaces so your PC browser can reach it.
```bash
cd /home/pi/montecarlo/apps/game-server
npm install

# Create .env
cat > .env << 'ENV'
HOST=0.0.0.0
PORT=8080
# Frontend origins you will use. Add/remove as needed.
FRONTEND_ORIGINS=http://192.168.1.107:5173,https://smallfatcat.github.io,https://smallfatcat.github.io/montecarlo/
ENV

npm run dev
```
You should see logs like:
```
Server listening at http://0.0.0.0:8080
```

Notes:
- For initial debugging you can set `ALLOW_ALL_ORIGINS=1` in `.env`, then remove it once working and keep only explicit `FRONTEND_ORIGINS`.

---

## 4) Start the frontend (LAN mode)
Point the browser client at the Pi backend and bind Vite to all interfaces:
```bash
cd /home/pi/montecarlo/vite-app
npm install

# Create .env.local
echo "VITE_WS_URL=ws://192.168.1.107:8080" > .env.local

# Start dev server bound to LAN
npm run dev -- --host 0.0.0.0
```
Open from your PC browser:
```
http://192.168.1.107:5173/montecarlo/
```

Expected:
- Backend logs: `socket connected` with origin `http://192.168.1.107:5173`, then `[server-runtime] join`.
- Clicking Deal in the UI streams server events: `hand_start`, `post_blind`, `hand_setup`, `action`, `state`.

If the browser console shows a brief “closed before connection established” on first mount, that is React dev Strict Mode re‑mounting effects. The socket reconnects immediately after.

---

## 5) Optional: run backend as a systemd service
Create `/etc/systemd/system/poker-server.service`:
```
[Unit]
Description=Poker Game Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/montecarlo/apps/game-server
EnvironmentFile=/home/pi/montecarlo/apps/game-server/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
Build and start:
```bash
cd /home/pi/montecarlo/apps/game-server
npm run build
sudo systemctl daemon-reload
sudo systemctl enable --now poker-server
systemctl status poker-server | cat
```

---

## 6) Cloudflare Tunnel (optional)
Use Cloudflare when you want WAN access with TLS (no router port forwarding needed). Summary:
1) Install cloudflared on the Pi (see `docs/hosting-pi-and-windows-cloudflare-tunnel.md`).
2) Create a tunnel and DNS `ws.yourdomain.com`.
3) Bind backend to `127.0.0.1:8080` in `.env` and set tunnel ingress to `http://localhost:8080`.
4) In the frontend, set `VITE_WS_URL=wss://ws.yourdomain.com` and deploy/build.

Full step‑by‑step: see `docs/hosting-pi-and-windows-cloudflare-tunnel.md`.

---

## 7) Troubleshooting
- No connection from browser:
  - Ensure backend binds `0.0.0.0` (LAN) or `127.0.0.1` (tunnel) and that `VITE_WS_URL` points to a reachable URL for your browser.
  - Add your frontend origin to `FRONTEND_ORIGINS` or set `ALLOW_ALL_ORIGINS=1` temporarily.
  - Remove `transports: ['websocket']` in the client to allow fallback polling, if needed.
- “Closed before connection established” once at startup:
  - React dev Strict Mode re‑mount; harmless if it reconnects.
- Actions do nothing:
  - Only the first connected client is assigned seat 0 and allowed to act. Others are spectators.
- Package edits not reflected:
  - If you modify `packages/shared` or `packages/poker-engine`, rebuild them (`npm run build`) before restarting the server.


