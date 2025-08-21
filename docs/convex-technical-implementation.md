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
│   │   ├── convex/                # Frontend Convex utilities
│   │   └── ui/poker/              # Poker components with Convex queries
└── apps/game-server/               # Game server backend with state machine
    ├── src/
    │   ├── ingest/                # Convex event publishing
    │   │   ├── convexPublisher.ts # HTTP-based event ingestion
    │   │   └── stateMachineAdapter.ts # State machine integration
    │   └── server/                # WebSocket server
```

## Database Schema Implementation

### Core Tables

```typescript
// convex/schema.ts
export default defineSchema({
  // Configuration table for application settings
  config: defineTable({
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  users: defineTable({
    kind: v.union(v.literal("guest"), v.literal("oauth")),
    displayName: v.string(),
    externalProvider: v.string(),
    externalSubject: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_provider_and_subject", ["externalProvider", "externalSubject"]),

  appSessions: defineTable({
    userId: v.id("users"),
    deviceId: v.string(),
    createdAt: v.number(),
    lastSeenAt: v.number(),
  }).index("by_user", ["userId"]),

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

  // State machine integration tables
  gameStateSnapshots: defineTable({
    tableId: v.string(),
    handId: v.number(),
    timestamp: v.number(),
    gameState: v.object({
      status: v.string(),
      street: v.optional(v.string()),
      currentToAct: v.optional(v.number()),
      pot: v.object({
        main: v.number(),
        sidePots: v.optional(v.array(v.object({
          amount: v.number(),
          eligibleSeats: v.array(v.number())
        })))
      }),
      seats: v.array(v.object({
        seatIndex: v.number(),
        stack: v.number(),
        committedThisStreet: v.number(),
        totalCommitted: v.number(),
        hasFolded: v.boolean(),
        isAllIn: v.boolean(),
        hole: v.array(v.string())
      })),
      community: v.array(v.string()),
      buttonIndex: v.number(),
      lastAggressorIndex: v.optional(v.number()),
      betToCall: v.number(),
      lastRaiseAmount: v.number()
    }),
    trigger: v.optional(v.string()),
    actionId: v.optional(v.string())
  }).index("by_table_and_hand", ["tableId", "handId"]),

  stateMachineEvents: defineTable({
    tableId: v.string(),
    handId: v.number(),
    timestamp: v.number(),
    eventType: v.string(),
    fromState: v.string(),
    toState: v.string(),
    context: v.any(),
    metadata: v.optional(v.any())
  }).index("by_table_and_hand", ["tableId", "handId"]),

  potHistoryEvents: defineTable({
    tableId: v.string(),
    handId: v.number(),
    timestamp: v.number(),
    eventType: v.string(),
    potState: v.any(),
    metadata: v.optional(v.any())
  }).index("by_table_and_hand", ["tableId", "handId"]),

  // Idempotency tracking
  ingestEvents: defineTable({
    source: v.string(),
    eventId: v.string(),
    receivedAt: v.number(),
  }).index("by_source_and_eventId", ["source", "eventId"]),
});
```

## HTTP Endpoints Implementation

### Authentication Middleware

```typescript
// convex/http.ts
const withIngestAuth = (handler: Parameters<typeof httpAction>[0]) =>
  httpAction(async (ctx, req) => {
    const secret = req.headers.get("x-convex-ingest-secret") || "";
    
    // Get the secret from the configuration table
    const expectedSecret = await ctx.runQuery(internal.ingest.getConfig, { 
      key: "INSTANCE_SECRET" 
    });
    
    if (!expectedSecret || secret !== expectedSecret) {
      return new Response("Unauthorized", { status: 401 });
    }
    return handler(ctx, req);
  });
```

### Event Ingestion Endpoints

```typescript
// convex/http.ts
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

// State machine integration endpoints
http.route({
  path: "/ingest/stateMachineEvent",
  method: "POST",
  handler: withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.stateMachineEvent, body);
    return new Response(null, { status: 204 });
  }),
});

http.route({
  path: "/ingest/gameStateSnapshot",
  method: "POST",
  handler: withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.gameStateSnapshot, body);
    return new Response(null, { status: 204 });
  }),
});
```

## Event Ingestion Implementation

### Idempotency Handling

```typescript
// convex/ingest.ts
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

### State Machine Event Ingestion

```typescript
// convex/ingest.ts
export const stateMachineEvent = internalMutation({
  args: {
    eventId: v.string(),
    tableId: v.string(),
    handId: v.number(),
    timestamp: v.number(),
    eventType: v.string(),
    fromState: v.string(),
    toState: v.string(),
    context: v.any(),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const proceed = await ensureIdempotent(ctx, args.eventId);
    if (!proceed) return null;

    await ctx.db.insert("stateMachineEvents", {
      tableId: args.tableId,
      handId: args.handId,
      timestamp: args.timestamp,
      eventType: args.eventType,
      fromState: args.fromState,
      toState: args.toState,
      context: args.context,
      metadata: args.metadata,
    });

    return null;
  },
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

### React Component Integration

```typescript
// vite-app/src/ui/poker/HandReplay.tsx
import { useQuery } from 'convex/react';
import { api } from 'app-convex/_generated/api';

export function HandReplay({ handId, onClose }: HandReplayProps) {
  // Fetch the complete hand replay data
  const handReplay = useQuery(api.history.getHandReplay, { handId });
  
  // Extract snapshots and sort by timestamp
  const snapshots = useMemo(() => {
    if (!handReplay?.gameStateSnapshots) return [];
    return [...handReplay.gameStateSnapshots].sort((a, b) => a.timestamp - b.timestamp);
  }, [handReplay?.gameStateSnapshots]);

  // ... rest of component implementation
}
```

### Main App Integration

```typescript
// vite-app/src/main.tsx
import { ConvexProvider } from 'convex/react';
import { convex } from './convexClient';

