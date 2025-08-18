import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const ensureIdempotent = async (ctx: any, eventId: string) => {
  const prior = await ctx.db
    .query("ingestEvents")
    .withIndex("by_source_and_eventId", (q: any) => q.eq("source", "game-server").eq("eventId", eventId))
    .unique();
  if (prior) return false;
  await ctx.db.insert("ingestEvents", { source: "game-server", eventId, receivedAt: Date.now() });
  return true;
};

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
    // Seed participants for this hand from current table participants (active rows)
    for await (const p of ctx.db
      .query("participants")
      .withIndex("by_table_and_active", (q: any) => q.eq("tableId", table!._id).eq("leftAt", null))) {
      await ctx.db.insert("handParticipants", { handId: handIdDoc, userId: p.userId })
    }
    return null;
  },
});

export const action = internalMutation({
  args: {
    eventId: v.string(),
    tableId: v.string(),
    handId: v.number(),
    order: v.number(),
    seatIndex: v.number(),
    street: v.union(
      v.literal("preflop"),
      v.literal("flop"),
      v.literal("turn"),
      v.literal("river"),
      v.literal("showdown"),
    ),
    type: v.string(),
    amount: v.optional(v.number()),
    playerToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const proceed = await ensureIdempotent(ctx, args.eventId);
    if (!proceed) return null;
    let table = await ctx.db
      .query("tables")
      .withIndex("by_tableId", (q: any) => q.eq("tableId", args.tableId))
      .unique();
    if (!table) {
      const tId = await ctx.db.insert("tables", {
        tableId: args.tableId,
        variant: "holdem",
        config: { smallBlind: 0, bigBlind: 0 },
        status: "in_hand",
        createdAt: Date.now(),
      });
      table = await ctx.db.get(tId)
    }
    const tableNonNull = table!
    let hand = await ctx.db
      .query("hands")
      .withIndex("by_table_and_seq", (q: any) => q.eq("tableId", tableNonNull._id).eq("handSeq", args.handId))
      .unique();
    if (!hand) {
      const newId = await ctx.db.insert("hands", {
        tableId: tableNonNull._id,
        handSeq: args.handId,
        seed: 0,
        buttonIndex: 0,
        startedAt: Date.now(),
        endedAt: undefined,
        board: [],
        pots: [],
        results: [],
      })
      hand = await ctx.db.get(newId)
    }
    // Resolve actor user if playerToken given via participants or user lookup
    let actorUserId: any = null
    if (args.playerToken) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_provider_and_subject", (q: any) => q.eq("externalProvider", "game-server").eq("externalSubject", args.playerToken!))
        .unique();
      if (user) actorUserId = user._id
    }
    const handNonNull = hand!
    const doc: any = {
      handId: handNonNull._id,
      order: args.order,
      street: args.street,
      seatIndex: args.seatIndex,
      type: (['fold','check','call','bet','raise'].includes(args.type) ? (args.type as any) : 'check'),
      amount: args.amount,
    }
    if (actorUserId) doc.actorUserId = actorUserId
    await ctx.db.insert("actions", doc);
    // Ensure handParticipants row exists for this user
    if (actorUserId) {
      for await (const hp of ctx.db
        .query("handParticipants")
        .withIndex("by_hand", (q: any) => q.eq("handId", handNonNull._id))) {
        if (hp.userId === actorUserId) return null
      }
      await ctx.db.insert("handParticipants", { handId: handNonNull._id, userId: actorUserId })
    }
    return null;
  },
});

