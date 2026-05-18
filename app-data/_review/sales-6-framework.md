# Audit — Universal Objection Framework + Bucketing / Ordering

Slice: `objection-responses.json` `universal_framework` + every objection's
`bucket`/`type`; `app/app.js` `renderCopilot` ordering (`strongObj`/`flagsFirst`).
Canonical source: `objections/00-core-framework.md`, `OBJECTION-PLAYBOOK.md`,
`app-data/_mining/batch-1..8.md`.

---

## WRONG / RISKY

### 1. `no-time-to-implement` is bucketed `uncertainty` but `timing-start-later` is `uncertainty` with type `logistic` — and the mining source classes BOTH as one objection in the `uncertainty` bucket. The split + the type fields are inconsistent and partly wrong.

`batch-1.md` line 109 has a single entry:

> `### "I want to start later / I don't have time to implement" (timing logistic)`
> `**Bucket:** uncertainty`

The JSON splits this into two objections, which is fine, BUT assigns them
contradictory `type`s:

- `timing-start-later` → `"bucket": "uncertainty"`, `"type": "logistic"`
- `no-time-to-implement` → `"bucket": "uncertainty"`, `"type": "true-objection"`

This is incoherent. Both cannot live in the `uncertainty` bucket *and* one be a
`logistic`. Per `00-core-framework.md` lines 23–24: *"Uncertainties [are] true
objections. Support and financials [are] logistics."* The funnel (line 133)
names the three logistics explicitly: **"timing, financial, and spouse."**
Timing IS a logistic per the funnel. So `timing-start-later` `type: logistic`
is right by the funnel — but then its `bucket` should not be `uncertainty`
(there is no `timing` bucket; see Gap 1). And `no-time-to-implement` is tagged
`true-objection` while its sibling is `logistic`, despite the source treating
them as the same objection. Pick one: the mining file's verdict is that the
whole "start later / no time" family sits in **uncertainty** and is handled as
a **true objection** (Cole reframes "no time" as a *priorities* problem, not a
logistic — JSON step 3 of `no-time-to-implement` says exactly that). Under that
reading `timing-start-later` `type: "logistic"` is the wrong one and should be
`true-objection`. The current state ships two near-identical objections with
opposite `type` tags — a rep reading the cards gets contradictory guidance on
whether to handle uncertainty first.

### 2. `price-too-expensive` `type` value `"logistic-or-smokescreen"` is not a real type and breaks the binary the framework rests on.

Every other objection uses `true-objection`, `logistic`, or `process`.
`price-too-expensive` invents a fourth value: `"logistic-or-smokescreen"`.
The framework's whole sequencing rule depends on a clean binary —
`00-core-framework.md` line 24: *"We have to handle the uncertainty first"* —
and the app's `buildSystemPrompt` tells Claude to *"handle UNCERTAINTY before
any logistic."* A type the app's own logic doesn't recognise is dead metadata
at best, and misleading at worst. `batch-2.md` line 48 is explicit on how to
resolve it: *"if it's just like oh i can't afford it or it's too much … unless
you know that they truly can't … logistically they can't, then that's an
**uncertainty-based objection** in my book … root out the uncertainty and then
see if it truly is a … real financial objection."* The correct modelling: keep
`bucket: financial`, set `type: "logistic"` (the destination once isolated),
and let `do_not` + the isolate step carry the "it's usually a smokescreen for
uncertainty" nuance — which they already do. Don't encode the ambiguity in the
`type` field the sequencing logic reads.

### 3. `renderCopilot` ordering: when a confident objection AND a flag both fire late-call, the objection leads — correct — BUT in discovery/transition/intro a `flagsFirst` rule puts flags ahead of objections, and a *weak* objection (score < 2) is pushed below flags even when the prospect just raised a real objection.

`app.js` lines 151–155:

```js
var strongObj = result.objections.length && result.objections[0].score >= 2;
var flagsFirst = !strongObj &&
  (state.stage === "discovery" || state.stage === "transition" || state.stage === "introduction");
if (flagsFirst) { body += flagHtml + objHtml; }
else { body += objHtml + flagHtml; }
```

