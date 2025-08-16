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
FRONTEND_ORIGINS=http://192.168.1.107:5173,https://yourserver.github.io,https://yourserver.github.io/montecarlo/
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
echo "VITE_WS_URL=ws://yourserver:8080" > .env.local

# Start dev server bound to LAN
npm run dev -- --host 0.0.0.0
```
Open from your PC browser:
```
http://yourserver:5173/montecarlo/
```

Expected:
- Backend logs: `socket connected` with origin `http://yourserver:5173`, then `[server-runtime] join`.
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
Use Cloudflare when you want WAN access with TLS (no router port forwarding needed). This section includes full steps for Raspberry Pi and Windows/WSL.

### Prerequisites
- Cloudflare account and a domain in Cloudflare (for `ws.yourdomain.com`).
- Frontend hosted (e.g., GitHub Pages). Set `VITE_WS_URL` accordingly when building.

### Raspberry Pi backend (recommended)

1) Install Node.js LTS (arm64):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
node -v && npm -v
```

2) Run the game server bound to localhost (for tunnel):
```bash
cd /home/pi/montecarlo/apps/game-server
npm install

# .env (bind to localhost when tunneling)
cat > .env << 'ENV'
HOST=yourserver
PORT=8080
# Allowlist your frontend origins
FRONTEND_ORIGINS=https://yourserver.github.io,https://yourserver.github.io/montecarlo/
ENV

npm run dev
```

3) Install cloudflared on the Pi:
```bash
sudo mkdir -p /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflared.gpg | \
  sudo tee /usr/share/keyrings/cloudflared-archive-keyring.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflared-archive-keyring.gpg] https://pkg.cloudflare.com/cloudflared $(. /etc/os-release && echo $VERSION_CODENAME) main" | \
  sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared
cloudflared --version
```

4) Create the tunnel and DNS record:
```bash
cloudflared tunnel login                    # authorize in browser
cloudflared tunnel create poker             # prints Tunnel ID
cloudflared tunnel route dns poker ws.yourdomain.com
```

5) Configure the tunnel `~/.cloudflared/config.yml`:
```
tunnel: poker
credentials-file: /home/pi/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: ws.yourdomain.com
    service: http://yourserver:8080
  - service: http_status:404
```

6) Run the tunnel (foreground test):
```bash
cloudflared tunnel run poker
```

7) Run cloudflared as a service (optional):
```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
systemctl status cloudflared | cat
```

8) Optional: run the backend as a systemd service on the Pi
```ini
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
Build and enable:
```bash
cd /home/pi/montecarlo/apps/game-server
npm run build
sudo systemctl daemon-reload
sudo systemctl enable --now poker-server
systemctl status poker-server | cat
```

9) Frontend config for production:
```bash
VITE_WS_URL=wss://ws.yourdomain.com
```

### Windows/WSL backend via Cloudflare Tunnel

1) Install WSL2 (Ubuntu) and Node.js:
```powershell
wsl --install -d Ubuntu-24.04
```
In Ubuntu:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
node -v && npm -v
```

2) Run the server in WSL (bind to 0.0.0.0 so Windows/cloudflared can reach it):
```bash
git clone https://github.com/<you>/<repo>.git
cd <repo>
npm install
HOST=0.0.0.0 PORT=8080 npm run dev:server
```

3) Option A: cloudflared inside WSL
```bash
wget -O cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo apt install -y ./cloudflared.deb
cloudflared tunnel login
cloudflared tunnel create poker
cloudflared tunnel route dns poker ws.yourdomain.com
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'YAML'
tunnel: poker
credentials-file: /home/$USER/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: ws.yourdomain.com
    service: http://yourserver:8080
  - service: http_status:404
YAML
cloudflared tunnel run poker
```

4) Option B: cloudflared on Windows targeting WSL service
```powershell
cloudflared.exe tunnel login
cloudflared.exe tunnel create poker
cloudflared.exe tunnel route dns poker ws.yourdomain.com
notepad $env:USERPROFILE\.cloudflared\config.yml
```
Put in `config.yml`:
```
tunnel: poker
credentials-file: C:\Users\<you>\.cloudflared\<TUNNEL_ID>.json
ingress:
  - hostname: ws.yourdomain.com
    service: http://yourserver:8080
  - service: http_status:404
```
Run foreground:
```powershell
cloudflared.exe tunnel run poker
```

### Cloudflare Tunnel troubleshooting and tips
- Mixed content or WS blocked: ensure `wss://` and valid TLS via Cloudflare.
- 400/426 upgrade errors: `ingress` must point to `http://yourserver:8080`; WS path matches Socket.IO default `/socket.io`.
- CORS failures: backend allowlist must include your frontend origins.
- WSL reachability: use WSL2 with mirrored networking and bind the server to `0.0.0.0`.
- Security: validate messages (Zod), run backend as non-root, and prefer SSD over SD on Pi.

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

