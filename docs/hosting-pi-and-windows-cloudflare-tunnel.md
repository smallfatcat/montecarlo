### Hosting the Poker Backend via Cloudflare Tunnel (Raspberry Pi and Windows/WSL)

This guide covers running the Node.js game server locally and exposing it publicly via Cloudflare Tunnel, while the UI remains on GitHub Pages.

---

### Prerequisites
- Domain in Cloudflare (for `ws.yourdomain.com`).
- Cloudflare account (free tier is fine) with DNS managed by Cloudflare.
- GitHub Pages build configured for the frontend.

Environment variables (frontend):
```
VITE_WS_URL=wss://ws.yourdomain.com
```

Backend CORS/WS allowlist:
- Allow origins: `https://<user>.github.io` and `https://<user>.github.io/<repo>/` (plus any custom frontend domain).

Minimal Socket.IO CORS example (server-side):
```ts
import { Server } from 'socket.io'

const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://<user>.github.io',
      'https://<user>.github.io/<repo>/',
      'https://app.yourdomain.com',
    ],
    methods: ['GET', 'POST'],
    credentials: false,
  },
  path: '/socket.io',
})
```

---

## A) Raspberry Pi backend (recommended distros + tunnel)

### Choose a distro
- Recommended: Raspberry Pi OS 64-bit Lite (Debian Bookworm).
- Alternative: Ubuntu Server 24.04 LTS (arm64) for Raspberry Pi.

Tips: Prefer an external SSD for Postgres (avoid SD wear). Use headless images.

### Install Node.js LTS (arm64)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
node -v && npm -v
```

### Clone and run the game server
```bash
git clone https://github.com/<you>/<repo>.git
cd <repo>
# install deps at repo root or in the server app once scaffolded
npm install
# Start the backend (adjust path/script when server app exists)
npm run dev:server
# Or start directly: node apps/game-server/dist/index.js
```

Ensure the server binds to `127.0.0.1:8080` (or your chosen port). The tunnel will forward to this.

### Run server as a systemd service (optional)
Create `/etc/systemd/system/poker-server.service`:
```
[Unit]
Description=Poker Game Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/<repo>
ExecStart=/usr/bin/node apps/game-server/dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```
Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now poker-server
systemctl status poker-server | cat
```

### Install Cloudflare Tunnel (cloudflared)
Debian/Ubuntu (arm64):
```bash
sudo mkdir -p /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflared.gpg | \
  sudo tee /usr/share/keyrings/cloudflared-archive-keyring.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflared-archive-keyring.gpg] https://pkg.cloudflare.com/cloudflared $(. /etc/os-release && echo $VERSION_CODENAME) main" | \
  sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared
cloudflared --version
```

### Create the tunnel and DNS record
```bash
cloudflared tunnel login                    # opens a browser to authorize
cloudflared tunnel create poker             # prints Tunnel ID
cloudflared tunnel route dns poker ws.yourdomain.com
```

Create `~/.cloudflared/config.yml`:
```
tunnel: poker
credentials-file: /home/pi/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: ws.yourdomain.com
    service: http://localhost:8080
  - service: http_status:404
```

Run the tunnel (foreground test):
```bash
cloudflared tunnel run poker
```

### Run cloudflared as a service
Option 1 (helper):
```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
systemctl status cloudflared | cat
```

Option 2 (manual unit): `/etc/systemd/system/cloudflared.service`
```
[Unit]
Description=cloudflared Tunnel
After=network-online.target
Wants=network-online.target

[Service]
User=pi
ExecStart=/usr/bin/cloudflared --no-autoupdate tunnel run poker
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared
```

### Verify from the web
- Frontend built for production with `VITE_WS_URL=wss://ws.yourdomain.com`.
- Open the GH Pages site; confirm it connects and plays through a full hand.
- Test from a different network (mobile hotspot) to validate public reachability.

---

## B) Windows/WSL backend via Cloudflare Tunnel

### Install WSL2 (Ubuntu) and Node.js
```powershell
wsl --install -d Ubuntu-24.04
```
In the Ubuntu shell:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
node -v && npm -v
```

### Run the server in WSL
```bash
git clone https://github.com/<you>/<repo>.git
cd <repo>
npm install
# Ensure the server binds to 0.0.0.0:8080 so Windows/Cloudflared can reach it
HOST=0.0.0.0 PORT=8080 npm run dev:server
```

### Option 1: Run cloudflared inside WSL
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
    service: http://localhost:8080
  - service: http_status:404
YAML
cloudflared tunnel run poker
```
Note: WSL sessions end when the terminal closes; for long-running tests, keep a tmux session or configure WSL systemd and a service unit.

### Option 2: Run cloudflared on Windows, target WSL service
1) Install cloudflared for Windows (MSI) from releases.
2) In PowerShell:
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
    service: http://localhost:8080
  - service: http_status:404
```
Ensure your WSL server binds to `0.0.0.0:8080`. Thanks to WSL mirrored networking, Windows can reach it at `http://localhost:8080`.

Run (foreground):
```powershell
cloudflared.exe tunnel run poker
```

Install as a Windows service (optional):
```powershell
cloudflared.exe service install
```

### Verify
- Set `VITE_WS_URL=wss://ws.yourdomain.com` in the frontend build.
- Load the GH Pages site and confirm WS connection and gameplay.

---

## Troubleshooting
- Mixed content or WS blocked: ensure `wss://` (not `ws://`) and valid TLS via Cloudflare.
- 400/426 upgrade errors: check `ingress` service points to `http://localhost:8080` and your server’s WS path matches (Socket.IO default `/socket.io`).
- CORS failures: ensure backend `origin` allowlist includes GH Pages domains and any custom frontend domain.
- Cannot reach WSL service from Windows: bind server to `0.0.0.0` in WSL and use WSL2 with mirrored networking.
- ISP/CGNAT issues: tunnels bypass port forwarding; no router changes required.

## Security checklist
- Validate all inbound messages (Zod); rate-limit actions.
- Run backend under non-root user and keep OS updated.
- Back up DB data; prefer SSD over SD card on Raspberry Pi.
- Limit exposed services: bind backend to localhost on Pi when tunneling.

## Clean up
```bash
# Remove tunnel
cloudflared tunnel delete poker
# Remove DNS route (or delete from Cloudflare dashboard)
```


