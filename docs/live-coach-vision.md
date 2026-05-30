# Live-coach product vision

Source of truth for what the live-coach project is building TOWARD.
Locked by Lauren 2026-05-30. When the build kicks off, every decision
should trace back to this doc — not to generic "live transcription tool"
patterns from elsewhere.

## Lauren's vision, verbatim

> our own version of fireflies/fathom trained on the sales app auto
> "ticking the boxes" as we go and prompting me with suggestions of
> word tracks to say to "get the next box ticked" ensuring we probe
> deep enough and ask the right questions to keep them in the buying
> pocket to close max deals

## The product, expanded

A bot joins her Google Meet sales call. As the call happens, the bot:

1. **Auto-ticks the boxes** — silently updates the methodology state in
   the Copilot the same way the manual app updates it today.
2. **Surfaces word-tracks** — the EXACT line Lauren should say next to
   move the prospect toward the next un-ticked box. Not generic flags,
   not category labels — the literal sentence to deliver.
3. **Forces depth** — when she's about to move on at layer 1, the
   coach flags "loop back, the mask hasn't dropped" with the specific
   loop-back question to ask.
4. **Tracks the buying pocket** — senses when the prospect is cooling
   (energy drop, hedging, short answers, camera off, "let me think
   about it" creep) and surfaces a re-engagement move BEFORE the deal
   is lost.

Output target: **close max deals** — every other feature is in service
of conversion.

## "The boxes" — what gets ticked

The methodology is already encoded in the app. Ticking a box means
the live engine confirms the box's requirement has been satisfied in
the transcript. The boxes:

| Box | Tick condition |
|---|---|
| Introduction — frame control | Rep took frame + got explicit YES to the agenda |
| Introduction — nudge confirmed | Prospect said something that signals they want this |
| DISCOVERY — D Desire | Real why behind the number surfaced |
| DISCOVERY — I Issue | Specific personal cost named (not surface complaint) |
| DISCOVERY — S Sum | Exact numbers extracted (revenue, leads/week, close rate, LTV) |
| DISCOVERY — C Cost | Cost of inaction installed ("what if the next 5 years = the last 5?") |
| DISCOVERY — O Own | Why they can't solve it alone surfaced |
| DISCOVERY — V Verify | Trust in the rep / company stated |
| DISCOVERY — E Everyone | Who else is in the decision named |
| DISCOVERY — R Resources | Money belief installed BEFORE pitch |
| DISCOVERY — Y Why now | Catalyst event for NOW articulated |
| Transition | Recap of the gap + permission to pitch |
| Pitch — Pillar 1 + tie-down | Paradigm shift delivered + tie-down extracted |
| Pitch — Pillar 2 + tie-down | Proof delivered + tie-down extracted |
| Pitch — Pillar 3 + tie-down | Payoff delivered + tie-down extracted |
| Committing — temp check | Rep asked "is that something you'd move forward with here now?" |
| Committing — 1-10 scale | Rep asked "on a scale of 1-10 how interested?" |
| Committing — "what would make it a 10?" | Follow-up question asked |
| Committing — onboarding before price | Rep walked through onboarding before stating price |
| Committing — price on downward inflection | Price stated, then silence |
| Objection handle — diffuse | Temperature lowered on each objection raised |
| Objection handle — isolate | "Is that the only thing?" asked |
| Objection handle — temp check | Scale 1-10 asked |
| Objection handle — scale | "What would make it lower?" asked |
| Objection handle — double tie-down | "If I solved X, are you willing to move forward right now?" asked |
| Close confirmation | Buyer's-remorse pre-frame + next concrete step set |

## "Word-tracks" — examples of what gets surfaced

When DISCOVERY-R (Resources) is the next un-ticked box and Lauren has
just finished surfacing Cost, the coach phone view shows:

> **Next box: Resources (R).** Money belief not installed yet. Say:
> *"Jason, if we found the right thing — consistent 1-on-1 clients,
> no more Uber, marriage improves — can you invest to make that
> happen?"*

When a loop-back is needed at layer 1:

> **Don't move on yet.** Heather said "we need to do something
> different" but didn't say WHY. Say:
> *"Why though? What's underneath that? If you could fix one thing
> tomorrow, what would it be?"*

When the buying pocket is cooling:

> **Re-engage.** Energy dropped 40% over the last 2 minutes. Loop
> back to the catalyst. Say:
> *"You mentioned earlier that [SPECIFIC PAIN FROM EARLIER]. How
> would your life look in 12 months if that's still happening?"*

## "Buying pocket" — what triggers a re-engagement move

The coach considers the prospect to be IN the buying pocket when:

- Energy + tonality match the discovery temperature
- Mask-off moments have happened (vulnerability surfaced)
- Cost of inaction has been agreed verbally
- Prospect is asking questions about HOW, not IF
- Response length stays > 1 sentence
- No hedging language ("maybe", "let me think", "I'll get back to you")

OUT of the buying pocket triggers:

- Energy drop > 30% from the discovery baseline
- Multiple "I don't know" / "maybe" / "we'll see"
- Camera off mid-call
- Response length collapses to single words
- Hedge words appear before objection handle has completed
- Pre-close stalls ("I need to think about it" before price is named)

When the coach detects out-of-pocket, it surfaces a specific
re-engagement move tied to what was missed earlier in the call —
not a generic "ask another question."

## What this is NOT

- Not Otter, Fathom, or Fireflies' generic "AI notes." Those write
  summaries AFTER the call. This is real-time coaching DURING.
- Not a chatbot replacement for Lauren. She's still running the call.
  The coach is the earpiece, not the speaker.
- Not a generic "sales coach." Every word-track derives from the
  specific methodology already encoded in the app (funnel-stages.json,
  discovery-flags.json, objection-responses.json + the rep's My Offer
  template).
- Not yet branded for clients. Phase 1 is Lauren's tool only. If it
  works for her sales calls, the same engine becomes a Scale Systems
  client deliverable in phase 2.

## How the existing app maps to this

The engine that ticks boxes + surfaces word-tracks ALREADY EXISTS in
app/app.js. Today it's fed by Lauren typing what the prospect just
said. The live-coach project does NOT need to rebuild the methodology
engine — it needs to:

1. Replace "Lauren types prospect's words" with "Deepgram streams
   prospect's words from the Meet bot"
2. Replace "Lauren reads guidance on her laptop" with "Lauren reads
   guidance on her phone via /coach view"
3. Add buying-pocket detection (energy/tonality monitor — new logic)
4. Add the rep-side audio analysis (loop-back depth tracker — new
   logic that reads Lauren's questions and flags "you moved on at
   layer 1")

Everything else — funnel state, beliefs, objection handle, committing
checklist — is identical to what the app does today.

## Phase plan

- **Phase 1 (now → 4 weeks)**: v1 paste-transcript reviews running on
  every Lauren Meet call (manual). v2 auto-scan removes the paste
  step.
- **Phase 2 (4-8 weeks)**: Live-coach MVP. Recall.ai bot joins Meet,
  Deepgram streams, CF Durable Object holds state, /coach phone view
  surfaces word-tracks. Drives Lauren's own calls.
- **Phase 3 (8-12 weeks)**: Productize for Scale Systems clients.
  Multi-tenant. Per-client methodology templates. Optional GHL
  integration for client CRMs.

## Success criteria

- Phase 1: Lauren stops writing manual reviews. v2 produces reviews
  she actively uses.
- Phase 2: Lauren closes more calls (vs. her baseline) AND can name
  specific moments where the coach surfaced a word-track she used
  that moved a prospect.
- Phase 3: First paying Scale Systems client uses the live-coach on
  their own calls and reports the same kind of move-the-needle
  moments.

## Open product questions

- Phone view format: native iOS app or mobile-optimised web?
  (Default: web, faster to ship.)
- Voice prompts vs. visual prompts: should the coach also whisper
  the word-track into Lauren's earpiece via TTS, or stay silent text?
  (Default: silent text. Voice is risky on a real call.)
- Multi-rep tenant model for phase 3: how does Daniel + Mariana get
  their own coach view without seeing each other's calls? (Punt to
  phase 3 design.)
