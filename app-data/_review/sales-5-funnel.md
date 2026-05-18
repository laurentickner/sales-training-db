# Audit — funnel-stages.json (the 6-stage call map)

Auditor slice: FUNNEL STAGES. Source of truth: MASTER-SALES-SCRIPT.md, sales-process/01-03,
app-data/_mining/batch-1..8 SCRIPT LINES sections.

Verdict in one line: the skeleton is faithful and the stage order is correct, but several
`say` lines are paraphrased/compressed to the point of losing Cole's tested mechanics, and
two whole stages are missing material moves (the moment-of-decision in discovery is too
thin; objections is missing the explicit ordering rule's verbatim isolate line and the
"what's really going on" probe). Most important single fix: the **discovery `say` array
collapses ~8 distinct question types into 9 lines and drops the chunk-down-to-numbers move
entirely** — see GAPS.

---

## WRONG / RISKY

### 1. Introduction `advance_when` is wrong — it advances too early
App: `"advance_when": "They've agreed to the frame and you've asked the first discovery
question."`

The first discovery question ("what's your biggest challenge…") belongs to the *frame /
intro* per the source — MASTER-SALES-SCRIPT.md STAGE 1 explicitly ends with "**First
discovery question**" as the last intro beat, and 01-introduction-and-discovery.md lists it
under PHASE 1. But more importantly, "you've asked the first discovery question" is not an
*advance* gate — it's an action the rep performs, not a prospect signal. The intro stage
should advance on the prospect signal: **they confirmed they're in a buying situation (have
paper, can focus) AND verbally agreed to the frame** ("Sound fair?" → "yeah"). The current
wording risks the copilot flipping to Discovery before the frame is even accepted.

Fix: `"advance_when": "They have a clean sheet of paper / can focus AND said yes to the
frame ('Sound fair?')."`

### 2. Discovery `say` line conflates two different questions and drops the qualifier
App line: `"Begin with the end in mind — ultimately, what's the goal? What's your monetary
goal? Why that number?"`

This is fine as far as it goes, but the *income-replacement qualifier* — Cole's signature
non-invasive way to learn what they earn — is missing entirely. Verbatim source (appears in
batch-1,2,3,6 and 01-introduction-and-discovery.md):
> "How much money would you have to make just to replace the amount of income you're
> making full-time? … is that enough to allow you to leave — or how much would you have to
> bring in to walk in the door, hand in your two weeks, and be done with your nine-to-five?"

Without this, the copilot never prompts the rep to actually quantify the prospect's
finances, which is the **money belief**. This is a risky omission, not just a "should
improve" — money is belief #5 and the README says every objection traces to a missing
belief.

### 3. Objections `say` line #3 softens the verbatim isolate line and changes its meaning
App: `"[Objection] aside — is there anything else keeping you from being less than 100%
certain this is the right thing and now is the right time? ... So you're 100% in?"`

Source verbatim (batch-7, 03-committing-phase-and-closes.md):
> "Money/spouse/timing aside — is there anything else keeping you from being less than 100%
> certain that this is what you need? … So [that] aside, you're 100% in?"

Closer than most, but the app drops the **double tie-down structure**: Cole's move is
"money aside, you're 100% in?" said as a *standalone confirmation* AFTER they answer "no
nothing else" — it is a separate tie-down, not a tail clause on the same sentence. Running
them together (as the app does with "... So you're 100% in?") loses the pause and the
second yes. Risky because the isolate move only works if you actually get the explicit
"yes, 100% in" before handling the named objection.

### 4. Committing `advance_when` mislabels the stage boundary
App: `"advance_when": "Price is dropped. Now expect 1-2 objections — that's normal."`

"Price is dropped" is not a clean advance signal — the close (yes-ladder) lives *inside*
the committing stage's own `say` array. The committing stage should advance to Objections
only when the prospect *raises an objection or stalls* after the price/close attempt. If
they say yes to the yes-ladder, the call ends — it never enters stage 6. As written, the
copilot would advance to Objections the instant price is mentioned, even on a clean close.

