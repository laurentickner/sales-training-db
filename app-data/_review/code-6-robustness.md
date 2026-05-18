# Code Review 6 — Robustness & Error Handling

App: Call Copilot (`app/app.js`, `app/index.html`). Scope: failure modes, edge cases, degradation. Reviewed 2026-05-18.

---

## CRITICAL

### C1. Malformed / partial `data/data.js` crashes the whole app on load
**Location:** `app.js:7-13`

The only guard is `if (!DATA) { alert(...); return; }`. If `data.js` loads but is malformed — e.g. `COPILOT_DATA` exists but `DATA.objections` is undefined, or `DATA.objections.objections` is missing, or `DATA.funnel.stages` is `[]` — the next four lines throw `TypeError: Cannot read properties of undefined`. The IIFE dies, no event listeners bind, and the page is a dead husk with no error shown to the user. A rep on a live call sees a frozen app and no explanation.

Also: because `data.js` loads via a plain `<script>` tag, a 404 or syntax error in that file is swallowed by the browser console — `window.COPILOT_DATA` is simply `undefined` and you get the `alert`, which at least is visible. But the partial-object case is the silent killer.

**Fix:** validate the shape before destructuring, and fail loudly with a useful message.

```js
var DATA = window.COPILOT_DATA;
function fail(msg) {
  document.body.innerHTML =
    '<div style="padding:40px;font-family:sans-serif;color:#b00">' +
    '<h2>Call Copilot can\'t start</h2><p>' + msg + '</p>' +
    '<p>Check that data/data.js is present and well-formed.</p></div>';
  throw new Error(msg);
}
if (!DATA) fail("data/data.js failed to load.");

function need(obj, path) {
  var cur = obj, parts = path.split(".");
  for (var i = 0; i < parts.length; i++) {
    if (cur == null || cur[parts[i]] == null) fail("data/data.js is missing: " + path);
    cur = cur[parts[i]];
  }
  return cur;
}
var OBJECTIONS = need(DATA, "objections.objections");
var FRAMEWORK  = need(DATA, "objections.universal_framework");
var FLAGS      = need(DATA, "discoveryFlags.flags");
var STAGES     = need(DATA, "funnel.stages");
if (!Array.isArray(OBJECTIONS) || !Array.isArray(FLAGS) || !Array.isArray(STAGES) || !STAGES.length)
  fail("data/data.js has empty or non-array core tables.");
```

Additionally guard each record's fields at render time — `o.triggers`, `o.response_steps`, `f.triggers`, `s.say` are all assumed to be arrays. One bad JSON record currently kills `analyzeKeyword` / `renderStageRef` for every input. Defensive default: `(o.triggers || [])`, `(o.response_steps || [])`, `(s.say || [])`.

### C2. `state.stage` can desync from `STAGES`, throwing on every analyze/render
**Location:** `app.js:120`, `app.js:196`, `app.js:280`

Three functions do `STAGES.filter(s => s.id === state.stage)[0]` and then immediately read `.name` / `.goal` off the result with no null check:
- `noneCard()` line 124: `esc(st.name)` — crashes the "no objection" card.
- `analyze()` line 197: `stObj.name` — crashes analyze entirely.
- `renderStageRef()` line 281: `esc(s.name)`.

`state.stage` is initialised to the hard-coded string `"discovery"` (line 17). If the funnel data does not contain a stage with `id === "discovery"` (rename, reorder, data regen), `stObj` is `undefined` and **the very first Analyze click throws** — the app appears broken from the first interaction. `newCall()` then sets stage to `"introduction"` (line 345), another hard-coded id that may not exist. Two separate hard-coded ids, neither validated against the data.

**Fix:** derive the default stage from the data, and make the lookup total.

```js
function stageById(id) {
  return STAGES.filter(function (s) { return s.id === id; })[0] || STAGES[0];
}
// init:
var state = { stage: STAGES[0].id, /* ... */ };
// newCall: setStage(STAGES[0].id);
// replace every STAGES.filter(...)[0] with stageById(state.stage)
```

### C3. Clicking a log entry mid-fetch corrupts the rendered guidance
**Location:** `app.js:178-188`, `app.js:257-265`

Sequence: rep types line A, smart mode is on → `renderCopilot` paints a `#smart-card` placeholder and `runSmart` fires an async fetch. Before it resolves the rep clicks an older log entry → `renderCopilot(entry.result, false)` replaces `#copilot.innerHTML`, **including the placeholder**. The fetch then resolves, `runSmart`'s `.then` does `$("smart-card")` → still finds an element *if a newer analyze re-created one*, or returns `null` (handled), **but in the common case the stale response from line A gets injected on top of whatever the rep is now looking at** — they're reading line C's keyword cards with line A's Claude answer stapled on. On a live call this is actively dangerous: wrong words to say.

