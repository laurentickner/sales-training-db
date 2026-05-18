# Code Review 7 — Smart Mode / LLM Integration

Scope: `buildSystemPrompt()`, `runSmart()`, `smartCard()`/`smartCardLoading()`, `renderCopilot()` in `app/app.js`, and the knowledge base in `app-data/objection-responses.json`.

Verdict in one line: the integration *works*, but it throws away the single most valuable asset it owns — the verbatim `response_steps` — and instead asks Claude to improvise rebuttals it could have been handed word-for-word.

---

## CRITICAL

### C1. The matched objection's `response_steps` are never sent to Claude — Claude improvises the rebuttal
**Location:** `runSmart()`, lines 231–236 (context assembly); `buildSystemPrompt()`, line 220 (`objIndex`).

Right now the keyword engine matches the prospect's line to a specific objection and `runSmart()` passes Claude only the objection's **label**:

```js
if (kwResult.objections.length) ctx += "Keyword engine flagged objection(s): " + kwResult.objections.map(function (m) { return m.item.label; }).join("; ") + "\n";
```

So Claude is told *"the prospect raised: It's too expensive"* and then asked to write a `READ:` line from scratch. Meanwhile the JSON already holds the exact, near-verbatim Cole Gordon rebuttal:

> "No problem. Now just so I can stay organized on my end — when you say you can't afford it, do you mean you really want to do it and physically don't have the budget, or do you mean you don't think the investment is worth the value?"

The entire premise of the app — per the JSON description, *"Every response line is verbatim or near-verbatim from the source material"* — is defeated. Smart mode produces a *worse, generic* answer than keyword mode for any line keyword mode already matched, because keyword mode shows the real script and smart mode paraphrases it.

**Fix:** when the keyword engine has a confident match, pass the full matched entry into the context block so Claude phrases/adapts the real rebuttal rather than inventing one. In `runSmart()`:

```js
if (kwResult.objections.length) {
  var top = kwResult.objections[0];
  ctx += "MATCHED OBJECTION: " + top.item.label + " [" + top.item.bucket + "]\n";
  ctx += "Verbatim playbook for this objection (adapt step 1 to what the prospect actually said — do not invent a different approach):\n";
  top.item.response_steps.forEach(function (s, i) { ctx += "  " + (i + 1) + ". " + s + "\n"; });
  if (top.item.do_not) ctx += "DO NOT: " + top.item.do_not + "\n";
  if (top.item.alt_reframes) ctx += "Alt reframes available: " + top.item.alt_reframes.join(" / ") + "\n";
}
```

Then change the system prompt's job description from "write what to say" to "select and adapt the right line from the playbook you're given; only improvise if nothing matches." This is the highest-leverage change in the whole file.

### C2. `max_tokens: 400` can truncate the answer mid-sentence with no detection
**Location:** `runSmart()`, line 248; response handler lines 257–261.

The prompt asks for "UNDER 110 WORDS" — ~150 tokens of English — so 400 is *usually* enough headroom. But Haiku does not always obey word limits, and the `READ:`/`WHY:` format plus a long quoted rebuttal can run over. When the model hits the cap, the API returns `stop_reason: "max_tokens"` and the `READ:` line is cut off **mid-quote** — the rep reads a half-sentence aloud on a live call. The response handler never inspects `stop_reason`:

```js
var out = (j.content && j.content[0] && j.content[0].text) ? j.content[0].text : "(no response)";
```

**Fix:** raise `max_tokens` to ~600 (cheap insurance — output tokens are only billed when used) **and** surface truncation:

```js
.then(function (j) {
  var out = (j.content && j.content[0] && j.content[0].text) ? j.content[0].text : "(no response)";
  if (j.stop_reason === "max_tokens") out += "\n\n⚠ response was cut off — ask again or shorten the input.";
  ...
```

Also note line 258 only reads `j.content[0]` — if the model ever returns a non-text first block (it can with tool use; not used here, but defensive), this silently shows "(no response)". Filtering for `type === "text"` is the robust form.

### C3. No timeout / no abort — a stalled request hangs "Claude is reading the call…" forever on a live call
**Location:** `runSmart()` — the `fetch()` at line 238 has no `AbortController`.

On a real sales call the rep needs an answer in seconds or not at all. If the network stalls or `api.anthropic.com` is slow, the loading card (`smartCardLoading()`, "One moment.") sits there indefinitely. Worse: if the rep types a *second* line while the first request is in flight, `analyze()` calls `renderCopilot(result, true)` which re-renders a fresh loading card, and **both** in-flight requests will try to `outerHTML`-replace `#smart-card` — the later-arriving (possibly stale) response wins and overwrites the answer to the newer line. There is a race between concurrent smart calls.