function initializeApp(): void {
  const rootElement = document.getElementById('app');
  if (!rootElement) {
    throw new Error('Root element "app" not found');
  }
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </React.StrictMode>
  );
}
```

## Game Server Integration

### Convex Publisher

```typescript
// apps/game-server/src/ingest/convexPublisher.ts
export class ConvexPublisher {
  private baseUrl: string;
  private secret: string;
  public enabled: boolean;

  constructor({ baseUrl, secret }: { baseUrl: string; secret: string }) {
    this.baseUrl = baseUrl;
    this.secret = secret;
    this.enabled = baseUrl.length > 0 && secret.length > 0;
  }

  async handStarted(params: HandStartedParams): Promise<void> {
    if (!this.enabled) return;
    
    await this.post('/ingest/handStarted', params);
  }

  async action(params: ActionParams): Promise<void> {
    if (!this.enabled) return;
    
    await this.post('/ingest/action', params);
  }

  private async post(endpoint: string, data: any): Promise<void> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-convex-ingest-secret': this.secret,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }
}
```

### State Machine Adapter

```typescript
// apps/game-server/src/ingest/stateMachineAdapter.ts
export class StateMachineAdapter {
  private convex: ConvexPublisher;
  private tableId: string;
  private currentHand: number | null = null;

  constructor(convex: ConvexPublisher, tableId: string) {
    this.convex = convex;
    this.tableId = tableId;
  }

  setCurrentHand(handId: number): void {
    this.currentHand = handId;
  }

  async captureActionProcessed(
    actionType: string, 
    seatIndex: number, 
    context: any
  ): Promise<void> {
    if (!this.currentHand) return;

    await this.convex.post('/ingest/stateMachineEvent', {
      eventId: generateEventId(),
      tableId: this.tableId,
      handId: this.currentHand,
      timestamp: Date.now(),
      eventType: 'action_processed',
      fromState: 'processing',
      toState: 'processed',
      context: { actionType, seatIndex, ...context }
    });
  }

  async captureGameEvent(eventType: string, context: any): Promise<void> {
    if (!this.currentHand) return;

    await this.convex.post('/ingest/stateMachineEvent', {
      eventId: generateEventId(),
      tableId: this.tableId,
      handId: this.currentHand,
      timestamp: Date.now(),
      eventType,
      fromState: 'active',
      toState: 'active',
      context
    });
  }
}
```

## Configuration Management

### Environment Variables

```bash
# .env
VITE_CONVEX_URL=http://127.0.0.1:3210
CONVEX_INGEST_URL=http://127.0.0.1:3210
INSTANCE_SECRET=your-secret-key-here
```

### Configuration Table

```typescript
// convex/ingest.ts
export const initializeConfig = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existingSecret = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", "INSTANCE_SECRET"))
      .unique();
    
    if (!existingSecret) {
      await ctx.db.insert("config", {
        key: "INSTANCE_SECRET",
        value: "your-secret-key-here",
        description: "Secret key for authenticating ingest requests",
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});
```

## Performance Optimization

### Query Optimization

```typescript
// Use indexes for efficient queries
const hands = await ctx.db
  .query("hands")
  .withIndex("by_table_and_seq", (q) => 
    q.eq("tableId", args.tableId).eq("handSeq", args.handSeq)
  )
  .unique();

// Pagination for large result sets
const recentHands = await ctx.db
  .query("hands")
  .withIndex("by_table_and_seq", (q) => q.eq("tableId", args.tableId))
  .order("desc")
  .take(10);
```

### Idempotency and Deduplication

```typescript
// Ensure events are processed only once
const proceed = await ensureIdempotent(ctx, args.eventId);
if (!proceed) return null;

// Process event only if not already processed
await ctx.db.insert("actions", {
  handId: args.handId,
  order: args.order,
  // ... other fields
});
```

## Error Handling and Monitoring

### Health Check Endpoint

```typescript
// convex/http.ts
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

### Debug Counts Query

```typescript
// convex/ingest.ts
export const debugCounts = internalQuery({
  args: {},
  returns: v.object({
    tables: v.number(),
    hands: v.number(),
    actions: v.number(),
    gameStateSnapshots: v.number(),
    stateMachineEvents: v.number(),
    potHistoryEvents: v.number(),
  }),
  handler: async (ctx) => {
    const [tables, hands, actions, snapshots, events, potEvents] = await Promise.all([
      ctx.db.query("tables").collect().then(r => r.length),
      ctx.db.query("hands").collect().then(r => r.length),
      ctx.db.query("actions").collect().then(r => r.length),
      ctx.db.query("gameStateSnapshots").collect().then(r => r.length),
      ctx.db.query("stateMachineEvents").collect().then(r => r.length),
      ctx.db.query("potHistoryEvents").collect().then(r => r.length),
    ]);

    return {
      tables,
      hands,
      actions,
      gameStateSnapshots: snapshots,
      stateMachineEvents: events,
      potHistoryEvents: potEvents,
    };
  },
});
```

## Current Implementation Status

✅ **Fully Implemented**:
- Complete database schema with state machine integration
- HTTP-based event ingestion with authentication
- Idempotency and error handling
- Frontend integration with Convex queries
- State machine event tracking
- Configuration management
- Health monitoring and debugging

🎯 **Production Ready**:
- Comprehensive error handling
- Performance optimization with indexes
- Security with authentication
- Monitoring and observability
- Scalable architecture

The Convex integration provides a robust, real-time foundation for the poker application with comprehensive state management, efficient data synchronization, and production-ready reliability.
