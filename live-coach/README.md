# Live Coach — Sales Call Copilot (Phase 2)

The static SPA at [`app/`](../app) is the rep's desk-side training tool: paste a
prospect line, get a card back. This subsystem adds the **live** layer Lauren
asked for in the original architectural plan:

> Doesn't join Meet/Zoom live. That's the next build — Recall.ai bot +
> Cloudflare Durable Objects + Deepgram streaming.

A Recall.ai bot joins the Meet/Zoom call as a participant, streams the
prospect's speech to Deepgram (baked into Recall — no separate account),
forwards every finalised utterance to a Cloudflare Worker, which routes it to a
per-call Durable Object that runs the same keyword + smart engine the SPA uses
today and pushes guidance to a phone view Lauren keeps open in her hand.

**The methodology JSON in [`app-data/`](../app-data) is the single source of
truth** — no methodology is baked into the worker code. The keyword engine in
[`engine/keyword.ts`](engine/keyword.ts) is a byte-for-byte port of
[`app/app.js`](../app/app.js)'s `analyzeKeyword` so the live system and the
desk-side SPA always agree on what counts as an objection or a flag.

## Data flow

```
                                    ┌───────────────────────────────────────┐
                                    │  Google Meet / Zoom call              │
                                    │  (Lauren ↔ Prospect)                  │
                                    └────────────────────┬──────────────────┘
                                                         │  joined as
                                                         │  participant
                                                         ▼
                                    ┌───────────────────────────────────────┐
                                    │  Recall.ai bot                        │
                                    │  • Deepgram streaming (built-in)      │
                                    │  • Diarised, finalised utterances     │
                                    └────────────────────┬──────────────────┘
                                                         │ outbound wss://
                                                         │ {"event":"transcript.data", ...}
                                                         ▼
       Lauren's phone                ┌───────────────────────────────────────┐
       ┌───────────────┐             │  Cloudflare Worker (live-coach)       │
       │ /coach/:id    │             │  routes:                              │
       │ mobile UI     │             │   POST /start-call                    │
       │ stage chip    │             │   GET  /recall-ws    (Recall → us)    │
       │ guidance card │   wss://    │   GET  /coach/:id                     │
       │ DISCOVERY     │◀───────────▶│   GET  /coach/:id/ws                  │
       │ live obj.     │             │   POST /end-call                      │
       └───────────────┘             └────────────────────┬──────────────────┘
                                                         │ DO stub by callId
                                                         ▼
                                    ┌───────────────────────────────────────┐
                                    │  CallState Durable Object             │
                                    │  • holds transcript, funnel state,    │
                                    │    beliefs covered, objections        │
                                    │  • runs keyword.analyze() per         │
                                    │    utterance                          │
                                    │  • optionally calls Anthropic for     │
                                    │    smart "READ:/WHY:" guidance        │
                                    │  • fans out guidance to all coach     │
                                    │    WebSockets                         │
                                    │  • on /end-call: generates the call   │
                                    │    review (Claude) and pushes it to   │
                                    │    GoHighLevel as a Contact + Note    │
                                    └───────────────────────────────────────┘
                                                         │
                                                         ▼
                                    ┌───────────────────────────────────────┐
                                    │  GoHighLevel (sub-account)            │
                                    │  • upsert Contact (email or phone)    │
                                    │  • POST Note (markdown review)        │
                                    │  • custom field call_outcome          │
                                    └───────────────────────────────────────┘
```

## Latency budget

Every utterance → guidance round trip must land on Lauren's phone in **under
1.5 seconds**.

| Hop                                | Budget   |
|------------------------------------|----------|
| Deepgram finalises an utterance    | ~400 ms  |
| Recall → Worker WebSocket          | ~100 ms  |
| Keyword engine                     | <5 ms    |
| Worker → phone WebSocket           | ~100 ms  |
| Phone DOM render                   | <50 ms   |
| **Total (no smart mode)**          | **~650 ms** |
| Smart mode (Claude Haiku) overlay  | +800 ms  |

Smart-mode guidance arrives a beat after the keyword card — same pattern as the
SPA today.

## What's in this directory

| File                               | Purpose |
|------------------------------------|---------|
| `worker.ts`                        | CF Worker entry — all routes |
| `call-state.ts`                    | `CallState` Durable Object class |
| `engine/keyword.ts`                | Port of `app/app.js` keyword engine |
| `engine/smart.ts`                  | Server-side Claude smart-mode call |
| `review-writer.ts`                 | End-of-call markdown review (Claude) |
| `ghl-client.ts`                    | GoHighLevel Contact + Note + outcome |
| `coach-view/index.html`            | Phone view shell |
| `coach-view/coach.js`              | Phone view WebSocket client |
| `wrangler.toml`                    | DO binding + routes + env |
| `package.json`, `tsconfig.json`    | Build config |

The methodology JSON in `app-data/*.json` is imported directly by the engine
modules — wrangler bundles it into the Worker at deploy time. To update the
methodology, edit the JSON and redeploy. Both this Worker and the static SPA
read the same files, so they cannot drift.

## Local development

