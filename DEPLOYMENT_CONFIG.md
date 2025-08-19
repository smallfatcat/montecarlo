# Deployment Configuration for Montecarlo

## Convex Server Configuration

The frontend has been configured to use the production Convex server at `https://convex.smallfatcat-dev.org` for deployed versions.

## Configuration Files Updated

### 1. `convex.json`
- **prodUrl**: Updated from `http://127.0.0.1:3210` to `https://convex.smallfatcat-dev.org`

### 2. `package.json` (root)
- Added `build:frontend:prod` script for production builds
- Added `deploy:config` script for deployment setup

### 3. `vite-app/package.json`
- Added `build:prod` script for production builds

### 4. `scripts/deploy-config.sh`
- New deployment configuration script
- Sets environment variables and builds for production

## Usage

### For Development (Local Convex)
```bash
npm run dev:frontend
# Uses: VITE_CONVEX_URL=http://127.0.0.1:3210
```

### For Production Builds
```bash
# Option 1: Use the deployment script
npm run deploy:config

# Option 2: Build directly
npm run build:frontend:prod

# Option 3: Build from vite-app directory
cd vite-app && npm run build:prod
```

### For GitHub Pages Deployment
```bash
# Option 1: Deploy directly (recommended)
npm run deploy:gh-pages

# Option 2: Build and deploy manually
cd vite-app
npm run build:prod
npm run deploy

# Option 3: Use the interactive deployment script
npm run deploy:config
# (This will ask if you want to deploy to GitHub Pages)
```

**Note**: The `predeploy` script automatically sets the correct Convex URL for GitHub Pages deployment.

## Environment Variables

- **Development**: `VITE_CONVEX_URL=http://127.0.0.1:3210`
- **Production**: `VITE_CONVEX_URL=https://convex.smallfatcat-dev.org`

## Cloudflare Tunnel Configuration

Make sure your `config.yml` includes the Convex endpoint:

```yaml
tunnel: poker
credentials-file: /home/smallfatcat/.cloudflared/b11fd3a8-4543-4ac9-919d-5b00b9e152c7.json
ingress:
  - hostname: ws.smallfatcat-dev.org
    service: http://127.0.0.1:8080
    originRequest:
      httpHostHeader: localhost
  - hostname: convex.smallfatcat-dev.org
    service: http://127.0.0.1:3210
    originRequest:
      httpHostHeader: localhost
  - service: http_status:404
```

## Notes

- The frontend will automatically use the correct Convex URL based on the build environment
- Development builds use localhost, production builds use the tunneled domain
- Make sure your Convex self-hosted instance is running and accessible via the tunnel
- The `ADMIN_KEY.txt` file contains the admin key for your Convex instance