export const handEnded = internalMutation({
  args: {
    eventId: v.string(),
    tableId: v.string(),
    handId: v.number(),
    board: v.array(v.string()),
    results: v.array(
      v.object({ seatIndex: v.number(), playerToken: v.optional(v.string()), delta: v.number() }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const proceed = await ensureIdempotent(ctx, args.eventId);
    if (!proceed) return null;
    let table = await ctx.db
      .query("tables")
      .withIndex("by_tableId", (q: any) => q.eq("tableId", args.tableId))
      .unique();
    if (!table) {
      const tId = await ctx.db.insert("tables", {
        tableId: args.tableId,
        variant: "holdem",
        config: { smallBlind: 0, bigBlind: 0 },
        status: "in_hand",
        createdAt: Date.now(),
      });
      table = await ctx.db.get(tId)
    }
    const tableNonNull2 = table!
    let hand = await ctx.db
      .query("hands")
      .withIndex("by_table_and_seq", (q: any) => q.eq("tableId", tableNonNull2._id).eq("handSeq", args.handId))
      .unique();
    if (!hand) {
      const newId = await ctx.db.insert("hands", {
        tableId: tableNonNull2._id,
        handSeq: args.handId,
        seed: 0,
        buttonIndex: 0,
        startedAt: Date.now(),
        endedAt: undefined,
        board: [],
        pots: [],
        results: [],
      })
      hand = await ctx.db.get(newId)
    }
    // Map results to userIds where possible
    const mappedResults: Array<any> = []
    for (const r of args.results) {
      let userId: any = null
      if (r.playerToken) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_provider_and_subject", (q: any) => q.eq("externalProvider", "game-server").eq("externalSubject", r.playerToken!))
          .unique();
        if (user) userId = user._id
      }
      const result: any = { seatIndex: r.seatIndex, delta: r.delta }
      if (userId) result.userId = userId
      mappedResults.push(result)
    }
    await ctx.db.patch(hand!._id, { board: args.board, endedAt: Date.now(), results: mappedResults });
    return null;
  },
});

export const seat = internalMutation({
  args: {
    eventId: v.string(),
    tableId: v.string(),
    seatIndex: v.number(),
    playerToken: v.string(),
    playerName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const proceed = await ensureIdempotent(ctx, args.eventId);
    if (!proceed) return null;
    // Create or get guest user based on token
    const user = await ctx.db
      .query("users")
      .withIndex("by_provider_and_subject", (q: any) => q.eq("externalProvider", "game-server").eq("externalSubject", args.playerToken))
      .unique();
    const userId = user?._id ?? (await ctx.db.insert("users", { kind: "guest", displayName: args.playerName, externalProvider: "game-server", externalSubject: args.playerToken, createdAt: Date.now() }));
    let table = await ctx.db
      .query("tables")
      .withIndex("by_tableId", (q: any) => q.eq("tableId", args.tableId))
      .unique();
    if (!table) {
      const id = await ctx.db.insert("tables", { tableId: args.tableId, variant: "holdem", config: { smallBlind: 0, bigBlind: 0 }, status: "open", createdAt: Date.now() });
      table = await ctx.db.get(id);
    }
    await ctx.db.insert("participants", { tableId: table!._id, userId: userId, seatIndex: args.seatIndex, joinedAt: Date.now() });
    return null;
  },
});

export const unseat = internalMutation({
  args: {
    eventId: v.string(),
    tableId: v.string(),
    seatIndex: v.number(),
    playerToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const proceed = await ensureIdempotent(ctx, args.eventId);
    if (!proceed) return null;
    const table = await ctx.db
      .query("tables")
      .withIndex("by_tableId", (q: any) => q.eq("tableId", args.tableId))
      .unique();
    if (!table) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_provider_and_subject", (q: any) => q.eq("externalProvider", "game-server").eq("externalSubject", args.playerToken))
      .unique();
    if (!user) return null;
    for await (const p of ctx.db
      .query("participants")
      .withIndex("by_table", (q: any) => q.eq("tableId", table._id))) {
      if (p.userId === user._id && p.seatIndex === args.seatIndex && !p.leftAt) {
        await ctx.db.patch(p._id, { leftAt: Date.now() });
      }
    }
    return null;
  },
});

export const debugCounts = internalQuery({
  args: {},
  returns: v.object({
    users: v.number(),
    tables: v.number(),
    participants: v.number(),
    hands: v.number(),
    actions: v.number(),
  }),
  handler: async (ctx) => {
    let users = 0, tables = 0, participants = 0, hands = 0, actions = 0
    for await (const _ of ctx.db.query("users")) users += 1
    for await (const _ of ctx.db.query("tables")) tables += 1
    for await (const _ of ctx.db.query("participants")) participants += 1
    for await (const _ of ctx.db.query("hands")) hands += 1
    for await (const _ of ctx.db.query("actions")) actions += 1
    return { users, tables, participants, hands, actions }
  },
});

export const deal = internalMutation({
  args: {
    eventId: v.string(),
    tableId: v.string(),
    handId: v.number(),
    street: v.union(v.literal('flop'), v.literal('turn'), v.literal('river')),
    cards: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const proceed = await ensureIdempotent(ctx, args.eventId);
    if (!proceed) return null;
    const table = await ctx.db
      .query("tables")
      .withIndex("by_tableId", (q: any) => q.eq("tableId", args.tableId))
      .unique();
    if (!table) return null;
    const hand = await ctx.db
      .query("hands")
      .withIndex("by_table_and_seq", (q: any) => q.eq("tableId", table._id).eq("handSeq", args.handId))
      .unique();
    if (!hand) return null;
    // Append cards to board
    const prev = hand.board || []
    await ctx.db.patch(hand._id, { board: [...prev, ...args.cards] })
    return null;
  },
})


