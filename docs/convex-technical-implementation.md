# Convex Technical Implementation Details

This document provides detailed technical information about the Convex integration implementation, including code patterns, configuration, and best practices.

## Project Structure

```
montecarlo/
├── convex/                          # Convex backend functions
│   ├── _generated/                 # Auto-generated types and API
│   ├── schema.ts                   # Database schema definition
│   ├── users.ts                    # User management functions
│   ├── history.ts                  # Hand history queries
│   ├── ingest.ts                   # Event ingestion mutations
│   ├── http.ts                     # HTTP endpoints
│   └── tsconfig.json              # TypeScript configuration
├── convex-self-hosted/             # Self-hosted Convex infrastructure
│   ├── docker-compose.yml         # Docker services
│   └── ADMIN_KEY.txt              # Admin credentials
├── vite-app/                       # Frontend application
│   ├── src/
│   │   ├── convexClient.ts        # Convex client configuration
│   │   └── convex/                # Frontend Convex utilities
└── apps/game-server/               # Game server backend
```

## Database Schema Implementation

### Core Tables

```typescript
// convex/schema.ts
export default defineSchema({
  users: defineTable({
    kind: v.union(v.literal("guest"), v.literal("oauth")),
    displayName: v.string(),
    externalProvider: v.string(),
    externalSubject: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_provider_and_subject", ["externalProvider", "externalSubject"]),

  tables: defineTable({
    tableId: v.string(),
    variant: v.literal("holdem"),
    config: v.object({
      smallBlind: v.number(),
      bigBlind: v.number(),
    }),
    status: v.union(
      v.literal("open"),
      v.literal("in_hand"),
      v.literal("closed"),
    ),
    createdAt: v.number(),
  }).index("by_tableId", ["tableId"]),

  participants: defineTable({
    tableId: v.id("tables"),
    userId: v.id("users"),
    seatIndex: v.number(),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
  })
    .index("by_table", ["tableId"]) 
    .index("by_user", ["userId"]) 
    .index("by_table_and_active", ["tableId", "leftAt"]),

  hands: defineTable({
    tableId: v.id("tables"),
    handSeq: v.number(),
    seed: v.number(),
    buttonIndex: v.number(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    board: v.array(v.string()),
    pots: v.array(
      v.object({ amount: v.number(), eligibleSeats: v.array(v.number()) }),
    ),
    results: v.array(
      v.object({
        seatIndex: v.number(),
        userId: v.optional(v.id("users")),
        delta: v.number(),
      }),
    ),
  }).index("by_table_and_seq", ["tableId", "handSeq"]),

  actions: defineTable({
    handId: v.id("hands"),
    order: v.number(),
    street: v.union(
      v.literal("preflop"),
      v.literal("flop"),
      v.literal("turn"),
      v.literal("river"),
      v.literal("showdown"),
    ),
    actorUserId: v.optional(v.id("users")),
    seatIndex: v.number(),
    type: v.union(
      v.literal("fold"),
      v.literal("check"),
      v.literal("call"),
      v.literal("bet"),
      v.literal("raise"),
    ),
    amount: v.optional(v.number()),
  }).index("by_hand_and_order", ["handId", "order"]),

  handParticipants: defineTable({
    handId: v.id("hands"),
    userId: v.id("users"),
  })
    .index("by_user", ["userId"]) 
    .index("by_hand", ["handId"]),

  ingestEvents: defineTable({
    source: v.literal("game-server"),
    eventId: v.string(),
    receivedAt: v.number(),
  }).index("by_source_and_eventId", ["source", "eventId"]),
});
```

## Function Implementation Patterns

### Public Query Functions

```typescript
// convex/history.ts
export const listMyHands = query({
  args: {
    userId: v.id("users"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("hands"),
        _creationTime: v.number(),
        tableId: v.id("tables"),
        handSeq: v.number(),
        seed: v.number(),
        startedAt: v.number(),
        endedAt: v.optional(v.number()),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    // Efficient approach: use join table index by user
    const handIds: Array<any> = []
    let count = 0
    for await (const hp of ctx.db
      .query("handParticipants")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")) {
      handIds.push(hp.handId)
      count += 1
      if (count >= (args.paginationOpts.numItems ?? 20)) break
    }
    
    const docs = [] as any[]
    for (const hid of handIds) {
      const h = await ctx.db.get(hid as any)
      if (h) docs.push(h)
    }
    
    return {
      page: docs.map((h) => ({
        _id: h._id,
        _creationTime: h._creationTime,
        tableId: h.tableId,
        handSeq: h.handSeq,
        seed: h.seed,
        startedAt: h.startedAt,
        endedAt: h.endedAt,
      })),
      isDone: true,
      continueCursor: null,
    }
  },
});
```