Same bug for double-analyze: analyze line A (fetch in flight), analyze line B → B's placeholder. A resolves first and writes into B's `#smart-card`. There is no request-generation token tying a fetch result to the render it belongs to.

**Fix:** stamp each analyze with a monotonic id; the fetch callback no-ops if it is stale.

```js
var reqSeq = 0;
function analyze() {
  // ...
  var myReq = ++reqSeq;
  renderCopilot(result, useSmart);
  if (useSmart) runSmart(text, result, myReq);
}
function runSmart(text, kwResult, reqId) {
  fetch(/* ... */)
    .then(/* ... */)
    .then(function (j) {
      if (reqId !== reqSeq) return;            // stale — ignore
      var card = $("smart-card");
      if (card) card.outerHTML = smartCard(/* ... */);
    })
    .catch(function (e) {
      if (reqId !== reqSeq) return;            // stale — ignore
      var card = $("smart-card");
      if (card) card.outerHTML = smartCard(/* ... */, true);
    });
}
```
Also bump `reqSeq` inside the log-click handler and `newCall()` so any in-flight fetch is invalidated when the rep navigates away.

### C4. No fetch timeout — smart mode can hang the copilot indefinitely
**Location:** `app.js:238-266`

There is no timeout on the Anthropic call. If the network stalls (captive portal, dropped wifi, mid-call hotspot handoff), the `#smart-card` shows "Claude is reading the call…" **forever**. The rep is mid-objection waiting on a card that will never arrive, with no signal that it failed. `fetch` itself never rejects on a hang.

**Fix:** abort after a hard ceiling (8–12 s is generous for Haiku) using `AbortController`.

```js
var ctrl = new AbortController();
var to = setTimeout(function () { ctrl.abort(); }, 12000);
fetch("https://api.anthropic.com/v1/messages", {
  method: "POST", signal: ctrl.signal, headers: {/*...*/}, body: /*...*/
})
  .then(function (r) { clearTimeout(to); /* ... */ })
  .catch(function (e) {
    clearTimeout(to);
    if (reqId !== reqSeq) return;
    var msg = e.name === "AbortError"
      ? "Claude timed out — use the keyword cards below."
      : "Smart mode failed: " + e.message;
    var card = $("smart-card");
    if (card) card.outerHTML = smartCard(esc(msg), true);
  });
```
Note `clearTimeout` must run in both `.then` and `.catch`, and the error branch should still honour the C3 staleness check.

---

## SHOULD FIX

### S1. `localStorage` access is unguarded — throws in private mode / when disabled
**Location:** `app.js:19-20`, `app.js:306-307`

`localStorage.getItem` (init) and `localStorage.setItem` (saveSettings) are called bare. In Safari private browsing, with storage disabled by policy, or when the quota is full, `setItem` throws `QuotaExceededError` and `getItem` can throw a `SecurityError`. A throw at line 19-20 happens **during the IIFE before `init()`** → same dead-app failure as C1. A throw in `saveSettings` (line 306) means settings silently aren't saved *and* `updateModeBadge()` / `closeSettings()` never run — the modal stays open with no feedback.

**Fix:** wrap in a safe shim.

```js
var store = {
  get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
};
// init: apiKey: store.get("copilot_api_key") || "", smart: store.get("copilot_smart") === "1"
// saveSettings: var ok = store.set(...) && store.set(...);
//   if (!ok) alert("Couldn't save settings (browser storage is unavailable). Smart mode will work for this session only.");
```
Settings should still apply in-memory for the session even when persistence fails.

### S2. Rapid repeated Analyze clicks pile up duplicate log entries and parallel fetches
**Location:** `app.js:192-204`, `app.js:355-358`

Nothing debounces `analyze()`. `analyze` does clear the textarea (line 199), which mostly prevents a true double-submit of *identical* text — but a fast double-tap or holding Enter can fire twice before the value clears, producing two log entries and two billed API calls. There is also no disabled state on the button while a fetch is in flight, so the rep gets no feedback that work is happening.

**Fix:** guard with a flag and reflect it in the UI.

```js
var analyzing = false;
function analyze() {
  if (analyzing) return;
  var text = $("input").value.trim();
  if (!text) return;
  analyzing = true;
  $("btn-analyze").disabled = true;
  try { /* existing body */ }
  finally { analyzing = false; $("btn-analyze").disabled = false; }
}
```
(If you want the button to stay disabled until the *fetch* resolves, clear it in the `runSmart` callbacks instead — but keyword mode is instant so a synchronous guard is enough to stop double-logging.)

