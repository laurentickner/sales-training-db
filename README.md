# Sales Training Database

A complete, funnel-organized sales system — **the master sales script, objection handling,
and an app-ready dataset** — extracted word-for-word from sales-training transcripts
(primarily Cole Gordon / Closers.io).

End goal: power a real-time call-assistant app where a rep types what the prospect just
said and instantly gets exactly what to say back.

## Start here

| File | What it is |
|------|-----------|
| **[MASTER-SALES-SCRIPT.md](MASTER-SALES-SCRIPT.md)** | The complete call, top to bottom, in funnel order. Read this first. |
| **[FUNNEL.md](FUNNEL.md)** | The call funnel map + the objection decision tree. |

## Structure

- **`sales-process/`** — phase-by-phase call scripting (intro → discovery → transition →
  pitch → committing phase → close).
- **`objections/`** — objection-handling rebuttals, one file per objection type, verbatim.
- **`app-data/`** — structured `objection-responses.json` (trigger phrases → response) +
  the spec for the real-time call-assistant app.
- **`transcripts/`** — raw source material:
  - `raw/` — 13 hand-supplied transcripts, verbatim.
  - `youtube/` — **all 134 long-form videos** from Cole Gordon's channel, scraped via
    Apify, + `00-CHANNEL-INDEX.md` cataloguing them.
  - `SOURCES.md` — the source index.

## `objections/` — categories

| File | Objection |
|------|-----------|
| [00-core-framework.md](objections/00-core-framework.md) | Universal skeleton — temp check, scale of 1-10, double tie-down, the 3 buckets |
| [price-and-financial.md](objections/price-and-financial.md) | "Too expensive" / "can't afford it" / open-wallet + payment-plan close |
| [think-about-it.md](objections/think-about-it.md) | "Think about it" / "sleep on it" / "send a proposal" |
| [support-spouse-partner-team.md](objections/support-spouse-partner-team.md) | "Talk to my spouse / partner / board / team" |
| [been-burned-before.md](objections/been-burned-before.md) | "I've been burned before" / "it didn't work last time" |
| [competitor-cheaper.md](objections/competitor-cheaper.md) | "Your competitor is cheaper" |
| [timing-start-later.md](objections/timing-start-later.md) | "Start later" / "after the holidays" |
| [nerves-cant-pull-trigger.md](objections/nerves-cant-pull-trigger.md) | Nerves / fear — 100% in but can't commit |
| [more-objections-from-webinar.md](objections/more-objections-from-webinar.md) | Multi-partner, other quotes, "see it", trust, financing |

## `sales-process/` — scripting by phase

| File | Phases |
|------|--------|
| [README.md](sales-process/README.md) | 6-phase map + the 7 buying beliefs |
| [01-introduction-and-discovery.md](sales-process/01-introduction-and-discovery.md) | Rapport, frame, discovery, question frameworks |
| [02-transition-and-pitch.md](sales-process/02-transition-and-pitch.md) | Hamburger transition, the pitch codex |
| [03-committing-phase-and-closes.md](sales-process/03-committing-phase-and-closes.md) | Temp check, scale of 1-10, price drop, closes |

## Source corpus

- **19 hand-processed sources** — Ravi Abuvala, Brian Austster Miller & Matt Ryder
  podcasts, and 16 Cole Gordon videos — deeply extracted into `objections/` + `sales-process/`.
- **134 Cole Gordon channel videos** — full transcripts scraped via Apify, stored in
  `transcripts/youtube/`. Catalogued in `transcripts/youtube/00-CHANNEL-INDEX.md`
  (⭐ marks the priority sales/objection videos).

## Status

✅ All 134 channel transcripts scraped + stored. ✅ Master script, funnel map, and
app-data scaffold built from the 19 deeply-extracted sources.
⏭️ **Next pass:** mine the 134 raw transcripts to enrich the master script and expand
`app-data/objection-responses.json` (more objections, more trigger phrases). The
⭐ videos in the channel index are the priority targets.
