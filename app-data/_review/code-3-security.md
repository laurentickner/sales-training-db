# Security Review — Call Copilot

Scope: XSS / safe input handling, API key handling, the Anthropic fetch, export Blob, localStorage, DOM-clobbering. Reviewer 3 of 7 (security).

App is pure HTML/CSS/JS, opens via `file://`. The rep types or **pastes arbitrary text**; that text is rendered into the DOM via `innerHTML`. There is no server, no Content-Security-Policy, no framework auto-escaping. Every `innerHTML` write is a hand-rolled escape — so escaping discipline is the entire defence.

Verdict up front: the **XSS surface is actually well covered** — `esc()` is applied to every piece of user-typed text and to the Claude response. The real exposures are (1) `esc()` does not escape the single-quote, which is exploitable in one specific spot, and (2) API-key handling has weaknesses that matter more given a key is a live credential. Details below, with exact locations and whether each is genuinely exploitable.

---

## CRITICAL

### C1. `esc()` does not escape `'` (single quote) — exploitable via the matched-trigger meta line

**Vector:** `esc()` (app.js:25-29) escapes `& < > "` but **not** `'`. That is normally safe *because* every `esc()` output lands between HTML tags or inside double-quoted attributes. But there is one path where escaped user-influenced text is concatenated and the result is fine — and one genuinely dangerous interaction worth being precise about.

Look at `objectionCard` / `flagCard`:

```js
h += '<div class="card-meta">Bucket: ' + esc(o.bucket) +
     ' &nbsp;·&nbsp; matched: ' + esc(m.hits.slice(0, 4).join(", ")) + " " + pips(m.score, "obj") + "</div>";
```

`m.hits` are **trigger strings from the trusted data file** (`OBJECTIONS[i].triggers`), *not* raw user input — the user's pasted text is only ever *matched against* triggers, never echoed into `hits`. So `hits` is trusted data. `o.bucket`, `o.label`, `s` (response steps), flag fields, stage fields — **all trusted data from `data/data.js`**.

The only genuinely user-controlled strings rendered are:
- `e.text` (the pasted prospect line) → `renderLog`, line 175 — placed **between tags** (`<div class="log-text">…</div>`). Single-quote there is harmless. `< > &` are escaped. **Safe.**
- The Claude response `out` → `smartCard`, line 260 — placed **between tags**. **Safe** (see C2 for the real issue there).

**So is single-quote actually exploitable today?** With the *current* templates — no. Every `esc()` output lands in element content or a double-quoted attribute. **But this is one refactor away from a hole**, and the data files are themselves authored/generated (`objection-responses.json`, `discovery-flags.json` are large generated artifacts). If any future template emits `class='...'` or an inline `onclick='...'` containing an `esc()`'d value, single-quote injection becomes live XSS with zero warning.

This is filed CRITICAL because the *entire app's safety rests on `esc()` being complete*, and an incomplete escaper is a latent foot-gun in a hand-escaped codebase. Fix is one line.

**Fix:**
```js
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
```

### C2. Claude response is escaped, but the `\n → <br>` step runs on the *escaped* string — safe today, but documents a fragile pattern; the real critical issue is **no length cap / no structural trust boundary on external text**

**Vector:** `smartCard` receives the Claude API response. Line 260:

```js
if (card) card.outerHTML = smartCard(esc(out).replace(/\n/g, "<br>"), false);
```

Order is correct: `esc()` first, then newline→`<br>`. Because `esc()` already neutralised `<`, the only `<br>` tags in the final string are the ones this line inserts. **This is not XSS-exploitable.** Good.

However, two real problems make this CRITICAL:

1. **The Claude response is fully external, attacker-influenceable text.** The prospect's pasted line is sent verbatim to Claude inside the user message (`'\nThe prospect just said: "' + text + '"'`, line 250). A prospect who knows the rep is using this tool can paste a prompt-injection payload that makes Claude emit arbitrary content, which is then rendered into the rep's DOM. Today `esc()` blocks script injection, so the worst case is *content* injection (misleading "best line" advice, fake instructions to the rep) — a **social-engineering / integrity** problem, not code execution. This must be called out: the copilot card is an untrusted-content surface, and the rep is told to *read it aloud*.