### S3. Extremely long pasted input — no length cap, performance and cost risk
**Location:** `app.js:31` (`norm`), `app.js:193`, `app.js:250`

`norm()` runs three regex passes over the full string with no ceiling. A rep pasting an entire call transcript (tens of KB) makes every `scoreTriggers` call run `indexOf` across a huge string for every trigger of every objection and flag — sluggish, and the substring matcher will spuriously hit on a long transcript. Worse, the **entire blob is sent verbatim to the Anthropic API** (line 250) inside a 400-`max_tokens` request — large input, real cost, and the model is being asked to react to one "line" that is actually the whole call. It is also rendered into the log via `esc()` with no truncation, bloating the DOM.

**Fix:** cap input length before processing, and truncate in the log display.

```js
var MAX_INPUT = 2000; // chars — one spoken turn, not a transcript
function analyze() {
  var text = $("input").value.trim();
  if (!text) return;
  if (text.length > MAX_INPUT) {
    text = text.slice(0, MAX_INPUT);
    // optional: toast "Trimmed to last 2000 chars — paste one line at a time"
  }
  // ...
}
```
In `renderLog`, cap the displayed text (`e.text.length > 280 ? e.text.slice(0,280)+"…" : e.text`) so a long entry doesn't dominate the log panel. Add `maxlength="2000"` to the `<textarea>` in `index.html` as a first line of defence.

### S4. Long call log — unbounded DOM growth, full re-render every analyze
**Location:** `app.js:169-189`, `app.js:200`

`renderLog()` rebuilds the **entire** log list with `innerHTML` and re-attaches a click listener to every entry on every single analyze. At 100+ entries this is O(n) DOM churn per turn and a steadily growing node count — noticeable jank on a long call, exactly when the rep needs responsiveness. The reversed `.slice().reverse()` allocates a fresh array each time too (minor).

**Fix (low-effort):** prepend only the new entry instead of re-rendering.

```js
function prependLogEntry(e) {
  var el = $("log");
  if (state.log.length === 1) el.innerHTML = ""; // clear "Nothing logged yet"
  var div = document.createElement("div");
  div.className = "log-entry";
  div.setAttribute("data-id", e.id);
  div.innerHTML =
    '<div class="log-time">' + esc(e.time) + " · " + esc(e.stageName) + "</div>" +
    '<div class="log-text">' + esc(e.text) + "</div>" +
    '<div class="log-tags">' + tagsFor(e.result) + "</div>";
  div.addEventListener("click", function () { /* select handler */ });
  el.insertBefore(div, el.firstChild);
}
```
Keep `renderLog()` as the full-rebuild path for `newCall()`. Alternatively use a single delegated click listener on `#log` (read `data-id` from `e.target.closest(".log-entry")`) so listeners don't multiply. Optionally cap `state.log` length (e.g. keep last 200) to bound memory on marathon calls.

### S5. API error surfaces raw HTTP body to the rep — unhelpful and leaky
**Location:** `app.js:253-254`, `app.js:262-265`

On a non-2xx response the code throws `"HTTP " + r.status + " — " + t.slice(0, 160)` and renders that raw string into the smart card. A rep mid-call sees `HTTP 401 — {"type":"error","error":{"type":"authentication_error",...`. The distinct cases each deserve a plain-language line:
- **401** — "Your API key is invalid — check it in Settings."
- **429** — "Rate limited — keyword cards below still work."
- **529** — "Claude is overloaded right now — using keyword cards."
- **400** — usually a malformed/oversized request (ties to S3).
- network reject — "No connection to Claude — keyword cards below still work."

**Fix:** map status to a friendly message.

```js
.then(function (r) {
  if (r.ok) return r.json();
  var msg = ({
    401: "Your API key is invalid — check it in Settings.",
    429: "Claude is rate-limited — keyword cards below still apply.",
    500: "Claude had a server error — keyword cards below still apply.",
    529: "Claude is overloaded — keyword cards below still apply."
  })[r.status] || ("Claude error (HTTP " + r.status + ").");
  throw new Error(msg);
})
```
The keyword cards always render regardless, so smart-mode failure is a graceful degrade — but only if the message says so calmly instead of dumping JSON.

### S6. Malformed Anthropic response handled only partially
**Location:** `app.js:257-258`

