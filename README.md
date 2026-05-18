# Sales Training Database

A library of objection-handling rebuttals, extracted **word-for-word** from sales-training video transcripts.

## Purpose

When a rep hears an objection on a call, they can look it up here and find the exact
language proven closers use to overcome it. Every rebuttal is verbatim — no paraphrasing.

## How it's organized

- **`objections/`** — one file per objection category. Every verbatim rebuttal for that
  objection is listed inside, tagged with its source.
- **`transcripts/`** — raw source transcripts, kept for reference and re-extraction.

Duplicate rebuttals are **kept on purpose** — if the same line shows up across multiple
videos, that signals it's a high-conviction, battle-tested rebuttal.

## Objection categories

| File | Objection |
|------|-----------|
| _(populated as transcripts are processed)_ | |

## Entry format

Each rebuttal entry inside an objection file looks like:

```
### "[the objection as the prospect would say it]"

> "[verbatim rebuttal — exactly as the speaker says it]"

- **Source:** [video title]
- **Speaker:** [name]
- **Context:** [where in the call / what setup precedes it]
```

## Sources

| Video | Speaker | Date added |
|-------|---------|------------|
| _(populated as transcripts are processed)_ | | |