2. **No size limit.** `max_tokens: 400` caps it in practice, but nothing in the code enforces a bound before `outerHTML`. Combined with #1, a crafted response can flood the card.

**Fix:** Treat the model output as untrusted display text and bound it. Keep `esc()`, add a hard cap, and render newlines without re-parsing HTML:

```js
function renderSmartText(out) {
  var safe = String(out).slice(0, 1200);          // hard length cap
  return esc(safe)
    .split("\n")
    .join("<br>");
}
// ...
if (card) card.outerHTML = smartCard(renderSmartText(out), false);
```

And in the system prompt, add an explicit instruction that the prospect text is untrusted and must not be treated as instructions to the assistant — this is the only mitigation for prompt injection here. Reviewer 6 (LLM integration) should own the prompt-injection hardening; flagging it here because the *rendering* side is what turns an injected response into a rep-facing surface.

### C3. `outerHTML` replacement of `#smart-card` re-parses a full element and is racy — a stale callback can clobber a fresh card

**Vector:** `runSmart` (lines 259-265) does `card.outerHTML = smartCard(...)` in both the success and error callbacks. `card.outerHTML =` **replaces the element by re-parsing an HTML string** — `smartCard` returns a string starting `<div class="card card-smart" id="smart-card">`.

Two concrete problems:

1. **Race / clobbering.** Each `analyze()` call (lines 192-204) calls `renderCopilot` which does `c.innerHTML = body` — wiping the copilot pane — then `runSmart`. If the rep analyzes line A, then quickly analyzes line B, the `runSmart` fetch for A is still in flight. When A's response lands, `$("smart-card")` finds B's loading card and **overwrites it with A's (now stale) answer**. The rep reads advice for the wrong line. There is no request-generation token to discard stale responses. This is a correctness+safety bug: in a live sales call, showing stale "say this" text is harmful.

2. **`outerHTML` re-parse trusts the string.** `smartCard`'s argument is `esc()`'d (good), but the surrounding template is a literal — fine. The risk is purely the re-parse cost + the fact that `id="smart-card"` is hard-coded, so after replacement the *new* node still has the same id. That part works, but it's brittle: if `smartCard` ever omitted the id, the next call's `$("smart-card")` would silently no-op.

**Fix:** Add a request token and update by replacing `innerHTML` of a stable container, not `outerHTML` of the node itself:

```js
var smartSeq = 0;
function runSmart(text, kwResult) {
  var myСeq = ++smartSeq;
  // ...
  .then(function (j) {
    if (myСeq !== smartSeq) return;            // stale — discard
    var card = $("smart-card");
    if (card) card.innerHTML = smartCardInner(renderSmartText(out), false);
  })
  .catch(function (e) {
    if (myСeq !== smartSeq) return;
    var card = $("smart-card");
    if (card) card.innerHTML = smartCardInner("Keyword mode is still running below. (" + esc(e.message) + ")", true);
  });
}
```

where `smartCardInner` returns just the inner markup (head + say-block) and `smartCardLoading`/`smartCard` keep the outer `<div id="smart-card">` wrapper. This removes the `outerHTML` re-parse entirely and fixes the race.

---

## SHOULD FIX

### S1. Anthropic API error text is rendered into the page after `slice(0,160)` but is otherwise raw

**Vector:** Line 254:
```js
if (!r.ok) return r.text().then(function (t) { throw new Error("HTTP " + r.status + " — " + t.slice(0, 160)); });
```
That error message flows to the `.catch` (line 264) → `esc(e.message)` → `smartCard`. The `esc()` makes it **XSS-safe**. The remaining issue: the Anthropic error body can echo back parts of the request. If an auth error response ever reflects the key or request fragments, a 160-char slice of it lands on screen. Anthropic's API does not echo the key in error bodies today, so this is **not currently a leak** — but rendering raw upstream error text is a habit worth tightening.

