# Call Copilot — Scale Systems

A real-time sales-call assistant. During a call, the rep types what the prospect just said;
the copilot instantly tells them **what to say back**, **what to probe**, and keeps them on
the funnel. Built on the objection + script knowledge base in this repo (26 objections,
286 trigger phrases, 24 discovery flags, the 6-stage funnel).

## How to run it

It's a plain web app — no install, no build, no server needed.

**Just open `app/index.html` in Chrome** (double-click it, or drag it into a browser tab).
That's it. It works fully offline.

To use it on a call: open it in a second window/tab next to your call window.

## How to use it on a call

1. **Set your funnel stage** — click the stage you're in along the top
   (Introduction → Discovery → Transition → Pitch → Committing → Objections).
   The right panel always shows what to do and say in that stage.
2. **Type what the prospect just said** into the box on the left, press **Enter**.
3. **The copilot responds** on the right:
   - **▲ Objection detected** — the verbatim rebuttal, step by step, ready to read aloud.
   - **⚑ Discovery flag** — something to probe, with the exact probe question.
   - **✓ Clear** — nothing to handle; keep running the current stage.
4. Everything you type is kept in the **Call Log** (left). Click any past line to re-show
   its guidance. **Export log** downloads it as a text file.
5. **New call** clears the log for the next prospect.

## Two modes

- **Keyword mode (default)** — 100% offline. Matches what you type against 286 trigger
  phrases. Fast, private, no API key, works on a plane.
- **Smart mode (optional)** — add an Anthropic API key in **⚙ Settings**. The copilot then
  also asks Claude (Haiku, low-latency) to read the call live and hand you the single best
  line — it catches objections phrased in ways the keyword engine would miss. The key is
  stored only in your browser and sent only to Anthropic. Keyword mode keeps running
  underneath, so the app never goes dark.

## Data

The app reads `app/data/data.js`, auto-generated from the source datasets:

- `app-data/objection-responses.json` — 26 objections, the verbatim rebuttals
- `app-data/discovery-flags.json` — 24 discovery flags + probe questions
- `app-data/funnel-stages.json` — the 6-stage funnel script

After editing any of those, regenerate the bundle:

```
python3 scripts/build_app_data.py
```

## v2 — the notetaker

This is **v1: type-driven**. The planned **v2** adds the live notetaker — it listens to the
call audio, transcribes it, and auto-runs the copilot with no typing. v1 was built first
because it's more reliable and usable on a call today; v2 is a layer on top of the same
engine and data.

## Files

| File | What it is |
|------|-----------|
| `index.html` | The app UI |
| `styles.css` | Styling (dark, high-contrast, built for fast reading mid-call) |
| `app.js` | Matching engine, copilot logic, funnel tracker, smart mode |
| `data/data.js` | Auto-generated knowledge base bundle |
