# Audit — discovery-flags.json (24 flags)

Auditor slice: DISCOVERY FLAGS. Source of truth: `_mining/batch-1..8.md` (Discovery sections),
`sales-process/01-introduction-and-discovery.md`, `MASTER-SALES-SCRIPT.md`.

Verdict: the flag SET is mostly right and the probe wording is unusually faithful. But several
probes blend Cole's verbatim with Claude-invented phrasing, two beliefs are mis-mapped, and a
handful of high-leverage discovery moments Cole hammers in every call are missing.

---

## WRONG / RISKY

### 1. `no-pain` probe is NOT how Cole runs a no-pain call — it skips the gap structure
App probe: *"In a perfect world, where would [their metric] be? ... How does that compare to
where you're at right now? ... So what do you feel like you need to get there?"*

That is a generic coaching question. Cole's actual no-pain move is the **scale-of-1-to-10
gap question** — he uses it verbatim across multiple calls:
> "On a scale of one to ten, one being you can barely get out of bed, ten being you feel like
> you can run a marathon, how do you feel right now? ... Well, what does a three mean to you
> specifically? Tell me more about that." — *Sales First Principles*
> "based on how you're feeling with your health right now, on a scale of one to ten, like
> where do you feel like your energy is at compared to what it really could be?" — *Steal My 7-Step*