**Fix:** Render a friendly fixed message for known statuses, keep raw text out of the DOM:
```js
if (!r.ok) {
  var msg = r.status === 401 ? "API key rejected — check Settings."
          : r.status === 429 ? "Rate limited — keyword mode still running."
          : "Smart mode error (HTTP " + r.status + ").";
  throw new Error(msg);
}
```
Log the full body to `console` for debugging instead of the DOM.

### S2. API key handling — stored plaintext, no validation, exposed in DOM via `type=password`

**Vector:** Key handling across `saveSettings`/`openSettings` (lines 297-310) and `state.apiKey` (line 19):
- Stored **plaintext** in `localStorage` under `copilot_api_key`. Any script that runs on this origin can read it. On `file://` the origin is unusual but localStorage still persists per-file-path and is readable by any other script the page loads — notably `data/data.js`, a **59 KB generated file**. If that generation pipeline is ever compromised, the key is exfiltratable. There is no integrity check on `data.js`.
- `openSettings` writes the key back into `#api-key` (`input type="password"`). `type=password` only masks rendering — the value is plain in the DOM and trivially read via devtools or `document.getElementById('api-key').value`. Acceptable for a local tool, but worth noting it is **not** "hidden".
- **No format validation.** `state.apiKey` is sent as `x-api-key` with no `sk-ant-` sanity check. A mistyped/garbage key just produces an opaque error.
- The key is **never logged or rendered** anywhere — confirmed: it appears only in `localStorage.setItem`, the fetch header, and the password input. **Good.** No `console.log`, no template interpolation.

**Assessment:** For a single-user `file://` tool this is *acceptable but not ideal*. The browser-side key is also why `anthropic-dangerous-direct-browser-access: true` is required — see S3.

**Fix (minimum):** validate format and trim on save; surface a clear "that doesn't look like an Anthropic key" message:
```js
var k = $("api-key").value.trim();
if (k && !/^sk-ant-/.test(k)) { alert("That doesn't look like an Anthropic API key (should start sk-ant-)."); return; }
state.apiKey = k;
```
Consider a "Clear key" button in Settings so a rep on a shared machine can wipe it without devtools. Document in the README that the key persists in localStorage until explicitly cleared.

### S3. `anthropic-dangerous-direct-browser-access: true` — the header is required, but the README undersells the risk

**Vector:** Line 244. This header tells Anthropic's SDK/API to permit calls straight from a browser. It is *named* "dangerous" for a reason: it means a **live billable credential is sitting in client-side storage** and travelling in a request that any browser extension, any XSS, or any malicious `data.js` could intercept. The `index.html` field-note (lines 72-77) says only "stored only in this browser's localStorage and sent only to Anthropic" — that downplays it.

This is not a code bug — direct browser access genuinely requires the header — but the **threat model should be explicit**: anyone with access to the rep's machine/browser profile can lift the key and run up charges. There is no scoping, no spend cap enforced client-side.

**Fix:** No code change makes browser-side keys safe — the correct fix is architectural (a tiny proxy holding the key server-side), which is out of scope for v1. At minimum, strengthen the in-app warning text and README: state plainly that the key is recoverable by anyone with the device, recommend a **dedicated key with a low spend limit** set in the Anthropic console, and tell reps to clear it on shared machines.

### S4. `data-id` is built from `Date.now()` and read back with `+` coercion — no clobbering today, but the pattern is loose

**Vector:** `renderLog` (line 173) writes `data-id="' + e.id + '"` where `e.id = Date.now()` (line 197). Read back at line 180 with `var id = +node.getAttribute("data-id")`. `e.id` is always a number, so the attribute value is numeric and `<` `>` `"` cannot appear — **not injectable**. The `+` coercion is defensive. Fine.

