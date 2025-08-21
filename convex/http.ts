import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { createRateLimitedHandler } from "./rateLimit";

const http = httpRouter();

const withIngestAuth = (handler: Parameters<typeof httpAction>[0]) =>
  async (ctx: any, req: Request) => {
    const secret = req.headers.get("x-convex-ingest-secret") || "";
    
    // Get the secret from the configuration table
    const expectedSecret = await ctx.runQuery(internal.ingest.getConfig, { key: "INSTANCE_SECRET" });
    
    if (!expectedSecret || secret !== expectedSecret) {
      return new Response("Unauthorized", { status: 401 });
    }
    return handler(ctx, req);
  };

http.route({
  path: "/ingest/health",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const counts = await ctx.runQuery(internal.ingest.debugCounts, {})
      return new Response(JSON.stringify({ ok: true, counts }), { status: 200, headers: { "content-type": "application/json" } })
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "content-type": "application/json" } })
    }
  }),
});

http.route({
  path: "/ingest/handStarted",
  method: "POST",
  handler: createRateLimitedHandler('/ingest/handStarted')(withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.handStarted, body);
    return new Response(null, { status: 204 });
  })),
});

http.route({
  path: "/ingest/action",
  method: "POST",
  handler: createRateLimitedHandler('/ingest/action')(withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.action, body);
    return new Response(null, { status: 204 });
  })),
});

http.route({
  path: "/ingest/handEnded",
  method: "POST",
  handler: createRateLimitedHandler('/ingest/handEnded')(withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.handEnded, body);
    return new Response(null, { status: 204 });
  })),
});

http.route({
  path: "/ingest/seat",
  method: "POST",
  handler: createRateLimitedHandler('/ingest/seat')(withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.seat, body);
    return new Response(null, { status: 204 });
  })),
});

http.route({
  path: "/ingest/unseat",
  method: "POST",
  handler: createRateLimitedHandler('/ingest/unseat')(withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.unseat, body);
    return new Response(null, { status: 204 });
  })),
});

http.route({
  path: "/ingest/deal",
  method: "POST",
  handler: createRateLimitedHandler('/ingest/deal')(withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.deal, body);
    return new Response(null, { status: 204 });
  })),
});

// New HTTP endpoints for state machine integration
http.route({
  path: "/ingest/stateMachineEvent",
  method: "POST",
  handler: createRateLimitedHandler('/ingest/stateMachineEvent')(withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.stateMachineEvent, body);
    return new Response(null, { status: 204 });
  })),
});

http.route({
  path: "/ingest/gameStateSnapshot",
  method: "POST",
  handler: createRateLimitedHandler('/ingest/gameStateSnapshot')(withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.gameStateSnapshot, body);
    return new Response(null, { status: 204 });
  })),
});

http.route({
  path: "/ingest/potHistoryEvent",
  method: "POST",
  handler: createRateLimitedHandler('/ingest/potHistoryEvent')(withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.potHistoryEvent, body);
    return new Response(null, { status: 204 });
  })),
});

export default http;