Fix: `"advance_when": "After the price drop + close attempt, the prospect stalls or raises
an objection. (If they say yes through the yes-ladder, the sale is closed — skip stage 6.)"`

---

## SHOULD IMPROVE

### 5. Introduction — rapport line is over-scripted and misses the "good busy" volley
App: `"Awesome — I just got done with a workout, super excited to chat. You been having a
good week?"`

Source is consistent across batch-1,2,3,8 that the SECOND volley is the tested earworm:
> "Oh — is that a good busy or a bad busy?"

This one-line follow-up is in 5+ transcripts and is the actual rapport *technique* (a
curiosity volley that proves you're listening). The app's single line is fine but the
copilot should surface "good busy or bad busy?" as the follow-up probe. Also missing the
**lean-out line** for a distracted prospect, which the app's own `listen_for` ("Driving /
distracted = reposition") sets up but never gives the rep words for:
> "Oh okay, gotcha — well, is now still a good time to connect?"

Add that line to the intro `say` array; right now `listen_for` tells the rep to reposition
but gives them nothing to say.

### 6. Introduction — the "FRAME:" line drops the homework option
App frame ends: `"if not, I'll point you in the right direction."`

Source frame (01-introduction-and-discovery.md, MASTER STAGE 1) ends with two options:
> "…I can refer you to somebody I know, **or just give you some homework to work on in the
> meantime.** Cool?"

Minor, but the homework option is part of the no-pressure frame and recurs in every
transcript. Restore it.

### 7. Discovery — "moment of decision" line is present but stripped of its power
App: `"Take me back to the moment you decided this had to change — what actually happened?"`

The source line is much more visceral and the imagery is the point (it resurfaces the
emotion of change):
> "Take me back to the last day you were at work and had this sudden realization that
> enough is enough — I'm gonna draw the line in the sand, step across it, burn the boats.
> Take me back to that time — what happened?"

01-introduction-and-discovery.md flags this as the single most important discovery move
("deep enough is deep enough to find the moment of decision"). The app's flattened version
("take me back to the moment you decided") will produce a date, not an emotional reliving.
Restore the "line in the sand / burn the boats" language and the "what happened" tag.

### 8. Discovery — missing the "any other reason" and "plan if nothing changes" questions
The app has the permission-reason-why personal question (good), but two other tested
questions are absent from the `say` array:
- The **any-other-reason** question (everyone has a stated reason and a real one):
  > "Hmm, I guess that makes sense… is there any other reason this is important to you now
  > though?"
- The **cost-of-inaction** question (belief #3, "cost"):
  > "Can I ask you another personal question — I really hate to ask this, but what's your
  > plan if nothing changes? What if the last 5 years are like the next 5 years?"

The app's line #6 ("If we roll this forward 90 days and nothing changes…") is a reasonable
paraphrase of cost-of-inaction but it is *not* a verbatim Cole line — the canonical line is
the "what if the last 5 years are like the next 5 years" framing. Swap to the verbatim.

### 9. Transition — the basic transition wording is slightly off
App: `"I don't think I have any more questions — is there anything else you feel like we
haven't covered that I need to know?"`

Source verbatim (every batch): `"…anything else you feel like we haven't covered **that you
feel like** I need to know?"` The doubled "you feel like" is deliberate softening. Tiny,
but this stage is short enough that exact wording matters.

Also: the transition `say` is missing the optional **client-story / tension beat** that
02-transition-and-pitch.md says goes between "we can definitely help" and the hamburger —
"insert a client story or valuable insight on the *what* (not the *how*) to build tension."
Worth a note in `listen_for` or as a 4th line.

### 10. Pitch — the high-level promise line drops the time frame
App: `"…to take you from [current] to [desired] while [removing the pain]."`

batch-2 verbatim: `"four things to take you from [current situation] to [desired situation]
**in [time frame]**."` The time frame is part of the promise (it sets the implicit
deliverable horizon). Add `[in time frame]` as an option.

### 11. Pitch — pillar `say` line omits the 1&2 = paradigm / 3&4 = future-pacing rule
The app's pillar formula line is accurate, but the *structural* rule that makes the 4
pillars work is only in the stage `goal` as "3-4 pillars" with no mention that **pillars 1
& 2 must be paradigm shifts (why you failed / why this is different) and 3 & 4 are future
pacing**. This is stated verbatim in batch-1 and 02-transition-and-pitch.md and it is the
load-bearing structure. Put it in `listen_for` or expand the `goal`.

### 12. Pitch — delivery line is too compressed, loses the "instead of X you can Y" close
App: `"DELIVERY (~60 sec, last): here's how we work together, account manager, calls, etc.
— then end on benefits."`

The source delivery line has a specific shape the app reduces to "etc.":
> "…account manager, 24/7 access, one-on-one calls every two weeks, Voxer support, the
> group, the course material. And the reason we do it that way is so that **instead of
> [blank] you can actually [benefit]** so that you can [benefit of the benefit]."

The "reason we do it that way / instead of X you can Y" tail is the move that keeps
delivery from being a flat feature-dump. The app's "then end on benefits" is too vague to
operationalize. Give the verbatim tail.

### 13. Committing — the scale-of-1-10 line drops the anchor definitions and the 9-reframe
App: `"On a scale of 1-10 … where do you fall exactly? ... What's keeping you from a 9 or
10?"`

Missing the **anchor definitions** that make the scale work (verbatim, batch-5,7,8):
> "…one being 'I hate this guy, get me off the phone,' ten being 'that's exactly what I
> need' — where do you fall out exactly?"

Also missing the **9-out-of-10 reframe** (03-committing-phase-and-closes.md, batch-7),
which is how Cole closes the gap when they say 8 or 9:
> "Nothing in life is a 10 out of 10 — it's not even 100% certain you'll wake up tomorrow.
> So a 9 is about as close to 100% certain as you'll ever be."

And the clarifier that this is about the *process not the price* (batch-8: "I'm not asking
if you're a 10 on the price — in terms of the four things, do you feel in alignment?").
These three are not optional flavor; they are the mechanics of the temp check.

### 14. Committing — onboarding line is fine but drop "downward inflection" should be its own coaching note
The app bundles "(Soft, downward inflection. Then go quiet…)" into the price line. Source
also has the specific phrasing "next steps are very simple, it's 9,800" with the price
*ending* the sentence on a period — worth surfacing as the exemplar so the rep doesn't
upward-inflect the number.

### 15. Objections — `say` is missing the verbatim diffuse + the "what's really going on" probe
The app has "No problem. (Diffuse — always.)" — but the source diffuse is a *triple*:
> "No problem. Not an issue at all. No problem. [Pause.]" — batch-7

And the app has no line for when the prospect's stated objection is clearly a smokescreen.
Cole's probe (batch-7, used repeatedly):
> "For real — I can tell there's something. So what's really going on? What's really coming
> up for you?"

This is the move that gets past "I need to think about it." Add it.

---

## GAPS / MISSING

### G1. Discovery — the chunk-down-to-numbers move is entirely absent (biggest gap)
The app's discovery `say` array has 9 lines and not one of them gets the prospect off
stories and onto numbers. This is one of Cole's most-repeated principles —
"if you ask them open questions they'll tell you stories; if you ask them for the numbers
they'll tell you the truth" (batch-4); "the truth is always in the numbers" (batch-3).
Verbatim missing lines:
> "Last week specifically, how many sales calls did you generate? … What about the week
> before? … out of those, how many fit the exact ideal client you want to attract?"
> "Just for clarity's sake — what was your exact revenue last month? … What about the
> month before?"

Without these, the copilot lets the rep run discovery entirely on vague narrative. The
stage `goal` says "numbers" only inside `listen_for`. There must be `say` lines that
*generate* the numbers. **This is the single most important fix.**

### G2. Discovery — the assumption-correction technique is missing
> "So you're making 5k a month right now then, correct?" — make an assumption so they
> correct you with the truth (batch-1,3). A distinct, named technique; not in the app.

### G3. Discovery — the "two-truths" / what-do-you-do-for-work setup is missing
01-introduction-and-discovery.md PHASE 2 step 3 ("the two-truths, from Eli"):
> "Now — what do you do for work full-time? … Do you like it? … What's the worst part
> about that?"
This is the setup that *leads into* the moment-of-decision question (app line #3). Without
it the moment-of-decision question has no runway. Add the two-truths lines before it.

### G4. Discovery — the duplicate/triplicate question is missing
01-introduction-and-discovery.md, batch-2: the move that forces the prospect to
self-diagnose your way ("when people don't get the result it's typically one of two things
— [blank] or [blank] — which one was it?"). This pre-installs the doubt belief. Not in the
app at all.

### G5. Transition — no line for the prospect who does NOT ask to be pitched
The transition `advance_when` is "They ask you to walk them through it." But the hamburger
sometimes doesn't land. There is no fallback `say` line and no `listen_for` guidance for
"they deflected / asked the price instead." 02-transition-and-pitch.md notes the inflection
risk; the copilot should have a recovery prompt.

### G6. Pitch — the "what this is NOT" opener is missing
02-transition-and-pitch.md and batch-2,4 give an optional but high-value pitch opener that
breaks preconceived objections before the pillars:
> "What this is NOT going to be is a group coaching program with a bunch of modules… What
> this IS going to be is a step-by-step system where we roll up the sleeves…"
Especially important for prospects who've been burned. Add as an optional pitch `say` line.

### G7. Pitch — the proof requirement is missing from the stage
02-transition-and-pitch.md: "Multiple forms of proof per claim (aim for 3): reason-why,
living proof (your story), social proof (case study/quote), analogy." The pitch stage `say`
gives the pillar skeleton but never tells the rep each pillar claim needs proof. Add to
`listen_for` ("if a pillar has no proof, the claim won't land").

### G8. Committing — the "what's next, where do you want to go" line is missing
batch-5,6,8: after the temp check and before onboarding, Cole runs a mini-transition:
> "So you feel really good about the process, no questions — what's next, where do you want
> to go from here?"
This mirrors the hamburger and gets the prospect to ask for the price. The app jumps
straight from the scale to onboarding. Add it.

### G9. Objections — the "uncertainty-first" ordering rule has no enforcement line
The stage `goal` and `listen_for` both say "handle uncertainty before logistics" — correct
— but there is no `say` line that *operationalizes* it. The isolate question (app line #2,
"should I do this vs how can I do this") is the tool, but the app never states the
consequence: 03-committing-phase-and-closes.md — "a logistic handled before uncertainty is
a smoke screen." A rep reading the stage won't know what to DO after they isolate. Add: if
"should I" → handle the uncertainty/belief; if "how can I" → it's logistics, trade and
close.

### G10. Objections — the trade line is present but the trade *principle* is buried
The app's line #4 has the trade line verbatim ("If I'm willing to do that for you, are you
willing to move forward right now?") — good. But the principle behind it ("anytime you make
a concession, ask for something in return — usually a decision now", batch-8) and the
common trades (case study for a 3-pay; half-down) are not surfaced. The objections auditor
covers rebuttals, but the *committing→objections* hand-off should at least name "trade =
concession for decision" in `listen_for`.

### G11. No stage covers "button down the sale" beyond a clause in advance_when
The objections `advance_when` ends with "button down the sale (restate next steps,
reassure, mitigate buyer's remorse)." This is real Cole material (MASTER STAGE 6 /
03-committing-phase-and-closes.md "Button down the sale") but it is a *post-close action*
with its own lines and it's been demoted to a parenthetical. Either give it `say` lines or
note explicitly that the copilot has no post-close coaching — a rep will close and then go
silent. Worth flagging to whoever owns the stage list: there is arguably a missing 7th beat.

---

## SUMMARY COUNTS
- WRONG / RISKY: 4
- SHOULD IMPROVE: 11 (#5–#15)
- GAPS / MISSING: 11 (G1–G11)