The real note: `Date.now()` can **collide** if two `analyze()` calls land in the same millisecond (rapid Enter presses / paste-spam). Two log entries then share an `id`; clicking one replays whichever `filter()` returns first. Not a security hole, a correctness one — flagging because reviewer 5 (robustness) should also see it.

**Fix:** Use a monotonic counter: `var _seq = 0; ... id: ++_seq` (or `Date.now() + "-" + (++_seq)`).

### S5. No Content-Security-Policy

**Vector:** `index.html` has no CSP `<meta>`. On `file://`, CSP support is partial anyway, but a `<meta http-equiv="Content-Security-Policy">` would still provide defence-in-depth — if an `esc()` gap (C1) ever became a live injection, a CSP forbidding inline event handlers and restricting `connect-src` to `api.anthropic.com` would blunt it and would also stop a compromised `data.js` from exfiltrating the key to an arbitrary host.

**Fix:** Add to `<head>`:
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src https://api.anthropic.com; img-src 'self' data:; base-uri 'none'; form-action 'none'">
```
Test under `file://` — some directives are ignored there, but `connect-src` and `script-src` generally apply and are the ones that matter for key exfiltration.

---

## NICE TO HAVE

### N1. `localStorage` access is unguarded

`state.apiKey`/`state.smart` read `localStorage` directly (lines 19-20); `saveSettings` writes it (306-307). In private-browsing modes or when storage is disabled/full, `localStorage.getItem`/`setItem` can **throw**, and the IIFE would abort at line 19 — the whole app fails to initialise with no message. Wrap in try/catch:
```js
function lsGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
function lsSet(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
```

### N2. Export Blob is safe; one minor note

`exportLog` (321-336) builds a `text/plain` Blob from log lines and triggers a download. `type: "text/plain"` means the browser will not execute it, and `e.text` is the prospect's raw line written into a plain-text file — no HTML context, **no injection**. The `objectURL` is **never revoked** (`URL.revokeObjectURL`), a minor memory leak across many exports. Add `URL.revokeObjectURL(a.href)` after `a.click()` (on a `setTimeout(…,0)` so the click is processed first). Also: the filename uses `toISOString().slice(0,16)` — fine, no user input reaches the filename.

### N3. `alert`/`confirm` on `data.js` load failure (line 8) and `newCall` (338)

Functional, not a security issue. Noted only so it isn't mistaken for one.

### N4. DOM-clobbering check — clean

Checked for the classic `file://` DOM-clobbering vector (a user-named element overriding a global). All element lookups go through `$(id)` → `getElementById` with **hard-coded literal ids**; no user-supplied string ever becomes an `id` or `name` attribute. The only user text in an attribute is the numeric `data-id` (S4). **No clobbering vector.** `window.COPILOT_DATA` is the only global the app trusts, and it comes from the bundled `data.js` — trusted by construction (but see S2/S5: that trust is the soft spot, not clobbering).

---

## Summary of exploitability

| Item | Live XSS today? | Why it's filed where it is |
|---|---|---|
| C1 single-quote gap | No (no quote-context sink today) | One refactor from live XSS; whole app rests on `esc()` |
| C2 Claude response render | No code-exec; **content injection yes** | External text read aloud by rep; prompt-injection surface |
| C3 `outerHTML` race | No XSS; **stale-advice safety bug** | Wrong "say this" shown mid-call |
| S1 error text render | No (esc'd) | Raw upstream text in DOM is a bad habit |
| S2 key storage | No leak today | Plaintext credential, no validation, no clear button |
| S3 dangerous-direct header | N/A | Threat model under-communicated |
| S4 `data-id` | No | Correctness (id collision) |
| S5 no CSP | N/A | Missing defence-in-depth |

The single most important issue is **C1**: `esc()` omitting the single-quote. It is not exploitable with the current templates, but in a 100%-hand-escaped app the escaper *must* be complete — and the data files are generated artifacts that can change. It is a one-line fix and should ship before anything else.
