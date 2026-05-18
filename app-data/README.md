# app-data/ — Data Layer for the Real-Time Sales-Call Assistant

This folder holds the structured, machine-readable data that powers the planned app:
**a rep is on a live sales call, types what the prospect just said, and the app instantly
shows them exactly what to say back.**

## Files

- **`objection-responses.json`** — the core dataset. Each objection has:
  - `triggers` — phrases the prospect might say (what the rep types is matched against these)
  - `bucket` — financial / uncertainty / support
  - `type` — true-objection vs. logistic (drives handling order)
  - `response_steps` — the verbatim rebuttal script, in order
  - `do_not` — common mistakes to avoid
  - `source` — the objection file with full context

## How the app should use it

1. **Input:** rep types/speaks what the prospect said (e.g. "he says it's too expensive").
2. **Match:** fuzzy/semantic match the input against every objection's `triggers`.
   Recommended: embed the input + triggers and rank by cosine similarity; fall back to
   keyword match. Return the top match (plus 1-2 alternates if scores are close).
3. **Display:** show that objection's `response_steps` as a numbered teleprompter the rep
   reads down. Show the `bucket` and the `universal_framework` reminder at the top.
4. **Order rule:** if the matched objection's `type` is `logistic`, the app should first
   surface the `universal_framework.isolate` + `double_tie_down` lines — because a logistic
   must never be handled before uncertainty is cleared.

## Suggested build (for the future app)

- **Stack:** lightweight web app — React/Next.js front end, a small API that does the
  matching. Or even a single-page app reading the JSON directly + an embeddings call.
- **Matching:** OpenAI / Anthropic embeddings on `triggers`, cosine similarity vs. the rep's
  typed input. ~50ms; good enough for a live call.
- **UX:** big search box, instant results, numbered script the rep reads, a "next step"
  button to advance the loop, and a panel showing which funnel stage they're in
  (see `../FUNNEL.md`).
- **Stretch:** live speech-to-text of the prospect's audio → auto-match, so the rep doesn't
  even type.

## Status & next step

`objection-responses.json` currently covers **11 objections**, seeded from the
deeply-extracted `objections/` files. To make it the "perfect" dataset the goal calls for,
the next pass mines all 134 transcripts in `../transcripts/youtube/` for:
- every additional objection variation and verbatim rebuttal
- more `triggers` per objection (the more trigger phrases, the better the live match)
- a parallel `script-steps.json` for the non-objection funnel stages (intro, discovery,
  pitch) so the app can also guide the rep through the *whole* call, not just objections.
