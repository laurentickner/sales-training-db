# Scale Systems Sales Call Copilot — Onboarding

A live sales-call copilot for Scale Systems. Encodes Cole Gordon + Ravi Abuvala
methodology over Lauren's master sales script. Per-prospect prep before the
call, live coaching during, outcome tracking after.

## Quick start (local)

```bash
gh repo clone laurentickner/sales-training-db
cd sales-training-db/app
python3 -m http.server 8770
```

Then open **http://localhost:8770** in your browser. No build step, no deps.

## Hosted version

Once Cloudflare Pages is connected (see `netlify.toml`), the app lives at a
public `https://` URL — no local server needed.

## Smart mode (live Claude coaching)

Runs 100% offline by default on the keyword engine. To enable live Claude:

1. Click ⚙ **Settings**
2. Paste an Anthropic API key (`sk-ant-…`) — get one at console.anthropic.com
3. Tick "Use smart mode" → Save

The key is stored only in your browser. Use a dedicated key with a low spend
limit.

## Using it on a call

1. **Before** — click ◆ **Prep call**. Paste the triage transcript + notes.
   Generate. (Smart mode = Claude writes a prospect-specific brief; offline =
   structured framework.)
2. **During** — type what the prospect says, hit Enter. The copilot surfaces
   the objection/flag card with the verbatim handle. The 7-beliefs strip
   (Discovery) and committing-steps strip (Committing) make sure no step gets
   skipped. The "Prospect facts" box on the left is your scratchpad for goal +
   numbers. "What's happening" buttons cover silence / hedging / sticker shock.
3. **After** — open Prep call again, scroll to **Outcome**, mark Closed / Not
   closed / Follow-up + notes. Auto-saves.
4. **Browse past calls** — click ▤ **Calls** top-right for the full list with
   colour-coded outcomes.

## Repo layout

- `app/` — the live app (HTML/CSS/JS, no build)
- `app-data/` — source JSON (objections, flags, funnel) + mined transcripts +
  reviews
- `app-data/_review/` — code + sales-methodology reviews + per-call adherence
  scores (e.g. `call-jason-rosado-2026-05-19.md`)
- `scripts/build_app_data.py` — rebuilds `app/data/data.js` from
  `app-data/*.json`
- `SCRIPT-V3-business-owner.md` — the canonical written sales script
- `MASTER-SALES-SCRIPT.md` — original master script

## Updating data

If you edit `app-data/*.json`:

```bash
python3 scripts/build_app_data.py
```

Then refresh the app. The `?v=N` cache-buster in `app/index.html` is bumped
when assets change.

## What this does NOT do (yet)

- It does not auto-join Google Meet / Zoom. Smart mode reads what the rep
  TYPES, not the live audio. The bot-join + live-transcript path is the next
  build (Recall.ai + Cloudflare Durable Objects + Deepgram).
- Per-prospect data lives in the browser's localStorage only — it doesn't sync
  across devices yet. Step 3 of the migration plan moves it to Cloudflare D1.
