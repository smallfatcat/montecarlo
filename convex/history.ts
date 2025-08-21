import { query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

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

export const listRecentHands = query({
  args: {},
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
        buttonIndex: v.number(),
        actionsCount: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const byTableSeq = ctx.db
      .query("hands")
      .withIndex("by_table_and_seq", (q) => q)
      .order("desc");
    
    // Get all hands instead of limiting with pagination
    const allHands = [];
    for await (const hand of byTableSeq) {
      allHands.push(hand);
    }
    
    // Get actions count for each hand
    const handsWithActionsCount = await Promise.all(
      allHands.map(async (h) => {
        let actionsCount = 0;
        for await (const _ of ctx.db
          .query("actions")
          .withIndex("by_hand_and_order", (q) => q.eq("handId", h._id))) {
          actionsCount++;
        }
        
        return {
          _id: h._id,
          _creationTime: h._creationTime,
          tableId: h.tableId,
          handSeq: h.handSeq,
          seed: h.seed,
          startedAt: h.startedAt,
          endedAt: h.endedAt,
          buttonIndex: h.buttonIndex,
          actionsCount,
        };
      })
    );
    
    // Sort by actions count in descending order (most actions first)
    const sortedHands = handsWithActionsCount.sort((a, b) => b.actionsCount - a.actionsCount);
    
    return {
      page: sortedHands,
    };
  },
});

