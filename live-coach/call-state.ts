/**
 * CallState Durable Object.
 *
 * One DO instance per active call. Survives the full 60-90 min call window
 * because DOs hibernate cheaply between WebSocket messages and persist their
 * state to local storage on every mutation. Holds:
 *   - prospect metadata (name, email, phone)
 *   - the funnel state (current stage, beliefs covered)
 *   - the running utterance log (assembled into the end-of-call transcript)
 *   - the active objection (last objection raised — stays live until reset)
 *   - the list of phone-view WebSockets that get every guidance push
 *   - the bot id Recall handed us when we started the call
 *
 * Three entry points from worker.ts:
 *   POST  /init             — set up call state at call-start
 *   ANY   /recall-ws        — WebSocket Recall connects to with transcript.data
 *   ANY   /coach-ws         — WebSocket Lauren's phone connects to
 *   GET   /state            — snapshot for polling fallback
 *   POST  /end              — assemble transcript, write review, push to GHL
 *   POST  /set-stage        — advance funnel stage manually
 *   POST  /mark-belief      — tick off a DISCOVERY belief manually
 *
 * Routing inside the DO is fetch-handler based — `worker.ts` does
 * `stub.fetch(url, init)` and we dispatch on `pathname`.
 */

import {
  analyzeKeyword,
  KeywordResult,
  STAGES,
  DISCOVER_ORDER,
  DISCOVER_LETTER,
  BELIEF_LABEL,
  Objection,
  Match,
} from "./engine/keyword";
import { runSmart, SmartContext } from "./engine/smart";
import { writeReview, assembleTranscript, Utterance } from "./review-writer";
import { pushReviewToGHL } from "./ghl-client";

export interface Env {
  CALL_STATE: DurableObjectNamespace;
  ANTHROPIC_API_KEY: string;
  RECALL_API_KEY: string;
  RECALL_WEBHOOK_TOKEN: string;
  GHL_API_KEY: string;
  GHL_LOCATION_ID: string;
}

interface InitPayload {
  callId: string;
  meetingUrl: string;
  prospect: { name: string; email?: string; phone?: string; business?: string; goal?: string };
  recallBotId?: string;
  smartMode?: boolean;
}

interface PersistedState {
  callId: string;
  meetingUrl: string;
  prospect: InitPayload["prospect"];
  recallBotId?: string;
  stage: string;
  beliefsCovered: Record<string, boolean>;
  handledObjections: string[];
  activeObjection: Objection | null;
  utterances: Utterance[];
  liveFacts: string;
  startedAt: number;
  endedAt?: number;
  smartMode: boolean;
}

/** Guidance message pushed to every phone-view WebSocket. */
interface GuidanceMessage {
  type: "guidance";
  utterance: { speaker: string; text: string; timestamp: number };
  result: KeywordResult;
  showRetie: boolean;
  activeObjection: Objection | null;
  stage: string;
  beliefsCovered: Record<string, boolean>;
  smart?: { ok: boolean; text: string; error?: string };
}

interface StageMessage {
  type: "stage";
  stage: string;
  beliefsCovered: Record<string, boolean>;
}

interface HelloMessage {
  type: "hello";
  callId: string;
  prospect: InitPayload["prospect"];
  stage: string;
  beliefsCovered: Record<string, boolean>;
  recentGuidance: GuidanceMessage[];
  startedAt: number;
}

interface EndMessage {
  type: "end";
  review: string;
  ghl: { ok: boolean; contactId?: string; reason?: string } | null;
}

