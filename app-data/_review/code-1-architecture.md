# Code Review — Architecture & Code Quality (app.js)

Scope: structure, maintainability, JS correctness, latent bugs, naming, dead code.
Reviewed: `app/app.js` (372 lines), `app/index.html`, `app/styles.css` (skim).

Overall the file is well-organised for a no-build single-file app: clear section banners,
an IIFE with `"use strict"`, one `state` object, consistent ES5 style, and HTML escaping via
`esc()` applied at almost every interpolation point. The matching engine and render layer are
cleanly separated. The issues below are mostly latent bugs that will surface as the data set
or feature set grows toward v2.

---

## CRITICAL

### 1. `setStage` is called with an invalid id at startup → guaranteed crash if "introduction" stage is renamed/removed
`newCall()` (line 345) and the v1 expectation both call `setStage("introduction")`, and
several render functions do `STAGES.filter(... s.id === state.stage)[0]` then immediately
dereference the result (`.name`, `.goal`, `.say`). There is **no guard** for the lookup
returning `undefined`:

- `noneCard()` line 120–124: `var st = STAGES.filter(...)[0];` then `esc(st.name)`.
- `analyze()` line 196–197: `var stObj = STAGES.filter(...)[0];` then `stObj.name`.
- `renderStageRef()` line 280–281: `var s = STAGES.filter(...)[0];` then `esc(s.name)`.

`state.stage` defaults to `"discovery"` (line 17) but `newCall()` sets `"introduction"`.
If either id is ever absent from `funnel.stages` (data edit, typo in `app-data/*.json`,
build drift), every one of these throws `TypeError: Cannot read properties of undefined`
and the app dies mid-call with no message. For a "live on a sales call" tool this is the
worst possible failure mode.

Fix — add one resolver and use it everywhere, with a safe fallback:
```js
function currentStage() {
  return STAGES.filter(function (s) { return s.id === state.stage; })[0] || STAGES[0];
}
```
Replace the three inline `STAGES.filter(...)[0]` lookups (lines 120, 196, 280) with
`currentStage()`. Also validate `state.stage` at init: if no stage matches, reset to
`STAGES[0].id`.

### 2. Smart-mode card can be silently dropped, or worse, replace the wrong card
`renderCopilot()` (line 157) does `c.innerHTML = body` which **destroys all existing DOM**,
including any in-flight `#smart-card`. `runSmart()`'s callbacks (lines 259, 263) do
`$("smart-card")` and call `.outerHTML = ...` on it. Race scenarios:

- Rep analyzes line A (smart request fires), then analyzes line B before A resolves.
  `renderCopilot` for B rebuilds `#copilot`. When A's response lands it finds the **new**
  `#smart-card` (belonging to B) and overwrites B's loading card with **A's answer** — stale
  guidance shown for the wrong prospect line. On a live call this is actively dangerous.
- Or the rep clicks a log entry (`renderCopilot(entry.result, false)`, line 183) which
  passes `smartPlaceholder=false`, so no `#smart-card` exists; A's callback then no-ops
  (`if (card)`), silently losing the answer.

The `if (card)` guard prevents a crash but not the wrong-line bug. Fix — tag each request
with the log entry id and verify before writing:
```js
function runSmart(text, kwResult, requestId) {
  // ...
  .then(function (j) {
    var card = $("smart-card");
    if (card && card.getAttribute("data-req") === String(requestId)) {
      card.outerHTML = smartCard(esc(out).replace(/\n/g, "<br>"), false);
    }
  })
```
Have `smartCardLoading()` emit `data-req="<id>"`, pass `entry.id` from `analyze()` into both
`renderCopilot` and `runSmart`, and stamp it onto the loading card. An `AbortController`
stored on `state` and aborted at the top of `analyze()` is the cleaner long-term fix.

---

## SHOULD FIX

### 3. `pips()` is missing its closing `</span>` — malformed HTML
`pips()` (lines 78–83) opens `<span class="scorepips">`, appends three `<span class="pip">`,
then `return html + "</span>"` — that closes the **last pip's** span conceptually but the
count is: 1 outer open + 3 pip opens + 3 pip self-closes... actually each pip is written as
`'<span ...></span>'` (self-contained), so there are 3 balanced pip spans plus 1 unclosed
`scorepips` opener, and the single trailing `</span>` closes it. **It happens to balance**,
but only by coincidence of the inline-closed pips. It's fragile and hard to read. Make the
structure explicit:
```js
function pips(score, kind) {
  var n = Math.min(3, Math.max(1, Math.round(score)));
  var inner = "";
  for (var i = 0; i < 3; i++) inner += '<span class="pip ' + (i < n ? "on-" + kind : "") + '"></span>';
  return '<span class="scorepips">' + inner + '</span>';
}
```

### 4. `esc()` does not escape `'` — safe today, a latent XSS as usage spreads
`esc()` (lines 25–29) escapes `& < > "` but not `'`. Every current attribute in app.js uses
double quotes, so it's fine *now*. But the function is the app's single trusted escaper; the
moment anyone writes a single-quoted attribute (`data-x='...'`) with `esc()`'d content,
injection is live. Add the apostrophe:
```js
return String(s).replace(/[&<>"']/g, function (c) {
  return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
});
```
(Security reviewer owns the threat model; flagging here as a code-quality landmine.)

