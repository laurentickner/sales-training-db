# Code Review 4 — Live-Call Usability & UX

Reviewer POV: a sales rep mid-call, talking, with ~1 second to glance at the screen.

**Verdict:** The app is well-structured and looks calm, but in its current form it is **not usable during a live call**. The two killers are (1) the rep has to type the prospect's words while talking, and (2) the copilot answer is a wall of text — objection cards render up to 7 steps, individual steps up to 533 characters. A rep cannot read that and stay in the conversation. Both must be fixed before this ships as a "real-time" tool.

---

## CRITICAL
*(makes it unusable mid-call)*

### C1. Typing the prospect's words mid-call is unrealistic — there's no fast path in
**Where:** `index.html` L34-42 (input zone), `app.js` `analyze()` L192.
**Problem:** The only way to get an answer is to type/paste what the prospect said into a 3-row textarea and hit Enter. While actively talking on a call, a rep cannot transcribe a sentence accurately and fast enough. By the time they've typed "yeah it's just a lot of money right now and I'd need to talk to my partner," the moment has passed. The whole loop depends on a slow, attention-stealing input step.
**Fix:** Add a **quick-trigger row of objection/flag buttons** above or beside the textarea — one tap = analyze. Source them straight from the data you already have: `OBJECTIONS` has 26 entries with `bucket` and `label`; render the ~6-8 most common buckets as buttons ("Too expensive", "Need to think", "Talk to partner", "Not the right time", "Send me info", "Already tried something"). Tapping a button calls a variant of `analyze()` that skips keyword matching and jumps straight to that objection's card. Keep the textarea for the long tail / smart mode, but the buttons become the primary mid-call interaction. This is the single highest-impact change in the review.

### C2. Objection cards are a wall of text — not glanceable
**Where:** `app.js` `objectionCard()` L85-101; data in `objection-responses.json`.
**Problem:** `response_steps` renders every step as an equal-weight `.say-step` block. Real data: max 7 steps per objection, longest step **533 characters**, several steps 250-360 chars. A 7-step card is multiple screens of dense paragraphs. There is no way to "glance" this — the rep would have to stop listening and read. The format actively fights the product's stated promise ("~1 second to glance").
**Fix:** Three concrete moves:
1. **Show step 1 only by default**, collapse the rest behind a "+ 5 more steps" toggle. Step 1 of every objection is the diffuse/isolate line — the only thing the rep needs *right now*. The later steps are conditional ("If they waffle…", "OPEN WALLET:…") and are reference, not the live line.
2. **Promote the readable line.** Render step 1 as a large, high-contrast quote ("READ THIS:") at the top of the card — bigger than 14px, e.g. 17-18px, with a distinct background. Everything else is secondary.
3. **Hard-cap visible length.** If a step exceeds ~180 chars, truncate with a "tap to expand" so a card never exceeds roughly one viewport.

### C3. No visual "answer of record" — every card looks equally important
**Where:** `app.js` `renderCopilot()` L143-159.
**Problem:** Up to 3 objection cards + 3 flag cards can render (`analyzeKeyword` L74 slices to 3+3). A rep sees up to 6 cards of similar weight and must decide which to act on — under time pressure. The ordering logic (L151-155) is sensible but invisible to the user; there's no "this is THE line" treatment. The most important line is not visually obvious, which is the explicit thing this review must check.
**Fix:** Render the **single top result as a hero card** — full width, larger type, the READ line front and centre, a clear label like "SAY THIS NOW". Demote everything else to a compact, collapsed "Also detected" list (one line each: kicker + label, tap to expand). One primary action, always. Cap the secondary list at 2 items; 6 cards is too many to triage on a call.

### C4. Smart-mode (Claude) output renders raw and unstructured
**Where:** `app.js` `smartCard()` L134-141, `runSmart()` L257-261.
**Problem:** The system prompt asks Claude for a `READ:` / `WHY:` structure (L224-227), but `smartCard()` just dumps the whole response into one `.say-step` with `\n`→`<br>`. The rep gets a blob where the verbatim line to read isn't visually separated from the rationale. On a call the rep needs the quoted line isolated and big.
**Fix:** Parse the response for the `READ:` and `WHY:` lines and render them distinctly — the `READ:` quote as the same hero treatment as C3, the `WHY:` as small dim subtext. If parsing fails, fall back to the current blob. Also: smart mode is async with no timeout — if Claude is slow the rep is left staring at "Claude is reading the call…" (L131). Add a ~4s timeout that surfaces the keyword answer and stops waiting.

---

## SHOULD FIX

### S1. Focus is not returned to the input after analyze
**Where:** `app.js` `analyze()` L192-204.
**Problem:** `analyze()` clears the textarea (L199) but never re-focuses it. After the first analyze the rep must click back into the textarea before they can type the next line — a wasted motion every single turn of the call loop.
**Fix:** Add `$("input").focus();` at the end of `analyze()`. Trivial change, removes friction from every iteration.

### S2. Copilot output is on the right; rep's eyes/hands are on the left
**Where:** `index.html` L29-62, `styles.css` `.layout` L91-94 (40% left / 60% right).
**Problem:** The rep types on the LEFT panel, but the answer they need to read appears on the RIGHT. Their eyes have to jump across the screen after every Enter. The call log (low-urgency, rarely needed mid-call) sits directly under the input taking prime real estate, while the thing they urgently need is across the divide.
**Fix:** Put the **copilot answer directly under the input** (same column / same eye-line). Move the call log to a less prominent spot — a collapsible panel, a tab, or the bottom. The hot path (type → read) should be one vertical glance, no horizontal saccade.

