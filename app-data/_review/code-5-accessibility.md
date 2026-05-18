# Code Review 5 — Accessibility & Responsive Layout

App: Call Copilot (file:// HTML/CSS/JS). Reviewer scope: semantic HTML, ARIA, keyboard, focus management, colour contrast, zoom, 820px breakpoint, mobile stage strip.

---

## CRITICAL

### C1. Settings modal is not a real modal — no focus trap, no Escape, no aria-modal, no focus return
**Location:** `index.html` lines 65–87; `app.js` `openSettings()`/`closeSettings()` lines 297–302, 364–366.

The modal is a plain `<div class="modal hidden">`. Problems, all of them WCAG 2.1.2 / 2.4.3 failures:
- No `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby` — screen readers don't announce it as a dialog and don't scope to it.
- Focus is never moved into the modal on open. A keyboard/SR user has no idea it appeared and keeps tabbing through the page *behind* it.
- No focus trap — Tab walks straight out of the modal back into the topbar/stage strip/main panels underneath.
- Escape does not close it. Only a click on the backdrop or the Close button works (line 364–366) — neither is reachable for an Escape-expecting user.
- Focus is not returned to `#btn-settings` on close, so the user is dumped at the top of the document.
- Background content is not inert / `aria-hidden` while the modal is open.

**Fix — markup:**
```html
<div id="settings-modal" class="modal hidden" role="dialog" aria-modal="true"
     aria-labelledby="settings-title">
  <div class="modal-card">
    <h3 id="settings-title">Settings</h3>
    ...
```

**Fix — JS** (replace `openSettings`/`closeSettings`):
```js
var lastFocused = null;
function trapTab(e) {
  if (e.key !== "Tab") return;
  var f = $("settings-modal").querySelectorAll(
    'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
  f = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null; });
  if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
function modalKeydown(e) { if (e.key === "Escape") closeSettings(); else trapTab(e); }

function openSettings() {
  lastFocused = document.activeElement;
  $("api-key").value = state.apiKey;
  $("smart-toggle").checked = state.smart;
  $("settings-modal").classList.remove("hidden");
  $("settings-modal").addEventListener("keydown", modalKeydown);
  $("api-key").focus();
}
function closeSettings() {
  $("settings-modal").classList.add("hidden");
  $("settings-modal").removeEventListener("keydown", modalKeydown);
  if (lastFocused) lastFocused.focus();
}
```

---

### C2. Copilot output region is not announced — wrong element has aria-live
**Location:** `index.html` line 43 (`#log` has `aria-live="polite"`) and line 49 (`#copilot` has none); `app.js` `renderCopilot()` line 157 (`c.innerHTML = body`).

The `aria-live` is on the **call log** (`#log`), which is secondary. The primary dynamic output — what the rep should *say next* — is `#copilot`, and it has **no live region at all**. After Analyze, a screen-reader user hears nothing about the objection card / "Say this" steps that just appeared. This is the core function of the app and it is silent to assistive tech (WCAG 4.1.3).

Also: dumping a full card via `innerHTML` into a `polite` region announces a wall of unstructured text.

**Fix:** put the live region on `#copilot`, not `#log`. The copilot panel content fully replaces on each Analyze, so `aria-live="polite"` plus `aria-atomic="false"` is appropriate; give it a label too:
```html
<div id="copilot" class="copilot" role="region" aria-live="polite"
     aria-label="Copilot guidance" tabindex="-1">
```
Remove `aria-live="polite"` from `#log` (line 43) — keep that as a quiet history list. Optionally move focus to `#copilot` after Analyze (see C3) which is more reliable than live-region announcement for a content swap this large.

---

### C3. No focus management after Analyze
**Location:** `app.js` `analyze()` lines 192–204.

After Analyze runs, `$("input").value = ""` clears the textarea but focus stays in it. The result cards rendered into `#copilot` are never focused and (per C2) never announced. A keyboard-only / SR user has no signal the analysis completed or where the result is.

**Fix:** after `renderCopilot(...)` in `analyze()`, move focus to the output region (which now has `tabindex="-1"` per C2):
```js
renderCopilot(result, useSmart);
$("copilot").focus();
if (useSmart) runSmart(text, result);
```
This both announces the region (via its `aria-label`) and lets the user immediately read/scroll the cards. The rep can Shift+Tab back to the input for the next line.

---

### C4. Stage pills: active stage not exposed; selected state is colour-only
**Location:** `index.html` line 27 (`<nav>`); `app.js` `renderStageStrip()` lines 269–278.

The stage strip is a row of `<button>`s acting as a single-select control. The active stage is conveyed **only** by amber background (`.stage-pill.active`, `styles.css` 86–88). A screen-reader user gets no indication which stage is current; a colour-blind user may not distinguish amber-on-dark from the inactive grey card. WCAG 1.4.1 (colour alone) + 4.1.2 (name/role/state).

**Fix:** add `aria-pressed` to each pill reflecting active state, and `aria-current="step"` on the active one. In `renderStageStrip()`:
```js
return '<button class="stage-pill' + (active ? " active" : "") +
  '" data-id="' + s.id + '" aria-pressed="' + active + '"' +
  (active ? ' aria-current="step"' : '') + '>' + esc(s.name) + "</button>";
```
Also add a non-colour visual cue to `.stage-pill.active` (e.g. `font-weight: 800` or an inset ring) so it does not rely on hue alone.

---

## SHOULD FIX

### S1. Icon-prefixed buttons read their glyphs aloud
**Location:** `index.html` lines 21–22, 38–39; `app.js` card kickers (▲ ⚑ ✦ ✓) and log tags.

`⚙ Settings`, `↻ New call`, `↓ Export log`, `Analyze ⏎` — the leading symbols are decorative but are inside the accessible name, so SRs announce e.g. "gear Settings", "down-arrow Export log". The kicker strings (`▲ Objection detected`, `⚑ Discovery flag`) likewise read the glyph.

**Fix:** wrap decorative glyphs in `<span aria-hidden="true">`:
```html
<button id="btn-settings" class="btn btn-ghost"><span aria-hidden="true">⚙</span> Settings</button>
```
For JS-built kickers, wrap the glyph the same way inside `objectionCard()`/`flagCard()`/`noneCard()`. The `title` attributes already give a clean name on the topbar buttons but `title` does not override the text content for the accessible name.

### S2. Dim text fails WCAG AA contrast in several places
**Location:** `styles.css` `--text-dim: #97a2b3` used widely; small dim text on panel/card backgrounds.

`#97a2b3` on `--bg #0e1117` ≈ **6.4:1** — passes. But `--text-dim` on `--bg-card #1d2430` ≈ **5.0:1** — passes for normal text only, and several uses are *small* text where it is borderline:
- `.hint` 11px, `.log-time` 10.5px, `.card-bucket` 10px, `.field-note` 11.5px, `.card-meta` 11px — all `--text-dim`. At <12px these are visually marginal even when the ratio nominally passes; 4.5:1 is the floor and `#97a2b3` on `#1d2430` is only ~5.0:1 with no margin.
- `.brand-sub` 12px dim on `--bg-panel #161b24` ≈ **5.4:1** — OK but tight.

Worse, the **smart-card kicker** `#b6a4ff` (`styles.css` 162) on `--bg-card #1d2430` ≈ **6.2:1** OK; but `.donot` text `#ffb4b4` on `#2a1a1a` ≈ **6.8:1** OK. The genuine risk is the dim greys at tiny sizes.

**Fix:** lighten `--text-dim` to about `#a9b4c4` (≈6.7:1 on `--bg-card`, ≈8.4:1 on `--bg`) and bump the smallest dim labels (`.card-bucket`, `.log-time`) to a minimum 11px. Verify the `.btn-primary` `color:#04222b` on `--cyan #00bff1` — that is ~9:1, fine.

### S3. 820px breakpoint: both panels still fight for height — right panel can be unusable
**Location:** `styles.css` lines 256–259; `body { overflow:hidden; height:100vh }` line 26–29.

At ≤820px the grid becomes `grid-template-rows: auto 1fr`. The left panel is `auto` (its natural height: title + textarea + buttons + hint + call log), the right panel gets `1fr`. But the left panel's `.log` is `flex:1` and will *grow* with logged entries, so "auto" can consume most of the viewport, squeezing `Copilot says…` into a tiny strip. Combined with `body{overflow:hidden}`, the page cannot scroll to recover — the copilot output gets clipped on a phone, which is the one screen where it matters most.

**Fix:** at the breakpoint, give each panel a bounded share and allow page scroll, or cap the left log:
```css
@media (max-width: 820px) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;   /* not 1fr — let content size */
  }
  .panel-left { border-right: none; border-bottom: 1px solid var(--border); }
  .panel { overflow: visible; }
  .log { max-height: 30vh; }          /* cap left log */
  .copilot { max-height: none; }
  body { overflow: auto; height: auto; min-height: 100vh; }
}
```
This lets the document scroll on mobile instead of clipping the copilot panel.

### S4. `.stage-ref` `max-height: 38vh` clips content on short / zoomed viewports
**Location:** `styles.css` lines 204–209.

`max-height: 38vh` with `overflow-y:auto` means on a short window — or at 200% browser zoom (WCAG 1.4.4 requires content usable at 200%) — the stage reference ("what to do", listen-for, Say list, advance-when) is squeezed into a ~250px scroller. It is keyboard-scrollable only if focusable; a `<div>` scroll container is not in the tab order, so a keyboard-only user cannot scroll it to read the clipped lines.

**Fix:** either drop the `vh` cap in favour of natural flow inside the scrolling `.panel-right`, or make the scroll container keyboard-reachable with `tabindex="0"` and a visible focus ring:
```css
.stage-ref { tabindex: 0; }   /* set in HTML/JS, not CSS */
.stage-ref:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
```
Preferred: remove `max-height: 38vh` and let `.panel-right`'s own `overflow-y:auto` handle scrolling so there is one scroll region, not a nested unreachable one.

### S5. Mobile stage strip: horizontal scroller has no keyboard scroll & hides overflow with no affordance
**Location:** `styles.css` `.stage-strip { overflow-x:auto }` lines 71–75; `.stage-pill { min-width:120px }`.

With ~6 stages at `min-width:120px` plus gaps, the strip overflows ~820px wide and becomes a horizontal scroller. The individual pills are `<button>`s so they are tab-reachable and focusing one will scroll it into view — that part is OK. But: there is no visual affordance that more pills exist off-screen (no fade/shadow edge), and on a touch device the active pill may render off-screen on load with no auto-scroll-into-view.

**Fix:** after `renderStageStrip()`, scroll the active pill into view:
```js
var activeEl = strip.querySelector(".stage-pill.active");
if (activeEl) activeEl.scrollIntoView({ inline: "center", block: "nearest" });
```
And add an edge fade so users know the strip scrolls (e.g. a `mask-image` linear-gradient on `.stage-strip`).

### S6. Visible focus indicator removed from inputs, never restored
**Location:** `styles.css` `#input:focus { outline: none; ... }` line 114; `.field input:focus { outline: none; ... }` line 245.

Both text inputs do `outline: none` and replace it with only a `border-color` change to cyan. A 1px border-colour shift is a weak focus indicator and fails WCAG 2.4.7 / 2.4.11 (focus visible / appearance) for low-vision users — especially since the unfocused border is already a visible `--border` colour, so the change is subtle. Buttons and stage pills have **no** `:focus` style at all and rely on the UA default, which on a dark theme is often near-invisible.

**Fix:** keep the border accent but add a real focus ring, and add one global rule for all interactive elements:
```css
#input:focus, .field input:focus { border-color: var(--cyan); }
.btn:focus-visible, .stage-pill:focus-visible, .log-entry:focus-visible,
#input:focus-visible, .field input:focus-visible, input[type=checkbox]:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 2px;
}
```

### S7. Log entries are clickable but not keyboard-operable
**Location:** `app.js` `renderLog()` lines 169–189 — `.log-entry` is a `<div>` with a click handler.

Each call-log entry is clickable to re-show its copilot result, but it is a `<div>` with no `role`, no `tabindex`, and no key handler. Keyboard and SR users cannot recall a past analysis at all (WCAG 2.1.1).

**Fix:** render entries as buttons, or add role + tabindex + key handling:
```js
'<div class="log-entry" data-id="' + e.id + '" role="button" tabindex="0"' +
  ' aria-label="Recall analysis from ' + esc(e.time) + '">'
```
And in the listener attach, also handle Enter/Space:
```js
node.addEventListener("keydown", function (ev) {
  if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); node.click(); }
});
```

---

## NICE TO HAVE

### N1. Add a skip link / landmark labels
The `<main>` has no label and there is no skip-to-content link. With a topbar + nav stage strip before main, a keyboard user tabs through the topbar and all stage pills before reaching the input every time. Add `<a class="skip" href="#input">Skip to call input</a>` as the first body child, visually hidden until focused. Landmarks are mostly fine (`header`, `nav`, `main`, `section`) but the two `<section>`s could take `aria-labelledby` pointing at their `.panel-title` h2s.

### N2. Heading order
`h1` (Call Copilot) → `h2` (panel titles) → `h3` (modal "Settings", stage-ref "… what to do"). The stage-ref `h3` at `app.js` line 281 lives inside the right panel whose section heading is `h2` — fine. The modal `h3` is acceptable but, since the dialog is its own context, `h2` or keeping `h3` are both OK. No real violation; mentioned only because the modal `h3` has no programmatic tie to the dialog until C1's `aria-labelledby` is added.

### N3. `prefers-reduced-motion` not honoured
Buttons/pills/cards animate via `transition` (`.12s`). Minor, but add:
```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
```

### N4. `lang` only on `<html>` — fine; but the API-key input should not autocomplete
`#api-key` is `type="password"` with no `autocomplete="off"`. Browsers may offer to save it as a password. Add `autocomplete="off"` (and `spellcheck="false"`) — minor security/UX, not strictly a11y.

### N5. Score pips have no text alternative
`.scorepips` (`app.js` `pips()`) convey match-confidence purely visually (3 dots). Add `aria-label` to the `.scorepips` span, e.g. `aria-label="match confidence 2 of 3"`, or it is just decorative noise / invisible info to SR users.

### N6. `alert()` / `confirm()` for export-empty and new-call
`exportLog()` and `newCall()` use native `alert`/`confirm`. These are actually accessible (UA handles focus), so this is fine — noting only that if they are ever replaced with custom toasts, those would need `role="status"` / `role="alertdialog"`.
