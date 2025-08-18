import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

const withIngestAuth = (handler: Parameters<typeof httpAction>[0]) =>
  httpAction(async (ctx, req) => {
    const secret = req.headers.get("x-convex-ingest-secret") || "";
    if (secret !== process.env.INGEST_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    return handler(ctx, req);
  });

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

http.route({
  path: "/ingest/handEnded",
  method: "POST",
  handler: withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.handEnded, body);
    return new Response(null, { status: 204 });
  }),
});

http.route({
  path: "/ingest/seat",
  method: "POST",
  handler: withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.seat, body);
    return new Response(null, { status: 204 });
  }),
});

http.route({
  path: "/ingest/unseat",
  method: "POST",
  handler: withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.unseat, body);
    return new Response(null, { status: 204 });
  }),
});

http.route({
  path: "/ingest/deal",
  method: "POST",
  handler: withIngestAuth(async (ctx, req) => {
    const body = await req.json();
    await ctx.runMutation(internal.ingest.deal, body);
    return new Response(null, { status: 204 });
  }),
});

export default http;


