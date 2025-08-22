# Environment Variables: Current State and Standardization Plan

## Current Inventory (as of today)

- Root `.env`
  - NODE_ENV
  - VITE_CONVEX_URL
  - CONVEX_INGEST_SECRET
  - INSTANCE_SECRET
  - VITE_WS_URL
  - HOST, PORT
  - FRONTEND_ORIGINS

- Root `.env.local`
  - CONVEX_SELF_HOSTED_URL, CONVEX_SELF_HOSTED_ADMIN_KEY, INSTANCE_NAME, INSTANCE_SECRET
  - CONVEX_URL

- `vite-app/.env`
  - Mirrors root `.env` values used by frontend (VITE_CONVEX_URL, VITE_WS_URL)

- `vite-app/.env.local`
  - VITE_CONVEX_URL=https://convex.smallfatcat-dev.org
  - VITE_WS_URL=wss://ws.smallfatcat-dev.org

- `vite-app/.env.example`
  - VITE_WS_URL (template)

- `apps/game-server/.env`
  - Mirrors root `.env` server values (HOST, PORT, FRONTEND_ORIGINS) and also includes frontend/convex items

- `apps/game-server/.env.example`
  - HOST, PORT, FRONTEND_ORIGINS template

- Other usage
  - Frontend: Vite `loadEnv` and `import.meta.env` with `envPrefix: ['VITE_']`
  - Node script `vite-app/scripts/generate-face-art.mjs`: now preloads dotenv (replaced custom parser)
  - Node script `vite-app/scripts/generate-face-art.ts`: now preloads dotenv
  - Game server: npm scripts now preload `dotenv` to ensure consistent loading

## Problems Identified

- Mixed approaches: Vite envs, custom `.env` loader in one script, implicit `process.env` in another, `dotenv` dependency on server but no visible import.
- Duplication: same variables defined in root, `vite-app`, and `apps/game-server` `.env` files.
- Secrets committed in example/non-example envs.

## Standardization Goals

- Keep frontend on Vite conventions: only `VITE_` prefixed variables visible to client; use `import.meta.env`.
- Standardize Node processes (server and scripts) on `dotenv`.
- Reduce duplication by preferring a single source of truth:
  - Root `.env` (and `.env.local`) as the default for the monorepo.
  - Package-specific `.env` only if a package needs overrides distinct from the root.
- Do not break current configs: continue reading existing per-package `.env` files if present.

## Proposed Loading Standard

- Frontend (Vite):
  - Continue using `loadEnv(mode, process.cwd(), '')` and `envPrefix: ['VITE_']`.
  - Vite will automatically load `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local` in the `vite-app` directory.

- Node (server and scripts):
  - Use `dotenv` and load env from the nearest package directory, falling back to root.
  - Recommended entrypoint pattern:
    - ESM: `import 'dotenv/config'`
    - CJS: `require('dotenv').config()`
  - Alternative zero-code-change option: run with `node -r dotenv/config ...` or `tsx -r dotenv/config ...`.

- Resolution order (Node):
  1) `./.env.local` (package)
  2) `./.env` (package)
  3) `../../.env.local` (monorepo root)
  4) `../../.env` (monorepo root)
  - Variables already present in `process.env` win.

## Migration Plan (No-Break)

1) Documentation (this file) and examples
   - Add/refresh `.env.example` in each package with only necessary keys, no secrets.
2) Scripts
   - Update `vite-app/scripts/generate-face-art.mjs` to use `dotenv` instead of custom parser.
   - Update `vite-app/scripts/generate-face-art.ts` to load `dotenv`.
   - Provide CLI example using `-r dotenv/config` so no code changes are required to run.
3) Game server
   - Ensure server entrypoint loads `dotenv` early. If source remains untracked, add a note to run via `node -r dotenv/config` or `tsx -r dotenv/config`.
4) De-duplication
   - Prefer root `.env` for shared values (e.g., CONVEX_*). Keep `vite-app/.env.local` for production frontend endpoints as needed; remove duplicates from `apps/game-server/.env` unless required.
5) Secrets hygiene
   - Replace any real secrets in tracked `.env` with placeholders; move real values to `.env.local` (ignored by git).

## Variable Map and Ownership

- Frontend (Vite-exposed)
  - VITE_WS_URL: WebSocket endpoint
  - VITE_CONVEX_URL: Convex HTTP endpoint

- Backend / Scripts (Node-only)
  - HOST, PORT: server bind address and port
  - FRONTEND_ORIGINS: CORS list
  - CONVEX_INGEST_SECRET, INSTANCE_SECRET: server/backend usage only

## Action Items

- Define standard loading approach (this doc) [Owner: infra]
- Update Node scripts to load `dotenv` [Owner: frontend]
- Confirm server dotenv loading or provide run flags [Owner: backend]
- Reduce duplication; align env values to root where possible [Owner: infra]
- Sanitize committed env files and update `.env.example` [Owner: repo]

## How to Run

- Frontend:
  - `cd vite-app && npm run dev` (Vite auto-loads env files)
- Node script:
  - `node -r dotenv/config scripts/generate-face-art.mjs`
  - `tsx -r dotenv/config scripts/generate-face-art.ts`
- Game server (if not loading in code):
  - `node -r dotenv/config dist/index.js`
  - `tsx -r dotenv/config src/index.ts`

## Implementation Status

- Node scripts standardized to use `dotenv`:
  - Updated `vite-app/scripts/generate-face-art.mjs` to `import 'dotenv/config'` and removed custom parser.
  - Updated `vite-app/scripts/generate-face-art.ts` to `import 'dotenv/config'`.
- Game server startup now preloads dotenv via npm scripts in `apps/game-server/package.json`:
  - `dev`: `tsx -r dotenv/config watch src/index.ts`
  - `start`: `node -r dotenv/config dist/index.js`
  - `dev:client`: `tsx -r dotenv/config src/dev/client.ts`
- Added root `.env.example` with placeholders.
 - Removed duplicated variables from `vite-app/.env` and minimized `apps/game-server/.env` to backend-only and optional overrides.
 - Created `apps/game-server/.env.local` for secrets (`CONVEX_INGEST_SECRET`, `INSTANCE_SECRET`).
 - Sanitized tracked `.env` files by replacing secrets with placeholders; created `apps/game-server/.env.local` for real values.
  - Cleaned `.env.local` files: removed unused root `.env.local`; kept `vite-app/.env.local` and `apps/game-server/.env.local`.

Next steps (safe, non-breaking):
- Reduce duplication by consolidating shared values in root `.env` while preserving package-level overrides when present.