### S3. The funnel stage strip is a 6-tap selector with no current-state emphasis beyond colour
**Where:** `index.html` L27, `app.js` `renderStageStrip()` L269-278, `styles.css` `.stage-pill` L76-88.
**Problem:** The active stage is shown only by amber fill. Mid-call, the rep manually clicks to change stage — easy to forget, and there's no "you are here / next is X" affordance. The strip also competes visually with the top bar. Stage rarely changes more than ~6 times in a call, so a 6-button always-visible strip is a lot of persistent UI for a low-frequency action.
**Fix:** Keep the strip but (a) make the active pill unmistakable — add a "▸ NOW" marker or a bottom bar, not just colour (also helps colourblind users); (b) consider an auto-suggest: when the stage data's `advance_when` condition keyword-matches recent input, show a subtle "Ready to move to Pitch?" nudge rather than relying on the rep to remember.

### S4. Stage reference panel can be pushed off-screen and is buried below the fold
**Where:** `index.html` L57-59, `styles.css` `.stage-ref` L204-209 (`max-height: 38vh`).
**Problem:** The stage reference ("what to do / listen for / say") lives below the copilot output in the right panel. When a copilot card stack is tall, the stage ref scrolls out of view. It's genuinely useful between objections (it's the "keep running the funnel" content) but is positionally an afterthought.
**Fix:** Either move it into a collapsible drawer the rep can pull up deliberately, or pin a 1-line condensed version (stage goal + "listen for") that's always visible. Don't let it fight the copilot cards for the same scroll container.

### S5. No keyboard path to clear / re-focus / dismiss — it's an Enter-and-mouse app
**Where:** `app.js` `init()` L356-358 (only Enter is wired).
**Problem:** Everything except analyze requires a mouse: switching stage, opening settings, dismissing a card, exporting. Mid-call the mouse is slow. Enter is the only shortcut.
**Fix:** Add a couple of low-risk shortcuts — `Esc` to clear the textarea / dismiss the modal, and number keys `1`-`6` to set funnel stage. Document them in the existing `.hint` line (L41).

### S6. "No objection or flag" card gives no actionable line
**Where:** `app.js` `noneCard()` L119-127.
**Problem:** When nothing matches, the card just says "keep running [stage]" plus the stage goal. On a live call "keep running discovery" is not an instruction the rep can act on — they wanted help and got a shrug.
**Fix:** Pull 1-2 concrete `say` lines from the current stage's data (`STAGES[].say` — already loaded, used in `renderStageRef`) into the none-card as ready-to-read suggestions. Turn a dead end into a usable prompt.

---

## NICE TO HAVE

### N1. `card-meta` "matched: …" debug line is clutter on a live call
**Where:** `app.js` `objectionCard()` L97-98, `flagCard()` L113-114.
**Problem:** Every card footers with "Bucket: X · matched: keyword, keyword · [pips]". This is engine-diagnostics, useful for tuning, noise for a rep mid-call. It adds height to already-tall cards.
**Fix:** Hide it behind a settings toggle ("show match details") or move it to a tiny, dim, single-line tag. Default off.

### N2. Pips convey confidence but are tiny and unlabelled
**Where:** `styles.css` `.pip` L199 (6px dots), `app.js` `pips()` L78-83.
**Problem:** 6px dots are below the glance threshold; a rep won't read them and won't know what they mean.
**Fix:** Either drop them from the live view, or replace with a single readable word ("strong match" / "possible match") on the hero card only.

### N3. Export and New call sit in the top bar away from the log they act on
**Where:** `index.html` L22, L39.
**Problem:** Minor — "New call" is top-right, "Export log" is bottom-left of the input zone, the log is mid-left. Three related actions, three locations.
**Fix:** Group log-related actions (export, clear, new call) near the log. Low priority — these aren't used mid-call.

### N4. Empty state says "Ready." but gives no fast-start affordance
**Where:** `index.html` L50-54, `app.js` `newCall()` L341-344.
**Problem:** First thing a rep sees is instructional prose. Fine, but it could double as onboarding for the quick-trigger buttons (C1) once those exist.
**Fix:** When C1 ships, the empty state should point at the objection buttons ("Tap the objection you heard, or type it") so the fast path is discovered immediately.

### N5. No timestamp/elapsed-call context
**Where:** Log entries store `time` (`nowTime()` L33-36) but there's no call-duration anchor.
**Problem:** Reps often pace a call by time. Minor, but a small "call started HH:MM · 14 min in" header would help pacing decisions (e.g. when to push to close).
**Fix:** Capture call-start on `newCall()`, show elapsed in the top bar.

---

## Summary
**4 CRITICAL, 6 SHOULD FIX, 5 NICE TO HAVE.**

The app is competent but the core interaction loop is built for a calm desk, not a live call. The two non-negotiables: (C1) give the rep one-tap objection buttons so they don't have to type while talking, and (C2/C3) collapse the multi-step objection cards to a single hero "say this now" line with the rest tucked away. Until both land, "real-time copilot" overstates what the rep can actually do with this mid-conversation.
