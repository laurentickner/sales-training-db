# Focus Mode — Design Plan

**Status:** Proposed by Lauren 2026-06-01. Not yet shipped.
**Author of conversation:** Lauren + Claude (chat session about to compress).
**Where this fits:** New top-level mode on top of the existing 3-tab tool (Triage Call / DMs / Outbound).

---

## The problem

Today the triage tool shows **everything at once** — stage strip, copilot panel, stage reference with all 11 SAY lines, green-light chips, the "Advance when" callout, the closer's 29-objection bank ready to fire. That density is great when scanning during a call. It's overwhelming when you're trying to **execute one move at a time** — especially on mobile.

## The proposal

Add a **"Start call" button** that enters a stripped-down **Focus Mode**:

- One thing visible at a time
- Just the current stage's most relevant 3 SAY lines (not all 11)
- A big "What did they just say?" textarea
- A `Help` button that opens the objection bank as a drawer when needed
- Mobile-first layout — vertical scroll, big tap targets
- Everything else (logs, notes, stage strip) hidden behind a `Show all` toggle

Re-frames the tool as: **prep → focus → review** instead of always-everything-on-screen.

---

## UX flow

### State 1 — Pre-call (current UI mostly)
Mariana opens the tool. Sees the full dense UI. Uses the **Triage Notes** textarea to capture pre-call context if she has it (name, source, goal, anything from a prior DM or booking form).

A new **`▶ Start call`** button sits prominently in the topbar (or at the top of the Triage Notes block).

### State 2 — Focus mode (NEW)
Click `▶ Start call` → the dense UI collapses. What's shown:

```
┌────────────────────────────────────────┐
│   1. Opening                  3/10 →   │  ← compact stage indicator + progress
├────────────────────────────────────────┤
│   GOAL: Make sure you know WHY they    │  ← 1-line goal, 18px
│   booked the call.                     │
├────────────────────────────────────────┤
│   ▢ Hi [name]. Tell me about your day. │  ← Tickable, 32px+ tap target
│   ▢ Fantastic over here!               │
│   ▢ I'm Mariana, I oversee...          │
│      [Show all 11 lines ↓]             │  ← Collapsible: top 3 by default
├────────────────────────────────────────┤
│   What did they just say?              │
│   ┌──────────────────────────────────┐ │
│   │ [textarea, big, full-width]      │ │
│   └──────────────────────────────────┘ │
│             [ Analyze ⏎ ]              │
├────────────────────────────────────────┤
│   ──────  Advance when ready  ──────   │
│   ▢ You know the specific reason they  │  ← Green-light criteria
│     booked the call                    │
│   ▢ There is a clear pain or goal      │
│             [ Next stage → ]           │  ← Big primary button
└────────────────────────────────────────┘
                                  ┌────┐
                                  │ ? Help │   ← Floating button, bottom-right
                                  └────┘
```

**Hidden in focus mode** (still in DOM, just hidden via class):
- Stage strip (all 10 pills)
- Mode switch (Call / DMs / Outbound)
- Font size button
- Triage Notes textarea (collapses to a small "Notes" indicator that expands on tap)
- Call log
- Copilot panel (only shows WHEN a card fires from analyze)

### State 3 — Card fires
When Mariana types something and hits Analyze + a card fires (PUSH BACK / objection), the card slides up from the bottom of the focus pane and takes over the visual field. Hitting `✕` dismisses it back to State 2.

### State 4 — Help opens
Click the floating `? Help` button → drawer slides in from the right (desktop) or covers the screen (mobile). Shows:
- All 29 closer objection cards searchable
- The current stage's full PUSH BACK script
- Standing moves cheat-card (loop-back, hedge-words, identity-shift, verbal pacing, past-pain probe)

Closing the drawer returns to State 2.

### State 5 — End of call
Big `End call →` button at bottom of focus mode. Returns to State 1 (full dense view) with all the ticks + notes preserved so Mariana can write the closer hand-off.

---

## Mobile considerations

Focus mode IS the mobile view. At widths <820px:
- The desktop "compact stage indicator + progress" header stays sticky at top
- Lines stack vertically, no side-by-side
- `? Help` floating button is bottom-right (thumb-reach zone)
- "Next stage →" big primary button at bottom
- Swipe-up gesture on the Notes indicator expands it to a sheet

