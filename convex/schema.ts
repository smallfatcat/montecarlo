import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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

  ingestEvents: defineTable({
    source: v.literal("game-server"),
    eventId: v.string(),
    receivedAt: v.number(),
  }).index("by_source_and_eventId", ["source", "eventId"]),
});