**Fix:** keep a module-level `currentSmartController`; abort the previous request before starting a new one, and add an 8–12s timeout:

```js
var currentSmartController = null;
function runSmart(text, kwResult) {
  if (currentSmartController) currentSmartController.abort();
  var ctrl = currentSmartController = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 12000);
  ...
  fetch("https://api.anthropic.com/v1/messages", { ..., signal: ctrl.signal })
    .then(...).catch(function (e) {
      if (e.name === "AbortError") return;   // superseded or timed out cleanly
      ...
    }).finally(function () { clearTimeout(timer); });
}
```

Tag each request with the log `entry.id` and only patch `#smart-card` if it still belongs to the most recent entry, so a slow response can never overwrite a newer one.

---

## SHOULD FIX

### S1. Not streaming — the answer lands all at once after a multi-second wait
**Location:** `runSmart()` request body (no `"stream": true`), response handler.

For a live-call tool, perceived latency is the product. A non-streaming Haiku call for ~150 output tokens is roughly 1–3s to *first and only* paint. Streaming would put the first words of the `READ:` line on screen in a few hundred ms and let the rep start reading while the rest arrives. The `smartCard()` markup is a single text block, so streaming-append is straightforward.

**Fix:** add `"stream": true` to the body, read the SSE stream, and append `content_block_delta` text into `#smart-card` as it arrives. This is the biggest "feels instant" win after C1. If streaming is judged too much complexity for v1, at minimum say so in `_review` as a deliberate deferral — it's the right call eventually.

### S2. `buildSystemPrompt()` is rebuilt on every single call
**Location:** `runSmart()` line 249 calls `buildSystemPrompt()` per request; the function re-`map`s all 27 objections + all flags every time.

The system prompt is fully static — `OBJECTIONS`, `FRAMEWORK`, `FLAGS` never change at runtime. Rebuilding it per keystroke-submit is wasteful, and more importantly it blocks the obvious cost win below (S3).

**Fix:** compute it once: `var SYSTEM_PROMPT = buildSystemPrompt();` at module init, reference that in the request body.

### S3. No prompt caching — every call re-bills the full system prompt at full price
**Location:** `runSmart()` request body, `system` field.

The system prompt is ~500–700 tokens and **identical on every call within a session** (a single sales call = many submits). Without caching, every submit pays full input price for those tokens. Anthropic prompt caching would make calls 2..N within the 5-minute window read the system block at ~10% cost.

**Fix:** send `system` as a content array with a cache breakpoint, and add the beta header:

```js
headers: { ..., "anthropic-beta": "prompt-caching-2024-07-31" },
body: JSON.stringify({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 600,
  system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
  messages: [...]
})
```

Cost is already low (Haiku, short outputs — a ballpark of well under a tenth of a cent per call), so this is not urgent, but it's nearly free to add and pairs naturally with S2. If you later send the matched `response_steps` (C1), the *static* index in the system prompt is still worth caching while the dynamic match goes in the user turn.

### S4. The error UX leaks the raw API error body to the rep and is unreadable mid-call
**Location:** `runSmart()` lines 253–254 and the `.catch` at 262–265.

On a non-2xx the code throws `"HTTP " + r.status + " — " + t.slice(0, 160)` — 160 chars of raw Anthropic JSON error — and renders it inside the smart card: `"Keyword mode is still running below. (HTTP 401 — {"type":"error",...})"`. During a live call that is noise. The three errors that actually happen each need a *human* instruction:

- **401 / invalid key** → "Smart mode key is invalid — check Settings. Keyword mode is running below."
- **429 / overloaded** → "Claude is rate-limited — keyword mode is running below."
- **network/abort/timeout** → "Couldn't reach Claude — keyword mode is running below."

**Fix:** map `r.status` to a friendly sentence; log the raw body to `console.warn` for debugging instead of showing it. Keep the "keyword mode is still running below" reassurance — that part is good.

### S5. Output format `READ:` / `WHY:` is good — but it isn't parsed, so it can't be styled or trusted
**Location:** `buildSystemPrompt()` lines 224–226; rendered raw in `smartCard()` via `esc(out).replace(/\n/g,"<br>")`.

The two-line `READ:` (verbatim words) / `WHY:` (one-line rationale) contract is genuinely well-chosen for a live call — the rep's eye needs the *exact words* first, reasoning second. But the app dumps the model's raw text in unstyled. Two consequences: (a) the `READ:` line — the thing the rep reads aloud — gets no visual priority over `WHY:`; (b) if the model ignores the format, there's no detection.