At widths ≥820px, focus mode collapses the LEFT panel entirely and centres the column at ~640px max-width so it doesn't stretch awkwardly on a wide monitor.

---

## Implementation notes

### State model

New state field: `state.focusMode: boolean`. Persisted in localStorage so reload preserves it within a call.

New body class: `body.focus-mode` triggers all the CSS hide/show.

### CSS

```css
/* Hide noise in focus mode */
body.focus-mode .stage-strip,
body.focus-mode .mode-switch,
body.focus-mode #btn-fontsize,
body.focus-mode .panel-left .facts-zone,
body.focus-mode .panel-left .log,
body.focus-mode .vsplitter,
body.focus-mode .hsplitter,
body.focus-mode .style-banner,
body.focus-mode .tone-banner { display: none; }

body.focus-mode .layout { max-width: 640px; margin: 0 auto; }
body.focus-mode .panel-left { flex: 0 0 100% !important; }
body.focus-mode .panel-right { display: none; }

/* SAY-list collapse: show top 3, hide the rest behind "show all" */
body.focus-mode .sr-say-list > li:nth-child(n+4):not(.expanded) { display: none; }
```

### JS

```js
function enterFocusMode() {
  state.focusMode = true;
  store.set("triage_focus_mode", "1");
  document.body.classList.add("focus-mode");
  // re-render to apply truncated SAY list
  renderStageRef();
}

function exitFocusMode() {
  state.focusMode = false;
  store.set("triage_focus_mode", "0");
  document.body.classList.remove("focus-mode");
  renderStageRef();
}
```

### Help drawer

New `#help-drawer` element in index.html. Hidden by default. Slides in via CSS transform + opacity transition. Contains a search input + the 29 objection cards + standing moves card. ESC + clicking outside + `✕` button all close it.

### Backwards-compat

`Show all ↓` toggle in focus mode shows all SAY lines for that stage (`.expanded` class on the `<ul>`). Click again to collapse.

---

## What this doesn't do (and why)

- **Doesn't change the script.** Lauren's been clear: script stays as-is. Focus mode is purely a visibility shell.
- **Doesn't add ASR / audio.** No "auto-listen" — Mariana still types prospect lines. The mode just declutters.
- **Doesn't replace the dense view.** It's a TOGGLE, not a replacement. Power users (Mariana once she's expert) can stay in dense mode.

---

## Ship sequence

1. **First commit:** add `state.focusMode` + body class + CSS hide-rules + the `▶ Start call` / `End call ←` buttons + the SAY-list truncation. ~1 hour.
2. **Second commit:** the `? Help` floating button + drawer with objection bank. ~1 hour.
3. **Third commit:** mobile polish — bottom-sheet for Notes, sticky stage header, thumb-reach button positioning. ~30 min.

Total: ~2.5 hours. Low risk because everything's additive (existing dense mode unaffected).

---

## Open questions Lauren needs to answer

1. **"Top 3 SAY lines"** — how does the tool know WHICH 3? Options:
   - First 3 in order (simple)
   - The 3 that aren't yet ticked (smart but harder)
   - Manually flagged "priority" in the JSON (most flexible but requires data edit)
2. **"Help" button content** — just the objection bank? Or also the per-stage pushback_script? Or also the "standing moves" cheat-card? (Recommend: all three, in tabs.)
3. **Does Triage Notes stay accessible in focus mode** via expand-on-tap, or hidden entirely until End call? (Recommend: expand-on-tap — she'll want to capture facts mid-call.)
4. **Does the Help button surface the objection bank automatically when a card matches** (so she doesn't have to ask), or only on her tap? (Recommend: automatic — same as today's behaviour, just rendered in the drawer instead of the bottom panel.)

---

## Reference

- Round 3 of UI-RESEARCH-2026-06.md (in client fork) — the "auto-dim everything except active stage tab" rec + the "task-aware workspace" pattern from Microsoft 365 Copilot — both inform this design.
- The conversation that birthed this plan: 2026-06-01 chat with Lauren, after shipping the P0 hygiene batch (commit `74d42db`).
