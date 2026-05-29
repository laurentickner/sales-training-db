# Scale Systems Triage Call Copilot

The qualification call before the closer's strategy call. Encodes the Scale
Session triage script (Mariana-led), with the rep's #1 job being **pushing
back the moment a prospect gives uncertainty**.

## What it does

Walks you through the 10 stages of the triage call (Opening → ICP → Results &
Goal → Current Revenue → Past Attempts → Time & Urgency → Budget → Authority
→ Fit decision: pass to closer / Lauren follow-up). At every stage:

- **Goal of the section** — what must be true before you can move on
- **Green-light criteria** — tick each as you hit it
- **Verbatim script** — exact words for that beat
- **Tone banner** — the energy/voice to bring (e.g. "Sit back, relax, speak
  slowly and calmly" for Opening, "[SLOW + CONFIDENT TONALITY]" for the
  closer hand-off)

When the prospect's response contains uncertainty / stall language, a big
**red PUSH BACK card** appears with the verbatim words to push them. Do not
move on without a clear answer — the closer can't fix what the triage skipped.

## How to run it locally

```bash
gh repo clone laurentickner/sales-training-db
cd sales-training-db
python3 -m http.server 8770
```

Then open **http://localhost:8770/triage/**.

(The Sales Call Copilot is at the same URL but `/app/` instead of `/triage/`.)

## Repo layout for this tool

- `triage/` — the live app (HTML/CSS/JS, no build, no deps)
- `triage-data/triage-data.json` — source data (stages, scripts, pushback
  triggers, green-light criteria)
- `scripts/build_triage_data.py` — rebuilds `triage/data/data.js` from the
  source JSON

If you edit `triage-data/triage-data.json`:

```bash
python3 scripts/build_triage_data.py
```

Then refresh the browser.

## Sharing

The repo is private. To give a teammate access: GitHub → Settings →
Collaborators → add their username. They then clone + run the two commands
above.