export const getHandDetail = query({
  args: { handId: v.id("hands") },
  returns: v.object({
    hand: v.object({
      _id: v.id("hands"),
      _creationTime: v.number(),
      tableId: v.id("tables"),
      handSeq: v.number(),
      seed: v.number(),
      buttonIndex: v.number(),
      startedAt: v.number(),
      endedAt: v.optional(v.number()),
      board: v.array(v.string()),
      pots: v.array(v.object({ amount: v.number(), eligibleSeats: v.array(v.number()) })),
      results: v.array(
        v.object({ seatIndex: v.number(), userId: v.optional(v.id("users")), delta: v.number() }),
      ),
    }),
    actions: v.array(
      v.object({
        _creationTime: v.number(),
        _id: v.id("actions"),
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
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const hand = await ctx.db.get(args.handId);
    if (!hand) {
      throw new Error("Hand not found");
    }
    const actions = [] as any[];
    for await (const a of ctx.db
      .query("actions")
      .withIndex("by_hand_and_order", (q) => q.eq("handId", args.handId))
      .order("asc")) {
      actions.push(a);
    }
    return { hand, actions } as any;
  },
});

// New comprehensive hand replay query
export const getHandReplay = query({
  args: { handId: v.id("hands") },
  returns: v.object({
    hand: v.object({
      _id: v.id("hands"),
      _creationTime: v.number(),
      tableId: v.id("tables"),
      handSeq: v.number(),
      seed: v.number(),
      buttonIndex: v.number(),
      startedAt: v.number(),
      endedAt: v.optional(v.number()),
      board: v.array(v.string()),
      pots: v.array(v.object({ amount: v.number(), eligibleSeats: v.array(v.number()) })),
      results: v.array(
        v.object({ seatIndex: v.number(), userId: v.optional(v.id("users")), delta: v.number() }),
      ),
    }),
    actions: v.array(
      v.object({
        _creationTime: v.number(),
        _id: v.id("actions"),
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
      }),
    ),
    stateMachineEvents: v.array(
      v.object({
        _id: v.id("stateMachineEvents"),
        _creationTime: v.number(),
        handId: v.id("hands"),
        timestamp: v.number(),
        eventType: v.union(
          v.literal("state_transition"),
          v.literal("action_processed"),
          v.literal("timer_event"),
          v.literal("performance_metric"),
          v.literal("game_event"),
          v.literal("pot_update"),
          v.literal("street_change"),
          v.literal("seat_state_change")
        ),
        fromState: v.optional(v.string()),
        toState: v.optional(v.string()),
        metadata: v.optional(v.any()),
        performanceData: v.optional(v.object({
          processingTimeMs: v.number(),
          memoryUsage: v.optional(v.number()),
          cpuTime: v.optional(v.number())
        })),
        gameContext: v.optional(v.object({
          currentStreet: v.optional(v.string()),
          potAmount: v.optional(v.number()),
          activeSeat: v.optional(v.number()),
          betToCall: v.optional(v.number()),
          lastRaiseAmount: v.optional(v.number())
        }))
      })
    ),
    gameStateSnapshots: v.array(
      v.object({
        _id: v.id("gameStateSnapshots"),
        _creationTime: v.number(),
        handId: v.id("hands"),
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
        actionId: v.optional(v.id("actions"))
      })
    ),
    potHistory: v.array(
      v.object({
        _id: v.id("potHistory"),
        _creationTime: v.number(),
        handId: v.id("hands"),
        timestamp: v.number(),
        potType: v.union(v.literal("main"), v.literal("side")),
        amount: v.number(),
        eligibleSeats: v.array(v.number()),
        trigger: v.string(),
        actionId: v.optional(v.id("actions"))
      })
    )
  }),
  handler: async (ctx, args) => {
    const hand = await ctx.db.get(args.handId);
    if (!hand) {
      throw new Error("Hand not found");
    }

    // Get actions
    const actions = [] as any[];
    for await (const a of ctx.db
      .query("actions")
      .withIndex("by_hand_and_order", (q) => q.eq("handId", args.handId))
      .order("asc")) {
      actions.push(a);
    }

    // Get state machine events
    const stateMachineEvents = [] as any[];
    for await (const e of ctx.db
      .query("stateMachineEvents")
      .withIndex("by_hand_and_timestamp", (q) => q.eq("handId", args.handId))
      .order("asc")) {
      stateMachineEvents.push(e);
    }

    // Get game state snapshots
    const gameStateSnapshots = [] as any[];
    for await (const s of ctx.db
      .query("gameStateSnapshots")
      .withIndex("by_hand_and_timestamp", (q) => q.eq("handId", args.handId))
      .order("asc")) {
      gameStateSnapshots.push(s);
    }

    // Get pot history
    const potHistory = [] as any[];
    for await (const p of ctx.db
      .query("potHistory")
      .withIndex("by_hand_and_timestamp", (q) => q.eq("handId", args.handId))
      .order("asc")) {
      potHistory.push(p);
    }

    return { 
      hand, 
      actions, 
      stateMachineEvents, 
      gameStateSnapshots, 
      potHistory 
    } as any;
  },
});

// Query to get state machine events for a specific hand
export const getStateMachineEvents = query({
  args: { 
    handId: v.id("hands"),
    eventType: v.optional(v.union(
      v.literal("state_transition"),
      v.literal("action_processed"),
      v.literal("timer_event"),
      v.literal("performance_metric"),
      v.literal("game_event"),
      v.literal("pot_update"),
      v.literal("street_change"),
      v.literal("seat_state_change")
    ))
  },
  returns: v.array(
    v.object({
      _id: v.id("stateMachineEvents"),
      timestamp: v.number(),
      eventType: v.union(
        v.literal("state_transition"),
        v.literal("action_processed"),
        v.literal("timer_event"),
        v.literal("performance_metric"),
        v.literal("game_event"),
        v.literal("pot_update"),
        v.literal("street_change"),
        v.literal("seat_state_change")
      ),
      fromState: v.optional(v.string()),
      toState: v.optional(v.string()),
      metadata: v.optional(v.any()),
      performanceData: v.optional(v.object({
        processingTimeMs: v.number(),
        memoryUsage: v.optional(v.number()),
        cpuTime: v.optional(v.number())
      })),
      gameContext: v.optional(v.object({
        currentStreet: v.optional(v.string()),
        potAmount: v.optional(v.number()),
        activeSeat: v.optional(v.number()),
        betToCall: v.optional(v.number()),
        lastRaiseAmount: v.optional(v.number())
      }))
    })
  ),
  handler: async (ctx, args) => {
    const events = [] as any[];
    const query = ctx.db
      .query("stateMachineEvents")
      .withIndex("by_hand_and_timestamp", (q) => q.eq("handId", args.handId));
    
    if (args.eventType) {
      // Filter by event type if specified
      for await (const e of query) {
        if (e.eventType === args.eventType) {
          events.push(e);
        }
      }
    } else {
      // Get all events
      for await (const e of query.order("asc")) {
        events.push(e);
      }
    }
    
    return events;
  },
});

// Query to get performance metrics for a hand
export const getHandPerformanceMetrics = query({
  args: { handId: v.id("hands") },
  returns: v.object({
    totalActions: v.number(),
    averageProcessingTime: v.number(),
    totalProcessingTime: v.number(),
    memoryUsage: v.optional(v.object({
      min: v.number(),
      max: v.number(),
      average: v.number()
    })),
    cpuTime: v.optional(v.object({
      min: v.number(),
      max: v.number(),
      average: v.number()
    })),
    eventCounts: v.record(v.string(), v.number())
  }),
  handler: async (ctx, args) => {
    const events = [] as any[];
    for await (const e of ctx.db
      .query("stateMachineEvents")
      .withIndex("by_hand_and_timestamp", (q) => q.eq("handId", args.handId))) {
      events.push(e);
    }

    const performanceEvents = events.filter(e => e.performanceData);
    const totalProcessingTime = performanceEvents.reduce((sum, e) => sum + (e.performanceData?.processingTimeMs || 0), 0);
    const averageProcessingTime = performanceEvents.length > 0 ? totalProcessingTime / performanceEvents.length : 0;

    // Count events by type
    const eventCounts: Record<string, number> = {};
    events.forEach(e => {
      eventCounts[e.eventType] = (eventCounts[e.eventType] || 0) + 1;
    });

    // Calculate memory and CPU metrics
    const memoryValues = performanceEvents
      .filter(e => e.performanceData?.memoryUsage)
      .map(e => e.performanceData.memoryUsage);
    
    const cpuValues = performanceEvents
      .filter(e => e.performanceData?.cpuTime)
      .map(e => e.performanceData.cpuTime);

    const memoryUsage = memoryValues.length > 0 ? {
      min: Math.min(...memoryValues),
      max: Math.max(...memoryValues),
      average: memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length
    } : undefined;

    const cpuTime = cpuValues.length > 0 ? {
      min: Math.min(...cpuValues),
      max: Math.max(...cpuValues),
      average: cpuValues.reduce((sum, val) => sum + val, 0) / cpuValues.length
    } : undefined;

    return {
      totalActions: events.filter(e => e.eventType === 'action_processed').length,
      averageProcessingTime,
      totalProcessingTime,
      memoryUsage,
      cpuTime,
      eventCounts
    };
  },
});


