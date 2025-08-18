---
description: Tracking document for Convex-based accounts and game tracking integration
globs: ["convex/**/*.{ts,tsx}", "apps/game-server/src/**/*.{ts,tsx}", "vite-app/src/**/*.{ts,tsx}"]
related_docs: ["docs/system-overview.md", ".cursor/rules/convex_rules.mdc"]
---

### Convex Integration Progress

#### Completed
- Convex client wired in frontend
  - `vite-app/src/convexClient.ts`
  - `vite-app/src/main.tsx` wrapped with `ConvexProvider`
- Convex backend scaffold
  - `convex/schema.ts` with tables: `users`, `appSessions`, `tables`, `participants`, `hands`, `actions`, `ingestEvents`
  - `convex/users.ts`: `createOrGetGuest`, `getById`
  - `convex/history.ts`: `listMyHands`, `getHandDetail`
  - `convex/http.ts`: signed ingestion routes (`/ingest/health`, `/ingest/handStarted`, `/ingest/action`, `/ingest/handEnded`, `/ingest/seat`, `/ingest/unseat`)
  - `convex/ingest.ts`: internal mutations with idempotency via `ingestEvents`
- Game server → Convex ingestion
  - `apps/game-server/src/ingest/convexPublisher.ts` (uses `CONVEX_INGEST_URL` + `INGEST_SECRET`)
  - Hooked into runtime events in `apps/game-server/src/tables/serverRuntimeTable.ts` for: `handStarted`, `action`, `seat`, `unseat`, and `handEnded`
  - Plumbed publisher in `apps/game-server/src/index.ts` when creating tables

#### Env/Config
- Frontend: `VITE_CONVEX_URL` (Convex deployment URL)
- Game server: `CONVEX_INGEST_URL` (Convex base URL) and `INGEST_SECRET`
- Convex: set `INGEST_SECRET` env var

#### Next Steps
1. Map actors to users in ingestion
   - Use `playerToken` to link actions/results to `users` via `users.createOrGetGuest` logic
   - Update `convex/ingest.ts` to resolve `actorUserId` and fill `results.userId`
2. Improve history query performance
   - Add a join table (e.g., `handParticipants`) to index hands by user for efficient `listMyHands`
   - Update `history.listMyHands` to use `.paginate` properly with cursor and index
3. Frontend history UI
   - Add hooks/components to display recent hands and hand details powered by Convex queries
   - Use stored `playerToken` and `displayName` to call `users.createOrGetGuest`
4. Harden ingestion
   - Validate payloads strictly; add schema guards on `http.ts` or inside internal mutations
   - Add retries/backoff on publisher and metrics logs
5. Auth roadmap (optional)
   - Introduce Convex Auth providers and merge guest history by `externalProvider/externalSubject`

#### Validation Plan
- Local: run `npx convex dev`, set envs, play a few hands; verify documents in Convex dashboard
- UI: implement a temporary debug page listing last 5 hands for the current token/user