`var out = (j.content && j.content[0] && j.content[0].text) ? ... : "(no response)"` guards a missing `content`, but **not** the documented error-shaped 200 (Anthropic can return `{type:"error",...}` with a 200 in streaming/edge cases) and not a `stop_reason: "max_tokens"` truncation. If `j.content[0].type` is `"tool_use"` (shouldn't happen here, but defensively) `.text` is undefined → "(no response)" is at least safe. Also if `r.json()` itself throws on a non-JSON body, that rejects into `.catch` — fine, but the message will be the generic JSON parse error.

**Fix:** check for the error shape explicitly and flag truncation.

```js
.then(function (j) {
  if (reqId !== reqSeq) return;
  if (j && j.type === "error") throw new Error(j.error && j.error.message || "Claude returned an error.");
  var block = j && j.content && j.content[0];
  var out = (block && block.text) ? block.text : "(no usable response from Claude)";
  if (j && j.stop_reason === "max_tokens") out += "\n…(cut off — response hit the length limit)";
  // render
})
```

---

## NICE TO HAVE

### N1. Empty / whitespace / punctuation-only / emoji-only input degrades quietly but unhelpfully
**Location:** `app.js:193`, `app.js:31`

`analyze()` already returns early on empty/whitespace via `.trim()` (good). But input that is *only* punctuation or emoji (`"!!!"`, `"🔥🔥"`, `"???"`) survives the trim, then `norm()` strips it to a bare `" "` string — `analyzeKeyword` returns zero matches → `noneCard()`. Functionally safe, but the rep gets a "keep running the stage" card for input that was actually meaningless, and it still costs a log entry + (in smart mode) an API call on garbage. Consider: after `norm()`, if the normalised string has no alphanumeric content, show a soft hint ("Type what the prospect said in words") instead of logging and calling the API.

### N2. Non-English input silently produces zero keyword matches
**Location:** `app.js:31`

`norm()`'s regex `[^a-z0-9$ ]+` strips every non-ASCII letter, so Spanish/accented/CJK input is reduced to spaces and never matches a trigger. The app degrades to "no objection" with no indication of *why*. Not a crash, and smart mode (if on) still handles it — but worth a note in the UI that the keyword engine is English-only, or widening the regex to keep Unicode letters (`\p{L}` with the `u` flag) if non-English calls are in scope.

### N3. `Date.now()` log ids can collide on a fast double-submit
**Location:** `app.js:197`

`id: Date.now()` — two analyzes within the same millisecond get the same id. The log-click handler does `state.log.filter(x => x.id === id)[0]` and would select the wrong (first) entry. Rare, and S2's debounce makes it rarer, but a monotonic counter (`var nextId = 1; id: nextId++`) is free and correct.

### N4. `exportLog()` leaks the object URL and can fail silently in `file://`
**Location:** `app.js:331-335`

`URL.createObjectURL(a.href)` is never revoked — minor memory leak per export. Add `setTimeout(function(){ URL.revokeObjectURL(a.href); }, 0)` after `a.click()`. Also, programmatic-download via `a.click()` is unreliable in some `file://` contexts; if export silently does nothing, that is the cause — consider a fallback that opens the text in a new tab.

### N5. No re-entrancy guard on `newCall()` confirm
**Location:** `app.js:337-346`

`newCall()` reads `confirm()` synchronously, so it can't truly re-enter — fine. But note it does **not** invalidate an in-flight smart fetch (covered by C3's `reqSeq` bump) and does not reset the analyze guard (S2). After C3/S2 land, make sure `newCall()` does `reqSeq++` and `analyzing = false` so a fresh call starts from a clean slate even if the previous call had a pending fetch.

### N6. Settings modal `Esc` key doesn't close it
**Location:** `app.js:364-366`

Backdrop click closes the modal; `Esc` does not. Minor, but reps reach for `Esc` reflexively. Add a `keydown` listener on `document` that calls `closeSettings()` when `e.key === "Escape"` and the modal lacks `.hidden`.

---

## Summary of failure-mode coverage

| Scenario | Current behaviour | After fix |
|---|---|---|
| `data.js` 404 | `alert`, dead page | clear in-page error (C1) |
| `data.js` malformed/partial | silent `TypeError`, dead app | named-field error (C1) |
| Stage id not in data | first Analyze throws | falls back to `STAGES[0]` (C2) |
| Log click mid-fetch | stale Claude answer injected | stale fetch discarded (C3) |
| Network hang | "reading…" forever | 12 s timeout + message (C4) |
| localStorage disabled/full | dead app on load / silent save fail | safe shim, session-only (S1) |
| Double Analyze | dup log + dup API call | debounced (S2) |
| Huge paste | jank + cost + DOM bloat | capped at 2000 chars (S3) |
| 100+ log entries | full re-render each turn | incremental prepend (S4) |
| 401/429/529 | raw JSON dumped to rep | plain-language degrade (S5) |
| Malformed API 200 | partial guard | error-shape + truncation handled (S6) |
