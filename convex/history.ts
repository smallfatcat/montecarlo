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
  args: { paginationOpts: paginationOptsValidator },
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
    const byTableSeq = ctx.db
      .query("hands")
      .withIndex("by_table_and_seq", (q) => q)
      .order("desc");
    const page = await byTableSeq.take(args.paginationOpts.numItems ?? 20);
    return {
      page: page.map((h) => ({
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


