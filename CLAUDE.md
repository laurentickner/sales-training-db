# Scale Systems Sales Call Copilot — INTERNAL

This repo is the **internal** sales call copilot used by Lauren Tickner,
Daniel Matyas, and Mariana to run sales calls FOR Scale Systems prospects.

**Live URL:** https://sales-training-db.pages.dev/ (Cloudflare Access — email OTP)

## What's in here

- Lauren's locked-state methodology + script — Mariana, AI Content System,
  100K-views / 200K-posts stats, Japan / gym / bridge analogies, [LTV × 12]
  conservative upside math, 12-week onboarding line, $X price placeholder
- Ravi Abuvala + Matt Ryder + Jeremy Miner / NEPQ named-author attribution
  in `buildPrepSystemPrompt` + `buildReviewSystemPrompt` — the rep sees
  which framework each move comes from (Cole Gordon attribution stripped
  2026-06-27 at Lauren's request — methodology stays, name does not)
- v1 paste-transcript post-call review (calibrated v2.2 prompt — Sonnet 4.5,
  6000 max_tokens, 180s timeout, scoring discipline + phase score caps so
  closed deals don't inflate execution scores)
- v2 email-triggered auto-review (in build — branch `v2-email-trigger`,
  spec in `docs/v2-auto-scan-google-drive.md` plus the spawned task)
- Live-coach product vision (`docs/live-coach-vision.md`)

## ⚠️ AGENT INSTRUCTIONS — repo identity

**This is the INTERNAL tool. Do not templatize it.** Do not strip
Lauren-specific content. Do not remove Ravi/Miner attribution. (Cole
Gordon attribution was stripped 2026-06-27 at Lauren's explicit request —
methodology stays in the tool, his name does not. Do not reintroduce it.)

The **client-distributable fork** is at
[`laurentickner/sales-training-db-client`](https://github.com/laurentickner/sales-training-db-client).
That's where niche-agnostic work goes.

If you're an AI agent working on this repo and you find yourself wanting to:
- remove a "Scale Systems" / "AI Content System" / "Mariana" reference
- strip a Ravi Abuvala / Jeremy Miner attribution
- remove Lauren's example numbers (100K, 200K, $7,800, $25k)
- remove the GHL push (when restored server-side)
- generalise the Prep prompt to "any niche"

**STOP.** That work belongs in `sales-training-db-client`, not here. Ask before
making the edit.

## Repo split — locked 2026-05-30

| Repo | Purpose | Live URL |
|---|---|---|
| `sales-training-db` (this one) | Internal — Lauren / Daniel / Mariana run sales for Scale Systems prospects | https://sales-training-db.pages.dev/ |
| `sales-training-db-client` | Client-distributable fork — what Scale Systems sells to clients | (pending CF Pages wire) |

The split happened after the other chat templatized this codebase on top of
the internal version. We forked `sales-training-db-client` off as a snapshot,
then restored internal flavor here.

## Goal-state (locked by Lauren 2026-05-30)

> "keep going until this is usable for me internally and it has my previous
> scripting for my own sales calls I was happy with, and that the call
> transcripts are pulled post call and compared to the scripting and coaching
> advised by Cole / Ravi / Jeremy Miner"

Translation:
1. ✅ Lauren's pre-templatize script restored (locked-state `data.js` +
   `funnel-stages.json` content, plus index.html placeholders restored)
2. ✅ Review prompt explicitly cites Ravi / Matt Ryder / Jeremy Miner / NEPQ
   as the source frameworks the call is scored against (Cole stripped
   2026-06-27 per Lauren — methodology stays, name does not)
3. 🟡 v2 email-trigger Worker — Meet transcripts auto-pull from Drive on the
   gemini-notes@google.com email + auto-generate review + append a "Sales
   Methodology Review" tab to the same Notes-by-Gemini Doc + push to GHL
   (server-side) + Slack `#daniel-lauren`. Spawned as `v2-email-trigger` branch.

## Stack

- Static SPA at `app/`, deployed on Cloudflare Pages with auto-deploy on
  every `git push` to `main`
- Cloudflare Access email-OTP gate in front of the live URL
- Anthropic Claude API direct from the browser (smart mode + Prep + Review)
  using each rep's own API key in their browser's localStorage
- All per-prospect state in browser localStorage — no server, no DB (yet)
- v2 will introduce: a Cloudflare Worker (cron-less, email-triggered) for
  the auto-review pipeline, with Worker secrets for ANTHROPIC_API_KEY,
  GOOGLE_REFRESH_TOKEN, GHL_PIT + GHL_LOCATION_ID, SLACK_WEBHOOK_URL

## Project map

```
app/                    — static SPA
  index.html            — shell + modals (Prep, Calls, Review, My Offer, Settings)
  app.js                — engine: keyword matcher, smart mode, Prep, Review, GHL stubs
  data/data.js          — auto-generated from app-data/*.json (don't edit by hand)
  styles.css            — all UI
app-data/               — source-of-truth JSON
  funnel-stages.json    — 7 stages: goal, listen_for, options/say lines per stage
  discovery-flags.json  — DISCOVERY belief signals + probe questions
  objection-responses.json — 29 objection cards + universal handle
  _review/              — Lauren's hand-written call reviews (gold-standard
                          training data for the AI review prompt)
docs/
  live-coach-vision.md  — Phase 1 / 2 / 3 plan (manual → auto → live bot)
  v2-auto-scan-google-drive.md — original Drive cron spec (superseded by email)
scripts/                — build + helper scripts
```