The note ("find the unfulfilled-desire gap") is correct philosophy ("two types of gaps —
pain and unfulfilled desire"), but the probe doesn't deliver it. **Fix:** replace with the
1–10 scale question + the "what does a [number] mean to you specifically" follow-up. That is
the canonical tool for surfacing a gap when the prospect downplays.

### 2. `past-attempt` is mapped to `trust` — it should be `doubt` (or split)
App belief: `trust`. Cole's framework names these **solution questions**, and the *belief*
they install is doubt — "can a proven path beat what I've already tried." `trust` in Cole's
7 beliefs is trust in *this* company/closer specifically, surfaced later. The note even says
"the pitch must explain why that failed" — that is the doubt/method belief, not trust.
Source: *01-introduction-and-discovery.md* lists "Doubt + solution questions" together.
**Fix:** belief → `doubt`. (`doubt-themselves` and `misdiagnosis` already correctly carry doubt.)

### 3. `fear-risk-word` mapped to `trust` — and the probe tells the closer to do NOTHING in discovery
App belief: `trust`; probe is a no-op note deferred to the close. Two problems:
(a) A voiced fear in discovery is the **cost/doubt belief surfacing early**, not trust.
(b) The probe gives the closer zero discovery action. Cole *does* probe fear in discovery —
he chases the emotional word ("why do you say that though", "in what way though"). The flag
duplicates `emotional-word` (which already lists "scared") but then instructs inaction.
**Fix:** either merge into `emotional-word`, or keep it but give it a real probe ("tell me
more about that — what specifically worries you?") and re-map belief to `doubt`. Don't ship a
flag whose only instruction is "note it, handle it later."

### 4. `names-a-number` / `surface-goal-no-why` probes drop Cole's exact tonality softener
App: *"You seem like you've thought of that number before — can I ask, why that number?"*
Close, but Cole's verbatim is sharper and the "seems like" framing is load-bearing — it
**points out the abnormality and asks them to justify it** (consistency bias):
> "it seems like you thought of that number before, so can I ask, like, why that number,
> why 20k a month?" — *Steal My 7-Step*

The app version is usable. The risk: the app appends *"When do you want to hit it by?"* —
that timeline question is fine but is NOT part of Cole's "why that number" sequence; the
actual next beat is the **monetary goal → long-term vision → non-monetary goal** ladder.
Minor, but the probe should not invent a sequence Cole doesn't run.

### 5. `mentions-competitor` belief = `trust`, probe is a deferred no-op
The probe is entirely a "note it, do this later at the close" instruction — same anti-pattern
as #3. There is no canonical Cole discovery line for a named competitor (he treats it as a
trust belief flushed out and saved for transition — correct). But a flag that fires during
discovery should give the closer a discovery-phase action. **Fix:** give it a light
discovery probe that *flushes* without *handling*: "Got it — what's drawing you to look at
options right now?" Then keep the note about saving the reframe for the close.

---

## SHOULD IMPROVE

### 6. `vague-answer` probe — verbatim is "why do you say that though", not "how do you mean"
App probe: *"...what do you mean exactly? How do you mean exactly?"* Cole's verbatim across
6+ transcripts pairs it differently:
> "Tell me more. When you said blank, what do you mean exactly? **Why do you say that
> though?**" / "...**why do you say that, though?**"
"How do you mean exactly" *does* appear (batch-6) but the dominant, higher-leverage follow-up
is "why do you say that though" — it forces a reason, not a restatement. **Fix:** lead with
"Tell me more — when you said [that], what do you mean exactly? Why do you say that though?"

### 7. `emotional-word` probe is strong but slightly out of order
App: *"Tell me more about that. Has that put you in a tough position? ... In what way
though?"* Faithful. One refinement: Cole credits "has that put you in a tough position" to
Jeremy Miner and uses it specifically as a **financial/cost** probe ("has that put you in a
little bit of a buying — cash flow wise"). For a non-financial emotional word (overwhelmed,
exhausted) the truer chase is "tell me more / why do you say that though / how's that
showing up." Probe is good — note could clarify "tough position" skews financial.

### 8. `stuck-long-time` — best probe in the file, but missing the "burn the boats" language
App probe is excellent and faithful. Cole's fullest verbatim adds visceral language worth
quoting in the note for the closer:
> "Take me back to the last day where you kind of had this sudden realization that enough is
> enough and I'm gonna draw the line in the sand, step across it and just **burn the boats**
> — take me back to that time, what happened?"
Also the note's claim "the highest-leverage discovery question" is correct — Cole says
"deep enough is deep enough to find the moment of decision." Keep, just enrich the note.

### 9. `job-they-want-to-leave` — probe is faithful but loses the "why now" / consistency-bias frame
App probe ends *"...what shifted — why now?"* — good. But Cole's canonical move here is the
**Permission–Context–Question**, where he paints the delay as a mild abnormality:
> "You've been a bus driver for 10 years now and you just started thinking about doing this
> like 30 days ago — if I can ask, like why all of a sudden now though? ... what shifted for
> you? what happened?"
The note says "two-truths question" (correct, from Eli) but the probe should explicitly
include the contrast clause ("you've done X for [N years], started thinking about this
[recently]") — that abnormality framing is what makes them justify the change *to you*.
Always tack on **"what happened"** — the note should call that out as mandatory.

### 10. `mentions-family-lifestyle` — probe is the Permission–Reason-Why and it's strong
This is the best-executed probe in the file — faithful to the verbatim, including the
reason-why ("we want this to work around your lifestyle goals"). Keep. Minor: Cole's full
version stacks three questions — "what is that for you? what comes up? what are the
non-monetary goals?" The app keeps one. Adding "what comes up?" sharpens it.

### 11. `real-reason-because` — probe is the "any other reason" question, correctly placed
Faithful: *"is there any other reason this is important to you now though?"* Cole's framing:
"Everyone has two reasons — the one that sounds good and the real one." Good. The trigger
list ("the real reason", "if i'm being honest") is slightly off — Cole fires this question
*after any stated reason*, not only after a confession phrase. Consider broadening or
renaming so it triggers on any goal-reason answer, not just honesty-flag words.

### 12. `asks-price-early` belief = `none` — acceptable but the "fair?" tie-down is gold, keep it
Probe is faithful to *When Prospects Try To Take CONTROL Of The Call* ("everything we do is
all customized... let me get a little bit of context first"). Good. `none` belief is fine
here. No change needed — flagged only to confirm it's correct.

### 13. `says-we` / `mentions-spouse` — both correct; one wording note
`mentions-spouse` probe is faithful. Cole's canonical support question ties to the *change*,
not the *decision*: "is your partner supportive of you [making that change]" + "do they know
you're on this call? what would they think if they knew?" The app has the second half but
not "what would they think if they knew" — that line is the one that surfaces a hidden
non-supportive spouse. **Add it.**

---

## GAPS / MISSING

### A. MISSING — the "what's your plan if nothing changes" cost-of-inaction question
Cole's single most-repeated cost question, in nearly every full script:
> "Can I ask you another personal question — and I really hate to ask this but **what's your
> plan if nothing changes? What if the last five years are like the next five years?**"
`deadline-pressure` has a *paraphrase* of this ("if we roll this forward 90 days...") but
that's Claude-reworded. The verbatim "what's your plan if nothing changes / what if the last
N years are like the next N years" deserves its own flag (belief: `cost`), triggered when a
prospect has stated a long-running problem OR a goal with no urgency. This is the cost-belief
installer — currently under-represented.

### B. MISSING — chunk-down-to-numbers when a prospect gives a vague metric
`story-not-numbers` covers stories. But the more common case is a prospect who gives ONE
number and Cole drills the whole funnel: "last week specifically how many sales calls? what
about the week before? out of those, how many fit your ideal client? what price point? was
that collected up front? is that gross or net?" The principle — "people tell stories about
their problems but the truth is in the numbers" — is in the note of `story-not-numbers`, but
there's no flag for **a prospect quoting revenue/leads without breaking it down**. Add a
flag triggered on bare metrics ("we did about 50k", "I get some leads") → probe: "let's get
specific — what was your exact revenue last month? what about the month before? is that
gross or net?"

### C. MISSING — the assumption-correction technique ("so you're making 5k a month, correct?")
Cole's named technique: *"so you're making 5k a month right now then, correct?"* — "make an
assumption so they correct you with the truth." This is a discovery *tool* the copilot should
surface when a prospect is dodging a direct financial question. Not currently a flag.

### D. MISSING — `not-sure-of-ideal-client` / ICP-fit gap
Cole consistently probes: "out of those [N] leads, how many fit the perfect bill of the exact
ideal client you want to attract?" — surfacing that the prospect's real problem is *lead
quality*, not volume. No flag covers a prospect who talks about lead volume without
qualifying fit. High-value for B2B calls.

### E. MISSING — the duplicate/triplicate self-diagnosis question
> "What we've found is, when people go into a program like you described and don't get the
> result, it's typically one of two things — either [blank] or [blank]. Which one do you
> think it was?"
This is a major discovery weapon Cole names explicitly — it forces the prospect to
self-diagnose *your* way and pre-empts the trust objection. `past-attempt` fires on the same
trigger ("I tried X before") but its probe is open-ended. The duplicate question belongs
either as the probe for `past-attempt` or as its own flag.

### F. MISSING — `income-replacement` probe for biz-op / job-leaver prospects
For prospects leaving a 9-5, Cole's non-invasive income qualifier: "how much money would you
have to make just to replace the amount of income you're making full-time? ... is replacing
that income enough to allow you to leave, or what's the real number that has you walking in
and handing in your two weeks?" `job-they-want-to-leave` fires on the right triggers but its
probe is the two-truths, not the income-replacement question. Both belong — add the
income-replacement probe (belief: `money`).

### G. MISSING — `wants-to-think-about-it` / stalled-information signal in discovery
"a prospect stays engaged as long as there's new information... once they say 'I have all
the information,' that's the stall." A prospect who says "I think I've got what I need" or
disengages mid-discovery is a flag worth surfacing. Currently nothing covers it.

### H. WEAK COVERAGE — only one flag carries the `money` belief... actually ZERO do
The description claims the 7 beliefs (pain, doubt, cost, desire, money, support, trust).
Counting the file: pain ×4, doubt ×2, cost ×4, desire ×4, support ×2, trust ×4 (3 of which
should move per #2/#3/#5), none ×3, **money ×0**. The money belief — "resources and
willingness to fix the problem" — has no discovery flag at all. Cole installs it in
discovery ("installing the money belief creates consistency which eliminates financial
objections"). Add at least one money flag: a prospect who mentions cash/budget tightness
("things are tight", "cash flow", "can't really afford") → probe the income-replacement /
"has that put you in a tough position financially — in what way though" line. Right now a
financial-tightness comment in discovery has no flag to catch it.

---

## SUMMARY OF FIXES (priority order)
1. Add the `money` belief coverage — currently 0 flags (gap H + F). Highest impact.
2. Fix `no-pain` probe → the 1–10 scale gap question (wrong #1).
3. Re-map beliefs: `past-attempt` → doubt, `fear-risk-word` → doubt (wrong #2, #3).
4. Add cost-of-inaction flag: "what's your plan if nothing changes" (gap A).
5. Add chunk-down + assumption-correction + ICP-fit + duplicate-question flags (gaps B–E).
6. Tighten probe verbatim: "why do you say that though" in `vague-answer`; "what would they
   think if they knew" in `mentions-spouse`; abnormality clause in `job-they-want-to-leave`.
7. Replace the two no-op deferred probes (`fear-risk-word`, `mentions-competitor`) with real
   discovery-phase actions.