### 5. `analyze()` mutates `state.log` and re-renders the whole log on every keystroke-submit — O(n) growth, no cap
`analyze()` (line 198) does `state.log.push(entry)`, then `renderLog()` (line 200) which
rebuilds the entire log DOM via `innerHTML` **and re-attaches a click listener to every
entry** (lines 178–188). After 50 analyzed lines that's 50 listener attachments per submit.
For a long discovery call this degrades and leaks. Fix — use event delegation: attach **one**
listener to `#log` in `init()` and resolve the target via `e.target.closest(".log-entry")`.
This also removes the per-render listener churn entirely. Consider a soft cap or virtualized
render if v2 (audio notetaker) produces continuous transcript entries — `innerHTML` rebuild
of an unbounded log will not survive that.

### 6. Log entry id uses `Date.now()` — collides on fast double-submit
`analyze()` line 197: `id: Date.now()`. Pressing Enter twice within the same millisecond
(or paste-spam) yields two entries with the same id. `renderLog()`'s click handler then does
`state.log.filter(x => x.id === id)[0]` (line 181) and always selects the first match — the
wrong entry. Use a monotonic counter:
```js
var nextId = 1;
// ...
var entry = { id: nextId++, time: nowTime(), ... };
```

### 7. Smart-mode "off" path still leaves stale smart card on screen
When the rep analyzes with smart mode ON, gets a smart card, then disables smart mode in
settings and analyzes again, `renderCopilot(result, false)` rebuilds `#copilot` without a
smart card — fine. But if smart mode is on and `runSmart` is mid-flight when the rep clicks
a **log entry** (line 183, `renderCopilot(entry.result, false)`), the loading card vanishes
and the eventual response is dropped (see #2). Functionally tied to #2; the fix there
resolves it. Worth an explicit note in code.

### 8. `noneCard()` / stage lookups duplicated 3× — DRY
The exact pattern `STAGES.filter(function (s) { return s.id === state.stage; })[0]` appears
at lines 120, 196, 280. Collapse into `currentStage()` (see #1). Reduces surface area for
the crash in #1 and makes the stage contract single-sourced — important before v2 adds more
stage-dependent rendering.

### 9. No validation of `DATA` shape beyond top-level existence
Line 8 guards `window.COPILOT_DATA` but lines 10–13 then blindly dereference
`DATA.objections.objections`, `DATA.objections.universal_framework`,
`DATA.discoveryFlags.flags`, `DATA.funnel.stages`. A malformed `data.js` (build script bug,
partial regen) throws an uncaught `TypeError` at module-eval time and the app is a blank
page. Add a shape check:
```js
function need(v, name) { if (!v) throw new Error("data/data.js missing " + name); return v; }
var OBJECTIONS = need(DATA.objections && DATA.objections.objections, "objections");
// ... etc, wrapped so the catch can alert() a clear message.
```

---

## NICE TO HAVE

### 10. `renderCopilot`'s ordering logic is a good comment but a fragile literal-list
Lines 152–153 hard-code `state.stage === "discovery" || ... === "transition" || ... ===
"introduction"`. If funnel stage ids change in the JSON this silently stops working with no
error. Move the "leads with flags" property into the funnel data (`stage.leadsWith: "flags"`)
so the data file owns it, not a string literal in the renderer.

### 11. Render functions build HTML by string concatenation — fine for v1, a tax for v2
`objectionCard`, `flagCard`, etc. are long `h += '...'` chains. Readable enough now, but as
v2 adds live-transcript cards this style gets error-prone (see the `pips()` near-miss in #3).
Not worth rewriting now; if v2 grows the card variety, consider a tiny `el(tag, attrs,
children)` helper or template literals. Flagging so it's a conscious choice, not drift.

### 12. `state.smart` truthiness is correct but `saveSettings` stores `state.smart ? "1":"0"` while init reads `=== "1"` — asymmetric with the apiKey
Minor: `apiKey` is stored/read as a raw string, `smart` as `"1"/"0"`. Consistent enough, but
a single `loadState()` / `persistState()` pair would centralise localStorage keys
(`"copilot_api_key"`, `"copilot_smart"` are string literals in 4 places: lines 19, 20, 306,
307). One typo there = silent persistence bug.

### 13. `exportLog()` never revokes the object URL
Line 333: `a.href = URL.createObjectURL(blob)` with no matching `URL.revokeObjectURL`. One
leaked blob URL per export — negligible for v1, but free to fix:
```js
a.click();
setTimeout(function () { URL.revokeObjectURL(a.href); }, 0);
```

### 14. `analyze()` reads `$("input")` three times
Lines 193, 199 (and conceptually). Cache it: `var inputEl = $("input");`. Trivial; improves
readability.

### 15. Dead/unused: `FRAMEWORK.step_3` / `step_4`
`buildSystemPrompt()` (line 218) uses `step_1_diffuse`, `step_2_isolate`,
`step_5_double_tie_down` but not steps 3–4. Likely intentional (prompt brevity), but a
one-line comment saying so would stop a future reader "fixing" the gap.

### 16. Naming nits
- `m` is used for "match object" in `objectionCard(m)`, `flagCard(m)`, `tagsFor` — fine but
  terse; `match` would read better in a growing codebase.
- `h` for the HTML accumulator is used in 6 functions; consistent, acceptable.
- `norm()` / `esc()` / `$()` are good. `pips()` is slightly cryptic — `scorePips` is clearer.

---

## What's solid (no change needed)
- IIFE + `"use strict"` + single `state` object is the right shape for a no-build app.
- `esc()` is applied consistently at interpolation sites (the one gap is `'`, item #4).
- Section banner comments make the file easy to navigate.
- `init()` correctly handles both `readyState === "loading"` and already-loaded cases.
- Matching engine (`scoreTriggers`/`analyzeKeyword`) is cleanly separated from rendering —
  this is the single best architectural decision in the file and will pay off in v2.
- Settings modal close-on-backdrop (line 364–366) is correctly scoped to `e.target`.