export class CallState {
  private state: DurableObjectState;
  private env: Env;
  private persisted: PersistedState | null = null;
  private coachSockets: Set<WebSocket> = new Set();
  private recallSocket: WebSocket | null = null;
  /** Last ~25 guidance pushes — replayed to a phone that reconnects mid-call. */
  private guidanceBuffer: GuidanceMessage[] = [];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    try {
      await this.load();
      switch (url.pathname) {
        case "/init":
          return await this.handleInit(request);
        case "/recall-ws":
          return this.handleRecallWS(request);
        case "/coach-ws":
          return this.handleCoachWS(request);
        case "/state":
          return this.handleSnapshot();
        case "/end":
          return await this.handleEnd(request);
        case "/set-stage":
          return await this.handleSetStage(request);
        case "/mark-belief":
          return await this.handleMarkBelief(request);
        default:
          return new Response("not found", { status: 404 });
      }
    } catch (e) {
      console.error("CallState.fetch error:", (e as Error).message, (e as Error).stack);
      return new Response(`internal error: ${(e as Error).message}`, { status: 500 });
    }
  }

  // ── persistence ────────────────────────────────────────────────────────

  private async load() {
    if (this.persisted) return;
    const saved = await this.state.storage.get<PersistedState>("state");
    if (saved) this.persisted = saved;
  }

  private async save() {
    if (this.persisted) await this.state.storage.put("state", this.persisted);
  }

  // ── /init ──────────────────────────────────────────────────────────────

  private async handleInit(request: Request): Promise<Response> {
    if (request.method !== "POST") return new Response("method", { status: 405 });
    const body = (await request.json()) as InitPayload;
    if (!body.callId || !body.meetingUrl || !body.prospect?.name) {
      return new Response("missing callId, meetingUrl, or prospect.name", { status: 400 });
    }
    // Initialise if first time; otherwise just refresh the bot id / prospect.
    if (!this.persisted) {
      this.persisted = {
        callId: body.callId,
        meetingUrl: body.meetingUrl,
        prospect: body.prospect,
        recallBotId: body.recallBotId,
        stage: STAGES[0].id,
        beliefsCovered: {},
        handledObjections: [],
        activeObjection: null,
        utterances: [],
        liveFacts: "",
        startedAt: Date.now(),
        smartMode: body.smartMode !== false, // default on
      };
    } else {
      this.persisted.prospect = body.prospect;
      this.persisted.recallBotId = body.recallBotId || this.persisted.recallBotId;
      this.persisted.meetingUrl = body.meetingUrl;
      if (body.smartMode !== undefined) this.persisted.smartMode = body.smartMode;
    }
    await this.save();
    return Response.json({ ok: true, callId: this.persisted.callId, startedAt: this.persisted.startedAt });
  }

  // ── /recall-ws — Recall bot connects here with transcript.data ────────

  private handleRecallWS(request: Request): Response {
    const upgradeHeader = request.headers.get("upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    if (!this.persisted) {
      return new Response("call not initialised", { status: 400 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.recallSocket = server;

    server.addEventListener("message", async (ev: MessageEvent) => {
      try {
        const raw = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data as ArrayBuffer);
        const msg = JSON.parse(raw) as RecallTranscriptEvent;
        await this.handleTranscript(msg);
      } catch (e) {
        console.error("recall-ws message parse error:", (e as Error).message);
      }
    });
    server.addEventListener("close", () => {
      if (this.recallSocket === server) this.recallSocket = null;
    });
    server.addEventListener("error", (e) => {
      console.error("recall-ws error:", e);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  // ── /coach-ws — phone view connects here ──────────────────────────────

  private handleCoachWS(request: Request): Response {
    const upgradeHeader = request.headers.get("upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    if (!this.persisted) return new Response("call not initialised", { status: 400 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.coachSockets.add(server);

    // hello payload: prospect + funnel + recent guidance (replay on reconnect)
    const hello: HelloMessage = {
      type: "hello",
      callId: this.persisted.callId,
      prospect: this.persisted.prospect,
      stage: this.persisted.stage,
      beliefsCovered: this.persisted.beliefsCovered,
      recentGuidance: this.guidanceBuffer.slice(-10),
      startedAt: this.persisted.startedAt,
    };
    server.send(JSON.stringify(hello));

    server.addEventListener("message", async (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(typeof ev.data === "string" ? ev.data : "{}") as PhoneInbound;
        if (msg.type === "set-stage" && msg.stage) await this.applyStageChange(msg.stage);
        else if (msg.type === "mark-belief" && msg.belief) await this.toggleBelief(msg.belief);
        else if (msg.type === "live-facts" && typeof msg.text === "string") {
          this.persisted!.liveFacts = msg.text;
          await this.save();
        }
      } catch (e) {
        console.error("coach-ws message parse error:", (e as Error).message);
      }
    });
    server.addEventListener("close", () => this.coachSockets.delete(server));
    server.addEventListener("error", () => this.coachSockets.delete(server));

    return new Response(null, { status: 101, webSocket: client });
  }

  // ── Transcript pipeline ───────────────────────────────────────────────

  private async handleTranscript(msg: RecallTranscriptEvent) {
    if (msg.event !== "transcript.data") return;
    const wordsArr = msg.data?.data?.words || [];
    if (!wordsArr.length) return;
    const text = wordsArr.map((w) => w.text).join(" ").trim();
    if (!text) return;

    // Treat anything Recall labels as host/Lauren as not-prospect. Only
    // prospect lines drive the keyword engine — Lauren coaching herself isn't
    // the methodology's input. (Both sides land in the transcript for the
    // end-of-call review though.)
    const participant = msg.data?.data?.participant;
    const speakerName = participant?.name || (participant?.is_host ? "host" : "prospect");
    const isProspect = !participant?.is_host && speakerName.toLowerCase() !== "lauren tickner" && speakerName.toLowerCase() !== "host";
    const ts = wordsArr[0]?.start_timestamp?.relative ?? this.relativeSeconds();

    const utt: Utterance = { speaker: isProspect ? "prospect" : speakerName, text, timestamp: ts };
    this.persisted!.utterances.push(utt);

    if (!isProspect) {
      await this.save();
      return; // Don't analyse Lauren's own speech for objections/flags.
    }

    const result = analyzeKeyword(text);
    const showRetie = this.persisted!.handledObjections.length > 0 && result.objections.length > 0;
    for (const m of result.objections) {
      if (!this.persisted!.handledObjections.includes(m.item.label)) {
        this.persisted!.handledObjections.push(m.item.label);
      }
    }
    if (result.objections.length) this.persisted!.activeObjection = result.objections[0].item;
    for (const m of result.flags) {
      if (DISCOVER_ORDER.includes(m.item.belief)) this.persisted!.beliefsCovered[m.item.belief] = true;
    }

    const guidance: GuidanceMessage = {
      type: "guidance",
      utterance: utt,
      result,
      showRetie,
      activeObjection: this.persisted!.activeObjection,
      stage: this.persisted!.stage,
      beliefsCovered: this.persisted!.beliefsCovered,
    };
    this.broadcastGuidance(guidance);
    await this.save();

    // Smart-mode overlay — fire and forget; the phone gets it as a follow-up.
    if (this.persisted!.smartMode && this.env.ANTHROPIC_API_KEY) {
      void this.runSmartOverlay(text, result);
    }
  }

  private async runSmartOverlay(text: string, result: KeywordResult) {
    const ctx: SmartContext = {
      stage: this.persisted!.stage,
      prospect: this.persisted!.prospect,
      liveFacts: this.persisted!.liveFacts,
      recent: this.persisted!.utterances
        .filter((u) => u.speaker === "prospect")
        .slice(-7, -1)
        .map((u) => ({
          text: u.text,
          matchedLabels: [], // we don't store per-utterance matches; recent context is the words themselves
        })),
    };
    const smart = await runSmart(this.env.ANTHROPIC_API_KEY, text, ctx, result);
    const msg: SmartOverlayMessage = {
      type: "smart",
      text: smart.text,
      ok: smart.ok,
      error: smart.error,
      forUtteranceAt: result.objections[0]?.item.id || result.flags[0]?.item.id || "",
    };
    this.broadcast(msg);
  }

  private broadcastGuidance(msg: GuidanceMessage) {
    this.guidanceBuffer.push(msg);
    if (this.guidanceBuffer.length > 50) this.guidanceBuffer.shift();
    this.broadcast(msg);
  }

  private broadcast(msg: object) {
    const payload = JSON.stringify(msg);
    for (const ws of this.coachSockets) {
      try {
        ws.send(payload);
      } catch (e) {
        console.error("coach-ws send failed:", (e as Error).message);
        this.coachSockets.delete(ws);
      }
    }
  }

  // ── /state — snapshot for polling fallback ────────────────────────────

  private handleSnapshot(): Response {
    if (!this.persisted) return new Response("not initialised", { status: 400 });
    return Response.json({
      callId: this.persisted.callId,
      prospect: this.persisted.prospect,
      stage: this.persisted.stage,
      beliefsCovered: this.persisted.beliefsCovered,
      activeObjection: this.persisted.activeObjection,
      handledObjections: this.persisted.handledObjections,
      utterancesCount: this.persisted.utterances.length,
      recentGuidance: this.guidanceBuffer.slice(-10),
      startedAt: this.persisted.startedAt,
      endedAt: this.persisted.endedAt,
    });
  }

  // ── /set-stage + /mark-belief ─────────────────────────────────────────

  private async handleSetStage(request: Request): Promise<Response> {
    const body = (await request.json()) as { stage?: string };
    if (!body.stage) return new Response("missing stage", { status: 400 });
    await this.applyStageChange(body.stage);
    return Response.json({ ok: true, stage: this.persisted!.stage });
  }

  private async applyStageChange(stage: string) {
    const valid = STAGES.find((s) => s.id === stage);
    if (!valid) return;
    this.persisted!.stage = valid.id;
    await this.save();
    const msg: StageMessage = {
      type: "stage",
      stage: this.persisted!.stage,
      beliefsCovered: this.persisted!.beliefsCovered,
    };
    this.broadcast(msg);
  }

  private async handleMarkBelief(request: Request): Promise<Response> {
    const body = (await request.json()) as { belief?: string };
    if (!body.belief) return new Response("missing belief", { status: 400 });
    await this.toggleBelief(body.belief);
    return Response.json({ ok: true, beliefsCovered: this.persisted!.beliefsCovered });
  }

  private async toggleBelief(belief: string) {
    if (!DISCOVER_ORDER.includes(belief)) return;
    this.persisted!.beliefsCovered[belief] = !this.persisted!.beliefsCovered[belief];
    await this.save();
    const msg: StageMessage = {
      type: "stage",
      stage: this.persisted!.stage,
      beliefsCovered: this.persisted!.beliefsCovered,
    };
    this.broadcast(msg);
  }

  // ── /end — assemble transcript, review, push to GHL ───────────────────

  private async handleEnd(request: Request): Promise<Response> {
    if (!this.persisted) return new Response("not initialised", { status: 400 });
    const body = (await request.json().catch(() => ({}))) as { outcome?: string; outcomeNotes?: string };
    this.persisted.endedAt = Date.now();
    await this.save();

    const transcript = assembleTranscript(this.persisted.utterances);
    const review = await writeReview(this.env.ANTHROPIC_API_KEY, {
      prospectName: this.persisted.prospect.name,
      date: new Date().toISOString().slice(0, 10),
      outcome: body.outcome,
      outcomeNotes: body.outcomeNotes,
      transcript,
    });

    let ghlResult: { ok: boolean; contactId?: string; reason?: string } | null = null;
    if (review.ok && this.env.GHL_API_KEY && this.env.GHL_LOCATION_ID) {
      ghlResult = await pushReviewToGHL(
        { GHL_API_KEY: this.env.GHL_API_KEY, GHL_LOCATION_ID: this.env.GHL_LOCATION_ID },
        {
          name: this.persisted.prospect.name,
          email: this.persisted.prospect.email,
          phone: this.persisted.prospect.phone,
          outcome: body.outcome,
        },
        review.markdown,
      );
    }

    const endMsg: EndMessage = {
      type: "end",
      review: review.ok ? review.markdown : `Review failed: ${review.error}`,
      ghl: ghlResult,
    };
    this.broadcast(endMsg);
    // Drop coach websockets after end — call is done.
    for (const ws of this.coachSockets) {
      try {
        ws.close(1000, "call ended");
      } catch {
        /* noop */
      }
    }
    this.coachSockets.clear();

    return Response.json({
      ok: review.ok,
      review: review.markdown,
      reviewError: review.error,
      ghl: ghlResult,
      transcriptChars: transcript.length,
    });
  }

  // ── helpers ───────────────────────────────────────────────────────────

  private relativeSeconds(): number {
    return (Date.now() - this.persisted!.startedAt) / 1000;
  }
}

// ── shared types ───────────────────────────────────────────────────────

interface RecallWord {
  text: string;
  start_timestamp?: { relative: number };
  end_timestamp?: { relative: number };
}
interface RecallParticipant {
  id: number;
  name?: string | null;
  is_host?: boolean;
  email?: string | null;
}
interface RecallTranscriptEvent {
  event: string;
  data?: {
    data?: { words?: RecallWord[]; participant?: RecallParticipant; language_code?: string };
    bot?: { id: string };
  };
}

interface SmartOverlayMessage {
  type: "smart";
  text: string;
  ok: boolean;
  error?: string;
  forUtteranceAt: string;
}

type PhoneInbound =
  | { type: "set-stage"; stage: string }
  | { type: "mark-belief"; belief: string }
  | { type: "live-facts"; text: string };

// keep these exports so other modules can reference shared types
export type { GuidanceMessage, HelloMessage, EndMessage, StageMessage };
export { DISCOVER_LETTER, BELIEF_LABEL, DISCOVER_ORDER };