**Fix:** split on `READ:` / `WHY:`, render the READ line large/bold (it mirrors the `say-step` styling of the keyword cards) and `WHY:` as muted sub-text. If `READ:` is absent, fall back to showing the raw text — but that absence is also a signal the prompt needs tightening.

### S6. Keyword result and smart result sit as separate stacked cards with no relationship shown
**Location:** `renderCopilot()` lines 143–159; `smartCard()` placement.

The smart card renders *above* the keyword objection/flag cards (`body += smartCardLoading()` first). The rep sees Claude's improvised line, then the same objection's verbatim steps below, with nothing tying them together — and (per C1) they can actively disagree. After C1 is fixed they'll agree, at which point the smart card is best framed as *"Claude — adapted from the playbook below"* so the rep understands the smart card is the call-specific phrasing of the card beneath it. Consider also: when keyword mode returns a *strong* match (`score >= 2`) the smart call adds the most value as phrasing/adaptation; when keyword mode finds **nothing** (`noneCard()`), smart mode is the *only* signal and should be visually promoted, not a small card above an empty state.

**Fix:** relabel the smart kicker to reference the matched card; when there's no keyword match, give the smart card the primary visual weight.

### S7. Recent-log context excludes the current line and silently caps at 3 turns
**Location:** `runSmart()` line 232: `state.log.slice(-4, -1)`.

`analyze()` pushes the current entry *before* calling `runSmart()`, so `slice(-4,-1)` correctly drops the just-added line (it's passed separately as `text`) and takes the 3 prior. That's fine — but it's only the prospect's lines (`"- prospect: " + e.text`), never the rep's responses or which objections fired previously. Claude can't see that the rep already ran the diffuse/isolate step two turns ago, so it may tell them to diffuse again. Also 3 turns is thin for a 30-minute call.

**Fix:** include the prior turns' detected objection labels alongside the text (`"- prospect: X  [matched: It's too expensive]"`) so Claude can see the call's objection arc and not repeat a step. Bump to ~6 turns — it's cheap, especially once S3 caching is in.

---

## NICE TO HAVE

### N1. `anthropic-version: 2023-06-01` is correct but pin it intentionally
**Location:** `runSmart()` line 243. `2023-06-01` is the current stable Messages API version and is right. No change needed — flagging only so a future reviewer doesn't "modernise" it to a date that doesn't exist. The model id `claude-haiku-4-5-20251001` should be confirmed against the live model list before ship; if it's wrong every call 404s.

### N2. Model choice — Haiku 4.5 is the right call for live use
**Location:** line 247. Haiku is the correct latency/cost pick for a real-time copilot; Sonnet would add noticeable lag for marginal quality on what is essentially a "select + adapt a script" task (especially once C1 feeds it the verbatim steps). Keep Haiku. The one scenario for Sonnet is the *no keyword match* case where Claude must reason from scratch — not worth a second model path for v1, but worth a note.

### N3. The API key is read from `localStorage` and sent from the browser — fine for a personal tool, flag for the security reviewer
**Location:** `state.apiKey` (line 19), sent as `x-api-key` (line 242). `anthropic-dangerous-direct-browser-access: "true"` is *required* for browser calls and correctly present — the name is Anthropic's deliberate warning that the key is exposed to the page and any script on it. Acceptable for a single-rep local tool; not acceptable if this is ever hosted for multiple users. Out of my scope (security owns it) — noted so it isn't missed.

### N4. `temperature` is not set — defaults to 1.0
**Location:** `runSmart()` request body. For a tool that should produce *consistent, scripted* rebuttals, a lower temperature (~0.3–0.5) would make the `READ:` line steadier and reduce the chance of the model wandering off the playbook. Add `temperature: 0.4` to the body.

### N5. `smartCardLoading()` gives no sense of progress
**Location:** lines 129–133. "One moment." with no spinner/elapsed indicator feels broken if the call takes 3s+. A simple animated ellipsis or "thinking…" pulse would reassure the rep. Largely mooted if S1 (streaming) lands — first tokens become the progress indicator.

### N6. System prompt could state the offer/pricing facts it's allowed to use
**Location:** `buildSystemPrompt()`. It says *"Never invent guarantees or specific results"* (good) but gives Claude no real facts — no price, no actual success-rate number, no real case studies. So Claude must write `[X]%` / `[case study]` placeholders or vaguely gesture. The keyword `response_steps` themselves are full of `[their outcome]` / `[X]%` placeholders, so this is consistent — but if real numbers exist, putting a short verified-facts block in the system prompt would let Claude produce a ready-to-read line instead of one with brackets the rep must fill mid-sentence.
