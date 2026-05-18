# Code Review 2 — The Matching Engine

Scope: `norm()`, `scoreTriggers()`, `analyzeKeyword()`, `renderCopilot()` ordering in `app/app.js`;
trigger data in `objection-responses.json` (286 triggers) and `discovery-flags.json` (214 triggers).

Verdict: the engine works for clean, full-phrase input but is **fragile on live-call input**. The
substring matcher bleeds false positives, single-word triggers fire on unrelated words, there is no
typo/synonym tolerance, and there is no confidence threshold — every non-zero score surfaces a card.

---

## CRITICAL

### C1. Substring matching bleeds across word boundaries — false positives
**Location:** `scoreTriggers()`, line 45 — `inputNorm.indexOf(tn.trim()) !== -1`

The direct-hit path is a raw substring test. `tn.trim()` has no surrounding spaces, so a trigger
matches *inside* a longer word/phrase. Verified: trigger `"a month"` (a real discovery-flag trigger)
matches the input `"we do this on a monthly basis"` because `"a month"` is a substring of
`"a monthly"`. Same class of bug: `"deal"` matches `"dealership"`, `"figures"` is safe only because
it has spaces but `"in"`-style fragments inside multi-word triggers are not. On a live call this
fires a discovery flag the rep then wastes time probing.

**Fix:** the trigger is already normalized with leading/trailing spaces by `norm()`. Match on the
*space-padded* form so both ends are word-bounded, instead of `.trim()`:

```js
// tn is already " a month " from norm(t)
var padded = tn;                       // keep the surrounding spaces
if (padded.length > 3 && inputNorm.indexOf(padded) !== -1) {
  score += 1 + Math.min(words.length - 1, 4) * 0.4;
  hits.push(t);
}
```

This makes `" a month "` no longer match `" a monthly basis "`. Apply the same padding everywhere a
trigger is compared (the partial path on line 53 already pads correctly — only the direct path is
broken).

### C2. Single-word triggers cause unrelated cards to fire
**Location:** trigger data — 19 single-word objection triggers, 27 single-word flag triggers

Triggers like `"maybe"`, `"deal"`, `"risky"`, `"forever"`, `"million"`, `"figures"`, `"freedom"`,
`"anyway"`, `"comparing"`, `"possibly"` each get a **base score of 1** on a bare substring hit — the
same weight a deliberate 2-word objection phrase gets. A rep typing *"sounds great, maybe Tuesday
works"* fires a nerves/uncertainty objection. *"they want freedom"* (a legitimate desired-outcome
statement) fires a discovery flag. These words are common filler and carry almost no objection
signal on their own.

**Fix (two parts):**
1. Weight by specificity — a 1-word trigger should score *below* the surfacing threshold on its own,
   only contributing as corroboration:
   ```js
   var base = words.length === 1 ? 0.4 : 1;
   score += base + Math.min(words.length - 1, 4) * 0.4;
   ```
2. Combined with the confidence threshold in S1 (require score ≥ ~1.0 to surface), a lone
   `"maybe"` (0.4) no longer produces a card, but `"maybe later"` + `"too busy"` still does.
   Audit the data files and either delete the weakest single-word triggers (`maybe`, `anyway`,
   `deal`, `forever`, `million`) or accept they only count as corroboration.

### C3. Contractions are destroyed by normalization → false negatives
**Location:** `norm()`, line 31 — `replace(/[^a-z0-9$ ]+/g, " ")`

Apostrophes are stripped to spaces, so `can't` becomes two tokens `can t`. The direct path still
works (the trigger `"can't afford it"` normalizes to `" can t afford it "`, matching identically),
**but the partial-word path silently drops the `"t"` token** (`words[w].length > 2` filter) and
also `"can"` is borderline. Worse, a rep who types `cant` (no apostrophe — extremely common when
typing fast) produces token `cant`, which never matches the trigger token `can`. Result:
`"cant afford it"` typed in a hurry misses the price objection entirely.

**Fix:** collapse contractions *before* stripping punctuation, so `can't` and `cant` both normalize
to a canonical form:
```js
function norm(s) {
  var x = String(s).toLowerCase()
    .replace(/['’]/g, "")                     // can't -> cant, dont -> dont
    .replace(/\b(can)not\b/g, "$1");          // optional: cannot -> can
  x = x.replace(/[^a-z0-9$ ]+/g, " ").replace(/\s+/g, " ").trim();
  return " " + x + " ";
}
```
Then normalize the *triggers* the same way (already happens — `norm(t)`), so `"can't afford it"` →
`" cant afford it "` and both spellings match. Audit triggers for other apostrophe forms
(`I'm`, `don't`, `won't`, `it's`).

---

## SHOULD FIX

### S1. No confidence threshold — every non-zero score surfaces a card
**Location:** `analyzeKeyword()`, lines 66 & 70 — `if (r.score > 0)`

Any score above 0 produces a card. The partial path awards `0.5` for a 2-word trigger when 70% of
its words appear *anywhere* in the input as separate tokens — they need not be adjacent or related.
Input *"the price of freedom"* can trip a partial flag match. On a live call a borderline 0.5 match
is noise that costs the rep attention.

**Fix:** require a minimum confidence to surface, and keep the top-3 cap:
```js
var MIN_SCORE = 1.0;   // a lone partial (0.5) or lone 1-word trigger (0.4) no longer surfaces
if (r.score >= MIN_SCORE) objs.push({ ... });
```
Pair with C2's weighting. Two corroborating partials (0.5 + 0.5 = 1.0) still surface — that is the
intended "weak signal × 2" case.

### S2. Partial-word path ignores token adjacency and order
**Location:** `scoreTriggers()`, lines 49–56