```bash
cd live-coach
npm install
npm run dev   # wrangler dev — local Worker + DO simulation
```

The Recall.ai bot can't reach `localhost`, so to test end-to-end you either:

1. Use `wrangler dev --remote` to get a public `*.workers.dev` URL, or
2. Use `cloudflared tunnel --url http://localhost:8787` to tunnel a public
   URL into your local Worker, and pass that URL to `realtime_endpoints[].url`
   when starting the call.

For UI-only iteration on the phone view you can hit
`http://localhost:8787/coach/test-call-id` directly — the page will connect to
the local Worker's WebSocket and you can fake transcript events via
`curl -X POST http://localhost:8787/recall-ws-test`.

## Deploy runbook

Once Lauren has the credentials in hand:

```bash
cd live-coach

# One-time: log in to Cloudflare
npx wrangler login

# Set secrets (the repo never sees them)
npx wrangler secret put RECALL_API_KEY        # paste Recall token
npx wrangler secret put ANTHROPIC_API_KEY     # for smart mode + review
npx wrangler secret put RECALL_WEBHOOK_TOKEN  # any long random string — used to authenticate the bot's WS to us
npx wrangler secret put GHL_API_KEY           # GHL sub-account Private Integration Token
npx wrangler secret put GHL_LOCATION_ID       # GHL Location ID (sub-account)

# Deploy
npm run deploy
```

The Worker is deployed at `sales-coach.<your-account>.workers.dev` by default.
To put it behind the same Cloudflare Access policy as the static SPA, either:

- (Simpler) Add a Workers route under the existing `sales-training-db.pages.dev`
  zone (`/live-coach/*`) and re-use the existing CF Access policy, OR
- (Cleaner) Add a custom domain `coach.scalesystems.io` to the Worker and apply
  a new Access policy.

The phone view at `GET /coach/:callId` returns an HTML page; the CF Access
gate sits in front of it the same way it sits in front of `app/index.html`
today.

## How a call runs end-to-end

1. **Pre-call.** Lauren opens the existing SPA, fills in the Prep tab for the
   prospect, gets the Claude-generated brief. Nothing changes here.
2. **Start the call.** Lauren joins the Meet. From the SPA (or any HTTP
   client), she POSTs:

   ```bash
   curl -X POST https://sales-coach.<acct>.workers.dev/start-call \
        -H 'content-type: application/json' \
        -d '{
          "meetingUrl": "https://meet.google.com/abc-defg-hij",
          "prospect":   { "name": "Jordan Lee", "email": "jordan@acme.com" }
        }'
   ```

   The Worker creates a Recall bot pointing at `wss://.../recall-ws?token=...&callId=...`,
   returns `{ "callId": "...", "coachUrl": "https://.../coach/..." }`. The bot
   joins the Meet within ~10 seconds.
3. **During the call.** Lauren opens `coachUrl` on her phone (CF Access
   authenticates her once). Every finalised prospect utterance hits the DO,
   gets analyzed, and a guidance card lands on the phone. The phone view
   doesn't capture audio — it's read-only.
4. **End the call.** Lauren leaves the Meet, then either:
   - taps **End call** in the phone view, or
   - POSTs `/end-call` with `{ callId, outcome, outcomeNotes }`.

   The DO assembles the full transcript, calls Claude Sonnet to write the
   markdown review (same shape as
   [`app-data/_review/call-jason-rosado-2026-05-19.md`](../app-data/_review/call-jason-rosado-2026-05-19.md)),
   and pushes it to GoHighLevel as a Note on the prospect's contact record
   with `call_outcome` set.

## What this does NOT change

- The static SPA at `app/` is untouched. The new Worker is a separate deploy.
- The methodology JSON in `app-data/` is read by both — neither owns it.
- The existing post-call review (paste-the-transcript flow in the SPA modal)
  still works exactly as it did before — it's a backstop for calls where the
  live bot wasn't running.

## Travel-mode reliability

Lauren takes calls from the road. The phone view is designed for cellular:

- Initial HTML is ~6 KB gzipped, all inline CSS — no external font, no CDN.
- WebSocket auto-reconnects with exponential backoff and replays missed
  guidance from the DO's in-memory log.
- The Worker runs at the Cloudflare edge closest to Lauren, so latency
  is geography-resilient.
- If the WebSocket dies entirely, the phone falls back to a 3-second poll of
  `GET /coach/:callId/state` so guidance still flows, just slower.

## Known limits / not in scope

- No participant-side audio playback. The bot is silent — prospects see "Sales
  Copilot" join but the bot says nothing.
- Recall's free trial is rate-limited — production volume needs a paid plan.
- Smart-mode runs Claude Haiku for ~$0.001/utterance. A 60-min call averages
  ~40 utterances → ~$0.04/call. The end-of-call review uses Sonnet for one
  call → ~$0.03. Total per-call AI cost ≈ $0.07.
- This worker does not (yet) transcribe Lauren's own speech — only the
  prospect's. The keyword engine fires on prospect language, which is what the
  methodology indexes anyway. A future iteration can opt-in Lauren's side for
  self-review.