### Public Mutation Functions

```typescript
// convex/users.ts
export const createOrGetGuest = mutation({
  args: {
    displayName: v.string(),
    externalSubject: v.string(), // e.g., game-server token
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_provider_and_subject", (q) =>
        q.eq("externalProvider", "game-server").eq("externalSubject", args.externalSubject),
      )
      .unique();
    
    if (existing) return existing._id;
    
    const userId = await ctx.db.insert("users", {
      kind: "guest",
      displayName: args.displayName,
      externalProvider: "game-server",
      externalSubject: args.externalSubject,
      createdAt: Date.now(),
    });
    
    return userId;
  },
});
```

### Internal Mutation Functions

```typescript
// convex/ingest.ts
export const handStarted = internalMutation({
  args: {
    eventId: v.string(),
    tableId: v.string(),
    handId: v.number(),
    buttonIndex: v.number(),
    smallBlind: v.number(),
    bigBlind: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const proceed = await ensureIdempotent(ctx, args.eventId);
    if (!proceed) return null;
    
    // Upsert table
    let table = await ctx.db
      .query("tables")
      .withIndex("by_tableId", (q: any) => q.eq("tableId", args.tableId))
      .unique();
      
    if (!table) {
      const id = await ctx.db.insert("tables", {
        tableId: args.tableId,
        variant: "holdem",
        config: { smallBlind: args.smallBlind, bigBlind: args.bigBlind },
        status: "in_hand",
        createdAt: Date.now(),
      });
      table = await ctx.db.get(id);
    } else {
      await ctx.db.patch(table._id, {
        status: "in_hand",
        config: { smallBlind: args.smallBlind, bigBlind: args.bigBlind },
      });
    }
    
    // Create hand doc
    const handIdDoc = await ctx.db.insert("hands", {
      tableId: table!._id,
      handSeq: args.handId,
      seed: 0,
      buttonIndex: args.buttonIndex,
      startedAt: Date.now(),
      endedAt: undefined,
      board: [],
      pots: [],
      results: [],
    });
    
    // Seed participants for this hand from current table participants
    for await (const p of ctx.db
      .query("participants")
      .withIndex("by_table_and_active", (q: any) => 
        q.eq("tableId", table!._id).eq("leftAt", null)
      )) {
      await ctx.db.insert("handParticipants", { 
        handId: handIdDoc, 
        userId: p.userId 
      })
    }
    
    return null;
  },
});
```

### HTTP Endpoints

```typescript
// convex/http.ts
const withIngestAuth = (handler: Parameters<typeof httpAction>[0]) =>
  httpAction(async (ctx, req) => {
    const secret = req.headers.get("x-convex-ingest-secret") || "";
    if (secret !== process.env.INGEST_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    return handler(ctx, req);
  });

http.route({
  path: "/ingest/handStarted",
  method: "POST",
  handler: withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.handStarted, body);
    return new Response(null, { status: 204 });
  }),
});

http.route({
  path: "/ingest/action",
  method: "POST",
  handler: withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.action, body);
    return new Response(null, { status: 204 });
  }),
});
```

## Frontend Integration

### Convex Client Configuration

```typescript
// vite-app/src/convexClient.ts
import { ConvexReactClient } from 'convex/react'

const url = import.meta.env.VITE_CONVEX_URL as string | undefined
if (!url) {
  console.warn('[convex] VITE_CONVEX_URL not set; Convex queries will fail until configured')
}

export const convex = new ConvexReactClient(url || '')
```

### React Component Usage

```typescript
// Example React component using Convex
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'

function HandHistory({ userId }: { userId: Id<"users"> }) {
  const hands = useQuery(api.history.listMyHands, { 
    userId, 
    paginationOpts: { numItems: 20 } 
  });
  
  if (!hands) return <div>Loading...</div>;
  
  return (
    <div>
      {hands.page.map(hand => (
        <div key={hand._id}>
          Hand #{hand.handSeq} - {new Date(hand.startedAt).toLocaleDateString()}
        </div>
      ))}
    </div>
  );
}
```

## Docker Configuration

### Self-Hosted Convex Setup

