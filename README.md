# Sales Training Database

A library of **objection-handling rebuttals** and **full sales-process scripting**,
extracted **word-for-word** from sales-training video transcripts.

## Purpose

When a rep hears an objection, or needs the exact language for any phase of a sales call,
they look it up here and find the proven scripting verbatim — no paraphrasing.

## How it's organized

- **`objections/`** — objection-handling, one file per objection category. Every verbatim
  rebuttal listed inside, tagged with its source code.
- **`sales-process/`** — the full sales-call scripting, organized by call phase
  (introduction → discovery → transition → pitch → committing phase → close).
- **`transcripts/SOURCES.md`** — the master source index (source code → title/speaker/link).
- **`transcripts/raw/`** — the verbatim raw transcripts of the batch-2 sources, archived
  losslessly for re-extraction.

Duplicate rebuttals are **kept on purpose** — if the same line shows up across multiple
sources, that signals it's a high-conviction, battle-tested rebuttal.

## `objections/` — objection categories

| File | Objection |
|------|-----------|
| [00-core-framework.md](objections/00-core-framework.md) | The universal skeleton — temp check, scale of 1-10, double tie-down, the 3 objection buckets |
| [price-and-financial.md](objections/price-and-financial.md) | "It's too expensive" / "I can't afford it" / open-wallet + payment-plan close |
| [think-about-it.md](objections/think-about-it.md) | "I want to think about it" / "sleep on it" / "send me a proposal" |
| [support-spouse-partner-team.md](objections/support-spouse-partner-team.md) | "I need to talk to my spouse / partner / board / team" |
| [been-burned-before.md](objections/been-burned-before.md) | "I've been burned before" / "it didn't work last time" |
| [competitor-cheaper.md](objections/competitor-cheaper.md) | "Your competitor is cheaper" / "it's more than I thought" |
| [timing-start-later.md](objections/timing-start-later.md) | "I want to start later" / "after the holidays" / "move money around" |
| [nerves-cant-pull-trigger.md](objections/nerves-cant-pull-trigger.md) | Nerves / fear — they're 100% in but can't pull the trigger |
| [more-objections-from-webinar.md](objections/more-objections-from-webinar.md) | Multi-partner, "want other quotes", same-day decisions, "want to see it", "not allowed to buy coaching", trust/"why you", financing-not-approved, scam fear, faith-based offers |

## `sales-process/` — call scripting by phase

| File | Phases |
|------|--------|
| [README.md](sales-process/README.md) | The 6-phase map + the 7 buying beliefs |
| [01-introduction-and-discovery.md](sales-process/01-introduction-and-discovery.md) | Rapport, frame, information gathering, question frameworks, two-truths, moment of decision |
| [02-transition-and-pitch.md](sales-process/02-transition-and-pitch.md) | Hamburger transition, the pitch codex (high-level promise → bridge → delivery) |
| [03-committing-phase-and-closes.md](sales-process/03-committing-phase-and-closes.md) | Temp check, scale of 1-10, onboarding-before-price, the price drop, closes gallery |

## Entry format

```
> "[verbatim line — exactly as the speaker says it]"

- **Source:** [source code]
- **Context:** [where in the call / what setup precedes it]
```

## Sources

See [transcripts/SOURCES.md](transcripts/SOURCES.md) for the full index. **19 sources**:
Ravi Abuvala (1), Brian Austster Miller podcast (1), Matt Ryder podcast (1), Cole Gordon
(16 — across objection videos, the 3-part process series, the pitch codex, the committing
phase, and the Malouf charity webinar).