Methodologically the *late-call* branch is right: once you're past discovery,
an objection that scores ≥ 2 leads. And surfacing discovery flags first *during
discovery* is defensible — that is when you probe. But the failure mode: a
prospect can raise a genuine objection during the discovery/transition stage
(e.g. "honestly this sounds expensive" mid-discovery). If that objection scores
< 2 (one short trigger phrase — very common; `scoreTriggers` gives a 2-word
hit only `1 + 0.4 = 1.4`), `strongObj` is false, `flagsFirst` is true, and the
objection is rendered *below* the discovery flags. Cole's method does not
demote a live objection because of call stage — an objection is always handled
through diffuse → isolate the moment it appears (`00-core-framework.md` line 13,
`OBJECTION-PLAYBOOK.md` line 12: *"run this on EVERY objection first"*). The
fix: any matched objection should at minimum surface, and if an objection is
present it should not sit *below* flags purely because the keyword score is
low. Recommend: lead with objection whenever `result.objections.length` is
non-empty, regardless of stage; use flags-first only when there is **no**
objection match. The `score >= 2` gate conflates "the prospect objected" with
"the matcher is confident" — two different things.

### 4. The `step_2_isolate` text the app surfaces collapses uncertainty vs. logistic into the SAME question for every bucket — but Cole's isolate question is bucket-specific, and for a *financial* objection the isolate is value-vs-budget, not should/how.

`universal_framework.step_2_isolate`:

> "…are you more in a 'should I do this' place where you're not even 100%
> certain this is what you want, or a 'how can I do this' place where you're
> 100% certain and it's just a matter of logistics?"

This generic should/how isolate is correct as the *opening* move. But the
per-objection isolate Cole teaches for price is different — `OBJECTION-PLAYBOOK.md`
§1 and the JSON `price-too-expensive` step 1: *"do you mean you really want to
do it and physically don't have the budget, or do you mean you don't think the
investment is worth the value?"* The framework object presents `step_2_isolate`
as the universal isolate with no note that financial objections get a
value-vs-budget variant. Lower-risk than 1–3 (the per-objection `response_steps`
do carry the right variant), but the `universal_framework` block reads as the
canonical script and a rep glancing only at it will use the wrong isolate on
price. Add a one-line note that financial objections isolate on
value-vs-budget.

---

## SHOULD IMPROVE

### 5. `concession_rule` is faithful but omits the escalation clause Cole teaches.

JSON `concession_rule`:

> "…Trade every concession for a decision now … Going lower again? Also ask for
> a case study."

