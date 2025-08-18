import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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