For a trigger like `"too expensive"`, the partial path fires if both `too` and `expensive` appear
*anywhere* in the input — `"too many options, not expensive enough proof"` would partially match.
It also treats a 3-word trigger as matched when any 2 of 3 words appear (`ceil(3*0.7)=3` — actually
needs all 3 here, but `ceil(4*0.7)=3` for a 4-word trigger means 1 word can be missing and order is
irrelevant). This inflates false positives.

**Fix:** either (a) require the matched words to appear within a short window, or (b) drop the
free-floating partial path and rely on a fuzzy *phrase* match instead (see N1 stemming). Minimum:
raise the ratio to `0.8` and require ≥3 words before the partial path is even eligible, so 2-word
triggers must hit as a full phrase:
```js
} else if (words.length >= 3) {
  var present = 0; /* ... */
  if (present >= Math.ceil(words.length * 0.8)) { score += 0.5; hits.push(t); }
}
```

### S3. No stemming → plurals / tenses miss
**Location:** `scoreTriggers()` — exact-token comparison only

`"I'm comparing"` matches the flag trigger `"comparing"`, but `"I compared three vendors"` or
`"we'll compare"` does not. `"too expensive"` matches; `"the expense"` does not.
`"that worried me"` matches `"worried"`; `"it worries me"` does not. A rep paraphrases constantly —
exact-token matching misses a large fraction of real objections (false negatives, the costly kind).

**Fix:** apply a light stemmer (Porter-lite is overkill; a small suffix-strip is enough) to *both*
the input tokens and the trigger tokens before comparison:
```js
function stem(w) {
  return w.replace(/(ing|ed|es|s)$/, "")
          .replace(/(.)\1$/, "$1");   // collapse doubled final consonant (worri-ed handled above)
}
```
Build a stemmed token set of the input once in `analyzeKeyword()` and compare stemmed trigger
tokens against it. Keep the raw substring path for exact multi-word phrases (precision) and add the
stemmed-token path for recall.

### S4. `score >= 2` strong-objection ordering rule is brittle
**Location:** `renderCopilot()`, line 151 — `result.objections[0].score >= 2`

Score 2 is reached by a single 3-word trigger (`1 + 2*0.4 = 1.8` — actually does *not* reach 2) or a
4-word trigger (`1 + 3*0.4 = 2.2`), or two separate hits. So whether an objection "leads" the card
stack depends on the arbitrary word-count of whichever trigger phrase the data author happened to
write, not on match confidence. A real, unambiguous 2-word objection (`"too expensive"`, score 1.4)
never leads during a discovery stage even though it is a hard objection the rep must address now.

**Fix:** decide ordering on *match quality*, not raw score. Promote any objection that had a
**direct full-phrase hit** (precise) regardless of phrase length:
```js
var strongObj = result.objections.length &&
  (result.objections[0].score >= 2 || result.objections[0].directHit);
```
Have `scoreTriggers()` return a `directHit` boolean (true if the direct substring path fired at
least once). A confirmed phrase match is a stronger leading signal than an inflated partial score.

### S5. Duplicate triggers across items waste a slot and confuse ranking
**Location:** trigger data

`"way more than i thought"` is a trigger for **both** "It's too expensive" and "Your competitor is
cheaper". `"i don't know"` triggers both "Nerves/fear" and "Prospect is waffling". When the input
contains one of these, two cards fire with identical scores and the `.sort()` tie-break is
non-deterministic (insertion order). The rep sees a 50/50 guess presented as two equal objections.

**Fix:** de-dupe triggers — each phrase should belong to its single best-fit objection. For
genuinely ambiguous phrases, keep them only on the broader/more-common objection, or add a
tie-break in the sort (e.g. prefer the objection whose *most-specific* trigger matched).

---

## NICE TO HAVE

### N1. No typo tolerance
A rep typing on a live call produces `expnsive`, `affraid`, `competetor`. None match. A bounded
edit-distance check (Levenshtein ≤1 for tokens ≥6 chars) on the stemmed-token path would catch the
common single-char slips without exploding false positives. Keep it gated to longer words so short
tokens aren't fuzzed into noise.

### N2. No synonym map
`"pricey"`, `"steep"`, `"a lot"` are hand-listed per objection, but coverage is uneven and
maintenance-heavy. A small shared synonym table (`{ costly: "expensive", dear: "expensive",
hesitant: ["nervous","unsure"] }`) applied during normalization would cover gaps without editing
500 trigger arrays.

### N3. Very short / empty / punctuation-only input
`analyze()` guards empty string (line 193), but a 1-char input like `"k"` or `"?"` normalizes to
`" "` and silently produces a "no objection" card — fine, but consider a minimum-length hint
("type a full sentence") so the rep knows the engine had nothing to work with rather than assuming
the line was clean. Punctuation-only input (`"..."`) → empty norm → noneCard; acceptable but worth
an explicit check.

### N4. `pips()` rounds score into 1–3 with `Math.round` — visual confidence is coarse
A score of 1.4 and 1.6 both an objection, render as 1 vs 2 pips purely on rounding. Once a real
confidence threshold (S1) exists, map pips off a normalized confidence band
(`<1.5` = low, `1.5–2.5` = med, `≥2.5` = high) so the pip count means something consistent to the
rep glancing at it mid-call.

### N5. Recompute cost
`scoreTriggers()` calls `norm(t)` on all 500 triggers on every keystroke-analyze. Triggers are
static — normalize them once at load into a parallel array (`o._normTriggers`). Not a correctness
issue, but it removes 500 regex passes per analyze and makes a future fuzzy/stemmed path affordable.