Correct and matches `00-core-framework.md` line 31 and `OBJECTION-PLAYBOOK.md`
line 31–32. The one improvement: `batch-5.md` line 34 and `batch-6.md` line 167
frame it as *"if I make concessions I ask for more"* — and the ask-for-more is
not only a case study but also a *commitment to show up / do the work*
(batch-5: *"will you give us a case study … will you promise me that you will
show up"*). The current rule names only the case study. Minor — add "and a
commitment to do the work" to the deeper-concession ask.

### 6. `smoke_screen_note` is good but understates the funnel-level smoke-screen rule.

JSON `smoke_screen_note` covers *"I want to think about it / it's too expensive
are usually smoke screens"* and the waffle-is-a-no rule. Both correct. What it
omits is the structural rule from `00-core-framework.md` line 135 /
`OBJECTION-PLAYBOOK.md` line 26: **a logistic (money/support/timing) handled
while uncertainty is unresolved is itself a smoke screen** — *"If you handle a
spouse without doing uncertainty first, you're handling a smoke screen."* That
is the single most important smoke-screen concept and it lives only in the
`rule` field, not in `smoke_screen_note`. Recommend folding the "logistic-
before-uncertainty = smoke screen" line into `smoke_screen_note` so the app's
smoke-screen guidance is complete.

### 7. `step_4_scale` is missing the rapport/alignment preamble Cole always uses before the 1–10 ask.

JSON `step_4_scale` jumps straight to *"on a scale of one to ten…"*. The
canonical scale ask (`00-core-framework.md` lines 92–98) opens with the
alignment frame: *"what's really important to me is alignment… we're rolling up
the sleeves… so what's important to us is that you feel good about the
process…"* That preamble is what makes the 1–10 question land as care rather
than interrogation. Not wrong as shipped, but a rep reading `step_4_scale`
verbatim will deliver the scale ask cold. Add the alignment preamble.

### 8. `step_3_temp_check` should explicitly carry the "and now is the right time" half.

`step_3_temp_check` asks *"is this 100% what you need… 100% going to work?"* —
the *belief* half. The source temp check is two-pronged: belief AND timing.
`00-core-framework.md` line 16 defines uncertainty as *"the right thing AND now
is the right time"* and `batch-1.md` rebuttal: *"this is what you need… and
now's the right time."* `step_5_double_tie_down` does include *"the right thing
and now is the right time"* — good — but `step_3` drops the timing half.
Mirror it into step 3.

---

## GAPS / MISSING

### 9. There is no `timing` bucket — yet the funnel names timing as one of the three logistics, and two objections (`timing-start-later`, `no-time-to-implement`) have nowhere correct to live.

`00-core-framework.md` line 133: *"the three below that are just logistics —
**timing**, financial, and spouse."* The funnel has FOUR tiers: uncertainty
(true objection) + three logistics (timing / financial / support). The JSON
`bucket` enum only has four values total — `financial`, `uncertainty`,
`support`, `process` — so timing has no home and the two timing objections are
parked in `uncertainty`. Either (a) add a `timing` bucket and move
`timing-start-later` into it, or (b) explicitly document that timing is folded
into `uncertainty` because Cole reframes timing as a priorities/certainty
problem (which the `no-time-to-implement` response_steps actually do). Right now
the buckets silently disagree with the funnel the framework cites. Pick one and
state it. (Recommendation: fold into `uncertainty` and document it — it matches
how the rebuttals actually work — but then fix the contradictory `type` tags
per Wrong #1.)

### 10. The `universal_framework` object has no field stating the ORDER of the funnel — the single most load-bearing rule.

The framework object has `rule`, five steps, `smoke_screen_note`,
`concession_rule`. It does NOT have an explicit `funnel_order` /
`objection_order` field. The iron rule — *handle uncertainty, then timing, then
financial, then support* (`00-core-framework.md` line 127–135) — is the spine
of the whole method and currently appears only as a clause inside the prose
`rule` string (*"Handle uncertainty FIRST, always."*). It does not enumerate
the logistic order. For an app whose entire ordering job is sequencing, the
funnel order deserves its own structured field, e.g.
`"funnel_order": ["uncertainty", "timing", "financial", "support"]`. The app
could then sort multiple simultaneous objections by bucket — which it currently
does NOT do (see Gap 11).

### 11. The app never sequences MULTIPLE simultaneous objections by bucket — it sorts only by keyword score.

`analyzeKeyword` (`app.js` line 72): `objs.sort((a,b)=>b.score-a.score)`.
If a prospect says something matching both a financial objection and an
uncertainty objection, the app surfaces whichever had the higher *keyword
score* first. Cole's method is unambiguous: uncertainty leads regardless
(`00-core-framework.md` line 24, line 132). A financial objection with a
strong keyword hit will out-rank an uncertainty objection with a weak hit, and
the rep is pointed at the logistic first — the exact "handling a smoke screen"
error the framework warns against. The sort should be: bucket priority first
(uncertainty → timing → financial → support → process), keyword score only as
the tie-breaker within a bucket. This is the most important fix in the slice
because it is the framework's central rule and the app actively violates it.

### 12. No objection is bucketed against the `support` smoke-screen explicitly, and `discuss-with-team` `type: logistic` is questionable.

`discuss-with-team` is tagged `bucket: support`, `type: logistic`. But its
own `response_steps` argue it is usually NOT a real logistic — *"your job as
CEO is to set the priority… you're not asking permission"* — i.e. Cole treats
"run it by my team" as frequently a certainty/authority dodge, not a true
support logistic, *unless* it is genuine implementer bandwidth. The `type`
should at least carry a note (like `price`'s nuance) that team is a logistic
only when it is genuine bandwidth; otherwise it routes back to uncertainty.
Lower priority than 1–3 but worth a `do_not` note.

### 13. `prospect-taking-control` has `bucket: process` and `type: process` — `process` is a valid pragmatic addition (not in Cole's 3-bucket model) but it is undocumented.

`00-core-framework.md` line 7 says *"Every objection collapses into one of
three"*. The JSON adds a fourth bucket, `process`, for the "just get to the
price" control objection. This is a reasonable extension — it genuinely isn't
one of the three — but nothing in `universal_framework` or the playbook
acknowledges that the app's bucket enum is *4* buckets, not Cole's 3. Add a
one-line note that `process` is an app-level bucket outside the 3-bucket
objection model (it's a call-control issue, handled before the objection phase,
not during it).

---

## SUMMARY OF FIXES (priority order)

1. **Gap 11** — sort simultaneous objections by bucket priority
   (uncertainty → timing → financial → support), keyword score as tie-breaker
   only. The app currently violates the framework's central rule.
2. **Wrong #3** — lead with an objection whenever one matched, not only when
   score ≥ 2; don't demote a live objection below discovery flags.
3. **Wrong #1** — fix the contradictory `type` on `timing-start-later` vs
   `no-time-to-implement`.
4. **Wrong #2** — replace `"logistic-or-smokescreen"` with a real `type`.
5. **Gap 9 / Gap 10** — resolve the missing `timing` bucket and add an explicit
   `funnel_order` field.
6. Improvements 4–8 and Gaps 12–13 — copy/metadata polish.
