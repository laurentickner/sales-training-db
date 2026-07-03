/**
 * live-coach Cloudflare Worker — routes for the live sales-call copilot.
 *
 *  POST /start-call           → spawn a Recall bot for a Meet URL, return coachUrl + callId
 *  POST /end-call             → ask the DO to write the review + push to GHL
 *  GET  /coach/:callId        → phone view HTML (CF Access in front)
 *  GET  /coach/:callId/ws     → phone-view WebSocket (DO fans guidance out here)
 *  GET  /coach/:callId/state  → snapshot for the polling fallback
 *  POST /coach/:callId/stage  → manual stage advance from the phone
 *  POST /coach/:callId/belief → manual DISCOVERY tick from the phone
 *  GET  /recall-ws            → WebSocket the Recall bot connects to (token-authed)
 *
 *  GET  /healthz              → liveness probe
 *  GET  /coach-view/*         → static phone-view assets (HTML+JS)
 */

import { CallState, Env } from "./call-state";

import COACH_HTML from "./coach-view/index.html";
import COACH_JS from "./coach-view/coach.js";

export { CallState };

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    try {
      // ─── Health ──────────────────────────────────────────────────
      if (url.pathname === "/healthz") {
        return new Response("ok", { status: 200 });
      }

      // ─── Static phone-view assets ────────────────────────────────
      if (url.pathname === "/coach-view/coach.js") {
        return new Response(COACH_JS, {
          status: 200,
          headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-cache" },
        });
      }

      // ─── /start-call ─────────────────────────────────────────────
      if (url.pathname === "/start-call" && request.method === "POST") {
        return await startCall(request, env);
      }

      // ─── /end-call ───────────────────────────────────────────────
      if (url.pathname === "/end-call" && request.method === "POST") {
        return await endCall(request, env);
      }

      // ─── /recall-ws — the bot connects here ──────────────────────
      if (url.pathname === "/recall-ws") {
        return await recallWebhookWS(request, env, url);
      }

      // ─── /coach/:callId* ─────────────────────────────────────────
      const coachMatch = url.pathname.match(/^\/coach\/([^/]+)(\/(ws|state|stage|belief))?$/);
      if (coachMatch) {
        const callId = decodeURIComponent(coachMatch[1]);
        const sub = coachMatch[3];
        return await coachRoutes(request, env, callId, sub);
      }

      return new Response("not found", { status: 404 });
    } catch (e) {
      console.error("worker fetch error:", (e as Error).message, (e as Error).stack);
      return new Response(`internal error: ${(e as Error).message}`, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

// ─── handlers ───────────────────────────────────────────────────────

interface StartCallBody {
  meetingUrl: string;
  prospect: { name: string; email?: string; phone?: string; business?: string; goal?: string };
  smartMode?: boolean;
  /** Optional override for the externally visible Worker hostname. */
  publicHost?: string;
}

async function startCall(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as StartCallBody;
  if (!body.meetingUrl || !body.prospect?.name) {
    return new Response("missing meetingUrl or prospect.name", { status: 400 });
  }
  if (!env.RECALL_API_KEY) return new Response("RECALL_API_KEY not configured", { status: 500 });
  if (!env.RECALL_WEBHOOK_TOKEN) return new Response("RECALL_WEBHOOK_TOKEN not configured", { status: 500 });

  const callId = crypto.randomUUID();
  const reqUrl = new URL(request.url);
  const publicHost = body.publicHost || reqUrl.host;
  const wsScheme = reqUrl.protocol === "http:" ? "ws" : "wss";
  // Recall will reach us at this URL. Token authenticates the connection;
  // callId tells the worker which DO to route to.
  const recallTargetUrl = `${wsScheme}://${publicHost}/recall-ws?token=${encodeURIComponent(env.RECALL_WEBHOOK_TOKEN)}&callId=${encodeURIComponent(callId)}`;

  // Spawn the Recall bot.
  const recallBody = {
    meeting_url: body.meetingUrl,
    bot_name: "Sales Copilot",
    recording_config: {
      transcript: {
        provider: {
          deepgram_streaming: { language_code: "en" },
        },
      },
      realtime_endpoints: [
        {
          type: "websocket",
          url: recallTargetUrl,
          events: ["transcript.data"],
        },
      ],
    },
  };

  let recallBotId: string | undefined;
  try {
    const r = await fetch("https://us-east-1.recall.ai/api/v1/bot/", {
      method: "POST",
      headers: {
        Authorization: `Token ${env.RECALL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(recallBody),
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error(`Recall create-bot HTTP ${r.status}: ${txt.slice(0, 400)}`);
      return new Response(`Recall.ai rejected the bot create: ${r.status} ${txt.slice(0, 200)}`, { status: 502 });
    }
    const j = (await r.json()) as { id?: string };
    recallBotId = j.id;
  } catch (e) {
    console.error("Recall create-bot threw:", (e as Error).message);
    return new Response(`Recall.ai unreachable: ${(e as Error).message}`, { status: 502 });
  }

  // Initialise the DO.
  const stub = env.CALL_STATE.get(env.CALL_STATE.idFromName(callId));
  const initResp = await stub.fetch("https://do/init", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      callId,
      meetingUrl: body.meetingUrl,
      prospect: body.prospect,
      recallBotId,
      smartMode: body.smartMode !== false,
    }),
  });
  if (!initResp.ok) {
    const txt = await initResp.text();
    return new Response(`CallState init failed: ${initResp.status} ${txt}`, { status: 500 });
  }

  const coachUrl = `${reqUrl.protocol}//${publicHost}/coach/${encodeURIComponent(callId)}`;
  return Response.json({
    ok: true,
    callId,
    coachUrl,
    recallBotId,
  });
}

interface EndCallBody {
  callId: string;
  outcome?: string;
  outcomeNotes?: string;
}

async function endCall(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as EndCallBody;
  if (!body.callId) return new Response("missing callId", { status: 400 });
  const stub = env.CALL_STATE.get(env.CALL_STATE.idFromName(body.callId));
  const r = await stub.fetch("https://do/end", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ outcome: body.outcome, outcomeNotes: body.outcomeNotes }),
  });
  return new Response(r.body, { status: r.status, headers: r.headers });
}

async function recallWebhookWS(request: Request, env: Env, url: URL): Promise<Response> {
  // Recall connects with `?token=...&callId=...`. Validate the token before
  // forwarding to the DO so a random WebSocket can't pollute call state.
  const token = url.searchParams.get("token");
  const callId = url.searchParams.get("callId");
  if (!token || token !== env.RECALL_WEBHOOK_TOKEN) {
    console.error("recall-ws rejected: bad token");
    return new Response("forbidden", { status: 403 });
  }
  if (!callId) return new Response("missing callId", { status: 400 });
  const stub = env.CALL_STATE.get(env.CALL_STATE.idFromName(callId));
  // Hand the upgrade off to the DO unchanged — the DO accepts the WS pair.
  return stub.fetch(new Request("https://do/recall-ws", request));
}

async function coachRoutes(request: Request, env: Env, callId: string, sub: string | undefined): Promise<Response> {
  if (!sub) {
    // Phone view HTML — bake the callId into the page so coach.js can pick it up.
    if (request.method !== "GET") return new Response("method", { status: 405 });
    const html = (COACH_HTML as string).replace(/__CALL_ID__/g, escapeHtml(callId));
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" },
    });
  }
  const stub = env.CALL_STATE.get(env.CALL_STATE.idFromName(callId));
  if (sub === "ws") {
    return stub.fetch(new Request("https://do/coach-ws", request));
  }
  if (sub === "state") {
    return stub.fetch("https://do/state");
  }
  if (sub === "stage") {
    return stub.fetch(new Request("https://do/set-stage", request));
  }
  if (sub === "belief") {
    return stub.fetch(new Request("https://do/mark-belief", request));
  }
  return new Response("not found", { status: 404 });
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c] as string);
}