```yaml
# convex-self-hosted/docker-compose.yml
services:
  backend:
    image: ghcr.io/get-convex/convex-backend:33cef775a8a6228cbacee4a09ac2c4073d62ed13
    stop_grace_period: 10s
    stop_signal: SIGINT
    ports:
      - "${PORT:-3210}:3210"
      - "${SITE_PROXY_PORT:-3211}:3211"
    volumes:
      - data:/convex/data
    environment:
      - INSTANCE_NAME=${INSTANCE_NAME:-}
      - INSTANCE_SECRET=${INSTANCE_SECRET:-}
      - CONVEX_RELEASE_VERSION_DEV=${CONVEX_RELEASE_VERSION_DEV:-}
      - ACTIONS_USER_TIMEOUT_SECS=${ACTIONS_USER_TIMEOUT_SECS:-}
      - CONVEX_CLOUD_ORIGIN=${CONVEX_CLOUD_ORIGIN:-http://127.0.0.1:${PORT:-3210}}
      - CONVEX_SITE_ORIGIN=${CONVEX_SITE_ORIGIN:-http://127.0.0.1:${SITE_PROXY_PORT:-3211}}
      - DATABASE_URL=${DATABASE_URL:-}
      - DISABLE_BEACON=${DISABLE_BEACON:-}
      - REDACT_LOGS_TO_CLIENT=${REDACT_LOGS_TO_CLIENT:-}
      - DO_NOT_REQUIRE_SSL=${DO_NOT_REQUIRE_SSL:-}
      - POSTGRES_URL=${POSTGRES_URL:-}
      - MYSQL_URL=${MYSQL_URL:-}
      - RUST_LOG=${RUST_LOG:-info}
      - RUST_BACKTRACE=${RUST_BACKTRACE:-}
      - AWS_REGION=${AWS_REGION:-}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}
      - AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN:-}
      - AWS_S3_FORCE_PATH_STYLE=${AWS_S3_FORCE_PATH_STYLE:-}
      - S3_STORAGE_EXPORTS_BUCKET=${S3_STORAGE_EXPORTS_BUCKET:-}
      - S3_STORAGE_SNAPSHOT_IMPORTS_BUCKET=${S3_STORAGE_SNAPSHOT_IMPORTS_BUCKET:-}
      - S3_STORAGE_MODULES_BUCKET=${S3_STORAGE_MODULES_BUCKET:-}
      - S3_STORAGE_FILES_BUCKET=${S3_STORAGE_FILES_BUCKET:-}
      - S3_STORAGE_SEARCH_BUCKET=${S3_STORAGE_SEARCH_BUCKET:-}
      - S3_ENDPOINT_URL=${S3_ENDPOINT_URL:-}
    healthcheck:
      test: curl -f http://localhost:3210/version
      interval: 5s
      start_period: 10s

  dashboard:
    image: ghcr.io/get-convex/convex-dashboard:33cef775a8a6228cbacee4a09ac2c4073d62ed13
    stop_grace_period: 10s
    stop_signal: SIGINT
    ports:
      - "${DASHBOARD_PORT:-6791}:6791"
    environment:
      - NEXT_PUBLIC_DEPLOYMENT_URL=${NEXT_PUBLIC_DEPLOYMENT_URL:-http://127.0.0.1:${PORT:-3210}}
    depends_on:
      backend:
        condition: service_healthy

volumes:
  data:
```

## Environment Configuration

### Development Environment Variables

```bash
# .env.local (frontend)
VITE_CONVEX_URL=http://127.0.0.1:3210

# .env (game server)
CONVEX_INGEST_URL=http://127.0.0.1:3210
INGEST_SECRET=dev-secret-123

# .env (convex self-hosted)
PORT=3210
SITE_PROXY_PORT=3211
DASHBOARD_PORT=6791
INSTANCE_NAME=montecarlo-dev
INSTANCE_SECRET=your-secret-here
```

### Production Environment Variables

```bash
# Production environment
CONVEX_INGEST_URL=https://your-convex-instance.com
INGEST_SECRET=production-secret-here
VITE_CONVEX_URL=https://your-convex-instance.com
```

## Development Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "dev:all": "concurrently \"npm run dev:convex:up\" \"npm run dev:convex\" \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:frontend": "cd vite-app && VITE_CONVEX_URL=http://127.0.0.1:3210 npm run dev",
    "dev:backend": "cd apps/game-server && CONVEX_INGEST_URL=http://127.0.0.1:3210 INGEST_SECRET=dev-secret-123 npm run dev",
    "dev:convex": "npx convex dev",
    "dev:convex:up": "mkdir -p convex-self-hosted && (test -f convex-self-hosted/docker-compose.yml || curl -fsSL https://raw.githubusercontent.com/get-convex/convex-backend/main/self-hosted/docker/docker-compose.yml -o convex-self-hosted/docker-compose.yml) && (docker compose -f convex-self-hosted/docker-compose.yml up -d || sudo docker compose -f convex-self-hosted/docker-compose.yml up -d)",
    "dev:convex:down": "docker compose -f convex-self-hosted/docker-compose.yml down",
    "dev:convex:up:sudo": "mkdir -p convex-self-hosted && (test -f convex-self-hosted/docker-compose.yml || curl -fsSL https://raw.githubusercontent.com/get-convex/convex-backend/main/self-hosted/docker/docker-compose.yml -o convex-self-hosted/docker-compose.yml) && sudo docker compose -f convex-self-hosted/docker-compose.yml up -d",
    "dev:all:no-up": "concurrently \"npm run dev:convex\" \"npm run dev:backend\" \"npm run dev:frontend\""
  }
}
```

## TypeScript Configuration

### Convex TypeScript Config

```json
// convex/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ES2020",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": [
    "**/*.ts",
    "**/*.tsx"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### Frontend TypeScript Config

```json
// vite-app/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "app-convex/*": ["../convex/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Best Practices Implemented

### 1. Idempotency

```typescript
const ensureIdempotent = async (ctx: any, eventId: string) => {
  const prior = await ctx.db
    .query("ingestEvents")
    .withIndex("by_source_and_eventId", (q: any) => 
      q.eq("source", "game-server").eq("eventId", eventId)
    )
    .unique();
    
  if (prior) return false;
  
  await ctx.db.insert("ingestEvents", { 
    source: "game-server", 
    eventId, 
    receivedAt: Date.now() 
  });
  
  return true;
};
```

### 2. Efficient Indexing

```typescript
// Use compound indexes for common query patterns
.index("by_table_and_active", ["tableId", "leftAt"])

// Query using the index
for await (const p of ctx.db
  .query("participants")
  .withIndex("by_table_and_active", (q: any) => 
    q.eq("tableId", tableId).eq("leftAt", null)
  )) {
  // Process active participants
}
```

### 3. Type Safety

```typescript
// Use proper Convex types
import { Id } from "./_generated/dataModel";

export const getById = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      kind: v.union(v.literal("guest"), v.literal("oauth")),
      displayName: v.string(),
      externalProvider: v.string(),
      externalSubject: v.string(),
      avatarUrl: v.optional(v.string()),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
```

### 4. Error Handling

```typescript
// HTTP endpoint with proper error handling
http.route({
  path: "/ingest/health",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const counts = await ctx.runQuery(internal.ingest.debugCounts, {})
      return new Response(JSON.stringify({ ok: true, counts }), { 
        status: 200, 
        headers: { "content-type": "application/json" } 
      })
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
        status: 500, 
        headers: { "content-type": "application/json" } 
      })
    }
  }),
});
```

## Performance Optimizations

### 1. Pagination

```typescript
// Use pagination for large result sets
export const listRecentHands = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(/* ... */),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const byTableSeq = ctx.db
      .query("hands")
      .withIndex("by_table_and_seq", (q) => q)
      .order("desc");
      
    const page = await byTableSeq.take(args.paginationOpts.numItems ?? 20);
    
    return {
      page: page.map(/* ... */),
      isDone: true,
      continueCursor: null,
    };
  },
});
```

### 2. Selective Field Loading

```typescript
// Only load necessary fields
const hand = await ctx.db.get(handId);
if (hand) {
  return {
    _id: hand._id,
    handSeq: hand.handSeq,
    startedAt: hand.startedAt,
    // Only return essential fields
  };
}
```

### 3. Batch Operations

```typescript
// Batch database operations when possible
for await (const p of ctx.db
  .query("participants")
  .withIndex("by_table_and_active", (q: any) => 
    q.eq("tableId", tableId).eq("leftAt", null)
  )) {
  await ctx.db.insert("handParticipants", { 
    handId: handIdDoc, 
    userId: p.userId 
  });
}
```

This technical implementation provides:

- **Type-safe development** with comprehensive TypeScript integration
- **Efficient database operations** using proper indexing and pagination
- **Robust error handling** with proper HTTP status codes and error messages
- **Scalable architecture** with self-hosted Convex and Docker deployment
- **Developer experience** with hot reloading and comprehensive development scripts
- **Production readiness** with proper environment configuration and security
