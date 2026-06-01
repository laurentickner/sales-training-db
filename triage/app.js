/* Scale Systems Triage Call Copilot.
   Walks the rep through the Scale Session triage script. When the prospect
   gives uncertainty, fires a big red PUSH BACK card with the exact pushback
   words. Data comes from window.TRIAGE_DATA (data/data.js), generated from
   triage-data/triage-data.json by scripts/build_triage_data.py. */

(function () {
  "use strict";

  /* ---------- fatal-start guard ---------- */
  function fail(msg) {
    document.body.innerHTML =
      '<div style="padding:40px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;' +
      'color:#ff6b6b;background:#0E0A1F;height:100vh">' +
      "<h2>Triage Call Copilot can't start</h2><p>" + msg + "</p>" +
      "<p style=\"color:#9F97B8\">Check that triage/data/data.js is present " +
      "(regenerate with scripts/build_triage_data.py).</p></div>";
    throw new Error(msg);
  }

  var DATA = window.TRIAGE_DATA;
  if (!DATA) fail("triage/data/data.js failed to load.");

  var CALL_STAGES = DATA.stages;
  var DM_STAGES = (DATA.dm_workflow && DATA.dm_workflow.stages) || [];
  var OB_STAGES = (DATA.outbound_workflow && DATA.outbound_workflow.stages) || [];
  var GLOBAL_SIGNALS = (DATA.uncertainty_globals && DATA.uncertainty_globals.signals) || [];
  var GLOBAL_ALERT = (DATA.uncertainty_globals && DATA.uncertainty_globals.alert) || "";
  // Closer's 29 objection handlers — wired in so triage catches the same
  // patterns (think-about-it, spouse, been-burned, price, etc.). Source:
  // app-data/objection-responses.json, bundled by build_triage_data.py.
  var OBJECTIONS = (DATA.objections && DATA.objections.objections) || [];
  if (!Array.isArray(CALL_STAGES) || !CALL_STAGES.length) fail("triage data has no call stages.");
  function STAGES() {
    if (state.mode === "dm") return DM_STAGES;
    if (state.mode === "outbound") return OB_STAGES;
    return CALL_STAGES;
  }

  /* ---------- safe localStorage ---------- */
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- schema version (for future state migrations) ----------
     Lightweight marker so future migrations can branch on stored version.
     Today everything is simple strings + one tiny JSON blob — no migration
     needed yet. Bump SCHEMA_VERSION + add a branch here when a localStorage
     shape changes incompatibly. */
  var SCHEMA_VERSION = 1;
  (function migrateSchema() {
    var stored = parseInt(store.get("triage_schema_version") || "0", 10);
    if (stored >= SCHEMA_VERSION) return;
    // (future migrations would branch on `stored` here)
    store.set("triage_schema_version", String(SCHEMA_VERSION));
  })();

  /* ---------- save-state pip (P0 #2) — flash "Saving…" amber, then
     settle to "Saved" green; idle to invisible after 1.2s. */
  function flashSavePip(elId) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.classList.remove("saved");
    el.classList.add("on", "saving");
    el.textContent = "Saving…";
    clearTimeout(el._savedTimer);
    clearTimeout(el._fadeTimer);
    el._savedTimer = setTimeout(function () {
      el.classList.remove("saving");
      el.classList.add("saved");
      el.textContent = "Saved";
      el._fadeTimer = setTimeout(function () {
        el.classList.remove("on", "saved");
      }, 1200);
    }, 180);
  }

  /* ---------- state ---------- */
  var state = {
    mode: store.get("triage_mode") || "call",  // "call" or "dm"
    stage: CALL_STAGES[0].id,
    log: [],
    liveFacts: store.get("triage_livefacts") || "",
    sayLineDone: {},       // { [stageId]: { [key]: true } } — ticked SAY lines per stage
    greenLightDone: {},    // "stageId|index" -> true
    focusMode: store.get("triage_focus_mode") === "1",  // hide-most-things mode for live calls
    showAllSay: false      // when focus is on, "Show all N more lines" toggle per stage view
  };
  var nextId = 1;

  /* ---------- visible error banner ---------- */
  function showErrorBanner(msg, file, line) {
    var loc = file ? (" (" + String(file).split("/").pop() + (line ? ":" + line : "") + ")") : "";
    var bar = document.getElementById("err-banner");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "err-banner";
      bar.setAttribute("style",
        "position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#3a1f1f;" +
        "color:#ffb4b4;font:13px/1.5 -apple-system,sans-serif;padding:11px 16px;" +
        "border-top:2px solid #ff6b6b;cursor:pointer;white-space:pre-wrap");
      bar.title = "Click to dismiss";
      bar.addEventListener("click", function () { bar.remove(); });
      (document.body || document.documentElement).appendChild(bar);
    }
    bar.textContent = "⚠ Triage Copilot error — screenshot this:\n" + msg + loc;
  }
  window.addEventListener("error", function (e) {
    showErrorBanner((e.error && e.error.message) || e.message || "Unknown error", e.filename, e.lineno);
  });

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(s) {
    return " " + String(s).toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9$ ]+/g, " ")
      .replace(/\s+/g, " ").trim() + " ";
  }
  function nowTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  function stageById(id) {
    var s = STAGES();
    return s.filter(function (x) { return x.id === id; })[0] || s[0];
  }
  function currentStage() { return stageById(state.stage); }
  function setMode(m) {
    if (m !== "call" && m !== "dm" && m !== "outbound") return;
    state.mode = m;
    store.set("triage_mode", m);
    document.body.classList.toggle("mode-call", m === "call");
    document.body.classList.toggle("mode-dm", m === "dm");
    document.body.classList.toggle("mode-outbound", m === "outbound");
    ["call", "dm", "outbound"].forEach(function (k) {
      var el = $("mode-" + k);
      if (el) {
        el.classList.toggle("active", m === k);
        el.setAttribute("aria-selected", m === k);
      }
    });
    $("left-title").textContent =
      m === "dm" ? "What the prospect just DM'd" :
      m === "outbound" ? "What the prospect just said on the dial" :
      "What the prospect just said";
    state.stage = STAGES()[0].id;
    renderStageStrip();
    renderToneBanner();
    renderStyleBanner();
    renderStageRef();
    var msg = m === "dm"
      ? "Paste their reply on the left. If it's vague, a red PUSH BACK card with the exact words to send will appear."
      : m === "outbound"
      ? "Type what they said on the call. If they push back or stall, a red PUSH BACK card with the exact words to use will appear."
      : "Type what the prospect just said on the left. If they give uncertainty, a big red PUSH BACK card with the exact words to use will appear.";
    $("copilot").innerHTML = '<div class="empty-state"><p class="empty-big">Ready.</p>' +
      "<p>" + msg + "</p></div>";
  }
  function renderStyleBanner() {
    var bar = $("style-banner");
    if (state.mode === "dm") {
      var styleRule = (DATA.dm_workflow && DATA.dm_workflow.style_rule) || "";
      var crmRule = (DATA.dm_workflow && DATA.dm_workflow.crm_rule) || "";
      var html = "";
      if (styleRule) {
        html += "<div><b>MIRROR THEIR STYLE every time.</b> " +
          esc(styleRule).replace(/^MIRROR THEIR STYLE every time\. /, "") + "</div>";
      }
      if (crmRule) {
        html += '<div style="margin-top:6px"><b>📒 CRM RULE.</b> ' + esc(crmRule) + "</div>";
      }
      bar.hidden = false; bar.innerHTML = html;
    } else if (state.mode === "outbound") {
      var obStyle = (DATA.outbound_workflow && DATA.outbound_workflow.style_rule) || "";
      if (obStyle) {
        bar.hidden = false;
        bar.innerHTML = "<div><b>TONALITY IS EVERYTHING.</b> " + esc(obStyle) + "</div>";
      } else {
        bar.hidden = true; bar.innerHTML = "";
      }
    } else {
      bar.hidden = true; bar.innerHTML = "";
    }
  }

  /* ---------- match: detect uncertainty in prospect's response ---------- */
  function matchTriggers(inputNorm, triggers) {
    var hits = [];
    for (var i = 0; i < triggers.length; i++) {
      var t = triggers[i];
      var tn = norm(t);
      if (tn.length > 2 && inputNorm.indexOf(tn) !== -1) hits.push(t);
    }
    return hits;
  }
  function analyzeUncertainty(text) {
    var n = norm(text);
    var stage = currentStage();
    var stageHits = matchTriggers(n, stage.pushback_triggers || []);
    var globalHits = matchTriggers(n, GLOBAL_SIGNALS);
    // Also score against the closer's 29 objection handlers. Only used on
    // call mode (DM + Outbound have their own stage triggers + don't carry
    // the closer's full objection bank).
    var objectionHits = [];
    if (state.mode === "call") {
      OBJECTIONS.forEach(function (o) {
        var hits = matchTriggers(n, o.triggers || []);
        if (hits.length) objectionHits.push({ item: o, hits: hits });
      });
      // sort: uncertainty bucket first (Cole's funnel), then by hit count
      objectionHits.sort(function (a, b) {
        var ra = a.item.bucket === "uncertainty" ? 0 : 1;
        var rb = b.item.bucket === "uncertainty" ? 0 : 1;
        return ra !== rb ? ra - rb : b.hits.length - a.hits.length;
      });
      objectionHits = objectionHits.slice(0, 3);
    }
    return {
      stage: stage,
      stageHits: stageHits,
      globalHits: globalHits,
      objectionHits: objectionHits,
      anyHit: stageHits.length > 0 || globalHits.length > 0 || objectionHits.length > 0
    };
  }

  /* ---------- render: PUSH BACK card ---------- */
  function pushbackCard(result) {
    var stage = result.stage;
    var hits = result.stageHits.concat(result.globalHits);
    var h = '<div class="card card-pushback">';
    h += '<div class="card-head"><span class="card-kicker">⚠ PUSH BACK — DO NOT MOVE ON</span></div>';
    h += '<div class="card-title">' + esc(stage.name) + " — they just gave you uncertainty</div>";
    h += '<div class="card-sub">Their answer was vague / a stall / a non-commit. Use this verbatim:</div>';
    h += '<div class="say-block"><div class="say-label">Say this</div>';
    var lines = String(stage.pushback_script).split("\n");
    lines.forEach(function (line, i) {
      if (line.trim() === "") return;
      h += '<div class="say-step"><span class="say-num">' + (i + 1) + "</span><span>" + esc(line) + "</span></div>";
    });
    h += "</div>";
    if (result.globalHits.length) {
      h += '<div class="say-block"><div class="say-label">Generic stall language</div>';
      h += '<div class="say-step"><span class="say-num">↳</span><span>' + esc(GLOBAL_ALERT) + "</span></div></div>";
    }
    h += '<div class="pushback-trigger">matched: ' + esc(hits.slice(0, 4).join(", ")) + "</div>";
    h += "</div>";
    return h;
  }
  function noneCard() {
    var stage = currentStage();
    return '<div class="card card-none">' +
      '<div class="card-head"><span class="card-kicker">✓ No uncertainty</span></div>' +
      '<div class="card-sub" style="padding-top:2px">No stall language in that line. Keep running ' +
      '<strong>' + esc(stage.name) + '</strong> until you’ve hit the green-light criteria below.</div>' +
      "</div>";
  }

  /* ---------- render: objection card (from closer's 29-objection bank) ---------- */
  function objectionCard(m) {
    var o = m.item, h = "";
    h += '<div class="card card-obj">';
    h += '<div class="card-head"><span class="card-kicker">▲ Objection detected</span>';
    h += '<span class="card-bucket">' + esc(o.bucket || "") + "</span></div>";
    h += '<div class="card-title">' + esc(o.label) + "</div>";
    h += '<div class="handle-strip">↳ Run: <b>diffuse → isolate → temp-check → scale → double tie-down</b>, then:</div>';
    h += '<div class="say-block"><div class="say-label">Say this</div>';
    (o.response_steps || []).forEach(function (s, i) {
      h += '<div class="say-step"><span class="say-num">' + (i + 1) + "</span><span>" + esc(s) + "</span></div>";
    });
    h += "</div>";
    if (o.do_not) h += '<div class="donot"><strong>Don\'t:</strong> ' + esc(o.do_not) + "</div>";
    h += '<div class="pushback-trigger">matched: ' + esc(m.hits.slice(0, 4).join(", ")) + "</div>";
    h += "</div>";
    return h;
  }

  /* ---------- render: call log ---------- */
  function logEntryHtml(e) {
    var txt = e.text.length > 280 ? e.text.slice(0, 280) + "…" : e.text;
    var tag = e.result.anyHit ?
      '<span class="log-tag tag-obj">⚠ pushback</span>' :
      '<span class="log-tag tag-none">✓ clear</span>';
    return '<div class="log-entry" data-id="' + e.id + '" role="button" tabindex="0">' +
      '<div class="log-time">' + esc(e.time) + " · " + esc(e.stageName) + "</div>" +
      '<div class="log-text">' + esc(txt) + "</div>" +
      '<div class="log-tags">' + tag + "</div></div>";
  }
  function renderLog() {
    var el = $("log");
    if (!state.log.length) { el.innerHTML = '<p class="hint">Nothing logged yet.</p>'; return; }
    el.innerHTML = state.log.slice().reverse().map(logEntryHtml).join("");
  }

  /* ---------- analyze ---------- */
  function analyze() {
    var raw = $("input").value.trim();
    if (!raw) return;
    var text = raw.slice(0, 2000);
    var result = analyzeUncertainty(text);
    var entry = {
      id: nextId++, time: nowTime(), stageName: currentStage().name,
      text: text, result: result
    };
    state.log.push(entry);
    $("input").value = "";
    renderLog();
    var c = $("copilot");
    if (result.anyHit) {
      // Objections (from the closer's bank) lead — Cole's rule: handle
      // every objection on appearance. Stage pushback comes after.
      // ARIA: assertive so screen readers interrupt — this is a deal-
      // breaking signal the rep can't miss (WCAG SC 4.1.3).
      c.setAttribute("aria-live", "assertive");
      var html = "";
      if (result.objectionHits && result.objectionHits.length) {
        html += result.objectionHits.map(objectionCard).join("");
      }
      if (result.stageHits.length || result.globalHits.length) {
        html += pushbackCard(result);
      }
      c.innerHTML = html;
    } else {
      // ARIA: polite — no urgency, just an FYI the line was clean.
      c.setAttribute("aria-live", "polite");
      c.innerHTML = noneCard();
    }
    c.scrollTop = 0;
    c.focus();
  }

  /* ---------- render: stage strip + stage reference ---------- */
  function renderStageStrip() {
    var strip = $("stage-strip");
    strip.innerHTML = STAGES().map(function (s) {
      var active = s.id === state.stage;
      return '<button class="stage-pill' + (active ? " active" : "") +
        '" data-id="' + esc(s.id) + '" aria-pressed="' + active + '">' +
        esc(s.name) + "</button>";
    }).join("");
    var activeEl = strip.querySelector(".stage-pill.active");
    if (activeEl && activeEl.scrollIntoView)
      activeEl.scrollIntoView({ inline: "center", block: "nearest" });
  }
  function renderToneBanner() {
    var s = currentStage();
    var bar = $("tone-banner");
    if (s.tone) { bar.hidden = false; bar.textContent = s.tone; }
    else { bar.hidden = true; bar.textContent = ""; }
  }
  // Stable key for a SAY line — combines stage id, index, and a text
  // signature so re-ordering the JSON doesn't carry ticks to the wrong line.
  function sayLineKey(stageId, index, text) {
    var sig = String(text || "").slice(0, 60).replace(/\s+/g, " ").trim();
    return stageId + "|" + index + "|" + sig;
  }
  function renderSayLi(stageId, index, line) {
    var key = sayLineKey(stageId, index, line);
    var done = !!(state.sayLineDone[stageId] && state.sayLineDone[stageId][key]);
    return '<li class="sr-say-li' + (done ? " on" : "") +
      '" data-stage="' + esc(stageId) + '" data-key="' + esc(key) + '">' +
      '<span class="sr-say-box" aria-hidden="true"></span>' +
      '<span class="sr-say-text">' + esc(line) + "</span></li>";
  }
  function renderStageRef() {
    var s = currentStage();
    var h = "<h3>" + esc(s.name) + " — what to do</h3>";
    h += '<div class="sr-goal"><strong>Goal:</strong> ' + esc(s.goal) + "</div>";
    h += '<div class="sr-say-label">Say</div>';
    // Focus mode: show first 3 SAY lines by default; "Show all N more" expands.
    var sayLines = s.say || [];
    var listClass = "sr-say-list" + (state.showAllSay ? " expanded" : "");
    h += '<ul class="' + listClass + '">';
    sayLines.forEach(function (line, idx) { h += renderSayLi(s.id, idx, line); });
    h += "</ul>";
    if (sayLines.length > 3 && !state.showAllSay) {
      h += '<button class="sr-show-more-say" data-action="show-all-say">+ Show ' +
        (sayLines.length - 3) + ' more lines</button>';
    }

    // "Advance when:" callout — bidirectional cascade with green-light chips.
    // advReady is DERIVED from chip state: green when (and only when) every
    // green-light chip for this stage is ticked. Clicking the callout flips
    // all chips at once (tick-all if not all-ticked, untick-all if all-ticked).
    // Result: the callout always honestly reflects whether the stage is done.
    var hasChips = !!(s.green_light && s.green_light.length);
    var advReady = hasChips && s.green_light.every(function (_, idx) {
      return !!state.greenLightDone[s.id + "|" + idx];
    });
    if (hasChips) {
      h += '<button class="sr-advance' + (advReady ? " on" : "") +
        '" data-stage="' + esc(s.id) + '" aria-pressed="' + advReady + '">' +
        '<span class="sr-advance-box" aria-hidden="true"></span>' +
        '<span class="sr-advance-text">' +
        '<strong>Advance when:</strong> ' + esc(s.goal) +
        "</span></button>";
    }

    if (hasChips) {
      h += '<div class="greenlight-zone">';
      h += '<div class="greenlight-title">Green-light — tick before moving on</div>';
      s.green_light.forEach(function (item, idx) {
        var key = s.id + "|" + idx;
        var on = !!state.greenLightDone[key];
        h += '<button class="greenlight-chip' + (on ? " on" : "") +
          '" data-key="' + esc(key) + '" aria-pressed="' + on + '">' + esc(item) + "</button>";
      });
      h += "</div>";
    }

    // Focus-mode action zone — non-linear routing chips (if defined) +
    // a primary "I got their X, next →" button + a "jump to another
    // stage" picker. Hidden in dense mode (existing advance-when callout
    // is the dense-mode equivalent).
    if (state.focusMode) {
      h += '<div class="sr-focus-actions">';

      // Conditional routing (Opening + Results have these — discovery isn't linear)
      if (s.routes && s.routes.length) {
        h += '<div class="sr-routes">';
        h += '<div class="sr-routes-label">What did they mention first?</div>';
        h += '<div class="sr-routes-chips">';
        s.routes.forEach(function (r) {
          h += '<button class="sr-route" data-stage="' + esc(r.next_stage) + '" ' +
            'title="' + esc(r.hint || "") + '">→ ' + esc(r.label) + "</button>";
        });
        h += "</div></div>";
      }

      // Primary "I got their X, next →" button — ticks all green-lights
      // for the current stage AND advances to next stage in order.
      var next = nextStageInOrder(s.id);
      var advanceLabel = s.advance_label || "what I need";
      var btnText = next
        ? "✓ I got their " + advanceLabel + ", next →"
        : "✓ I got their " + advanceLabel + " — done";
      h += '<button class="sr-move-on" data-action="move-on">' +
        esc(btnText) + "</button>";

      // Jump-to picker — collapsed by default; click to expand.
      h += '<details class="sr-jump-picker"><summary>↗ Jump to another stage</summary>';
      h += '<div class="sr-jump-chips">';
      STAGES().forEach(function (other) {
        if (other.id === s.id) return;
        h += '<button class="sr-jump-chip" data-stage="' + esc(other.id) +
          '">' + esc(other.name) + "</button>";
      });
      h += "</div></details>";

      h += "</div>";
    }

    $("stage-ref").innerHTML = h;
  }

  // Returns the next stage object in the current mode's array, or null if last.
  function nextStageInOrder(currentId) {
    var stages = STAGES();
    for (var i = 0; i < stages.length - 1; i++) {
      if (stages[i].id === currentId) return stages[i + 1];
    }
    return null;
  }
  function setStage(id) {
    state.stage = stageById(id).id;
    state.showAllSay = false;  // each new stage starts with the focus-mode 3-line view
    renderStageStrip();
    renderToneBanner();
    renderStageRef();
    // clear any lingering pushback card from the previous stage
    var c = $("copilot");
    if (c.querySelector(".card-pushback") || c.querySelector(".card-none")) {
      c.innerHTML = '<div class="empty-state"><p class="empty-big">Ready.</p>' +
        '<p>See the script for this stage below. Type what the prospect said on the left to analyse.</p></div>';
    }
  }

  /* ---------- new call ---------- */
  function newCall() {
    if (state.log.length && !confirm("Start a fresh session? This clears the log, ticks, and green-lights.")) return;
    state.log = [];
    state.greenLightDone = {};
    state.sayLineDone = {};
    nextId = 1;
    renderLog();
    setStage(STAGES()[0].id);
    $("copilot").innerHTML = '<div class="empty-state"><p class="empty-big">Ready.</p>' +
      '<p>Type what the prospect just said on the left.</p></div>';
    $("input").focus();
  }

  /* ---------- focus mode (hide everything except live-call essentials) ---------- */
  function applyFocusMode() {
    document.body.classList.toggle("focus-mode", !!state.focusMode);
    var lbl = $("focus-label");
    if (lbl) lbl.textContent = state.focusMode ? "End call" : "Start call";
    var btn = $("btn-focus");
    if (btn) {
      btn.title = state.focusMode
        ? "Exit focus mode — show all panels"
        : "Hide everything except what you need for the live call";
      // Swap glyph too
      var glyph = btn.querySelector("span[aria-hidden]");
      if (glyph) glyph.textContent = state.focusMode ? "■" : "▶";
    }
  }
  function toggleFocusMode() {
    state.focusMode = !state.focusMode;
    state.showAllSay = false;  // reset on enter/exit so the truncation re-applies
    store.set("triage_focus_mode", state.focusMode ? "1" : "0");
    applyFocusMode();
    renderStageRef();
  }

  /* ---------- font size cycle (S / M / L / XL on <body>) ---------- */
  var FONT_SIZES = [
    { id: "s",  label: "S" },
    { id: "m",  label: "M" },
    { id: "l",  label: "L" },
    { id: "xl", label: "XL" }
  ];
  function applyFontSize(id) {
    var body = document.body;
    FONT_SIZES.forEach(function (s) { body.classList.remove("fs-" + s.id); });
    if (id && id !== "m") body.classList.add("fs-" + id);
    var lbl = $("fontsize-label");
    if (lbl) {
      var found = FONT_SIZES.find(function (s) { return s.id === id; });
      lbl.textContent = (found && found.label) || "M";
    }
    store.set("triage_font_size", id);
  }
  function cycleFontSize() {
    var current = store.get("triage_font_size") || "m";
    var i = FONT_SIZES.findIndex(function (s) { return s.id === current; });
    var next = FONT_SIZES[(i + 1) % FONT_SIZES.length];
    applyFontSize(next.id);
  }

  /* ---------- 3-pane drag-resize ----------
     vsplitter = left vs right; hsplitter = copilot vs stage-ref.
     Both persist size in localStorage. Keyboard arrows nudge in steps. */
  function attachSplitterListeners() {
    var saved = (function () {
      try { return JSON.parse(store.get("triage_pane_sizes") || "{}"); }
      catch (e) { return {}; }
    })();
    var panelLeft = $("panel-left");
    var copilotEl = $("copilot");
    var stageRefEl = $("stage-ref");
    if (saved.leftPct && panelLeft) {
      panelLeft.style.flex = "0 0 " + saved.leftPct + "%";
    }
    if (saved.copilotPct && copilotEl && stageRefEl) {
      copilotEl.style.flex = "0 0 " + saved.copilotPct + "%";
      stageRefEl.style.flex = "0 0 " + (98 - saved.copilotPct) + "%";
    }
    function persist(partial) {
      var prev;
      try { prev = JSON.parse(store.get("triage_pane_sizes") || "{}"); }
      catch (e) { prev = {}; }
      var next = Object.assign({}, prev, partial);
      store.set("triage_pane_sizes", JSON.stringify(next));
    }
    var vs = $("vsplitter");
    if (vs && panelLeft) {
      var dragV = false;
      vs.addEventListener("pointerdown", function (e) {
        dragV = true; vs.classList.add("dragging");
        vs.setPointerCapture && vs.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      vs.addEventListener("pointermove", function (e) {
        if (!dragV) return;
        var layout = $("layout"); if (!layout) return;
        var rect = layout.getBoundingClientRect();
        var pct = ((e.clientX - rect.left) / rect.width) * 100;
        pct = Math.max(20, Math.min(75, pct));
        panelLeft.style.flex = "0 0 " + pct.toFixed(1) + "%";
      });
      vs.addEventListener("pointerup", function (e) {
        if (!dragV) return;
        dragV = false; vs.classList.remove("dragging");
        try { vs.releasePointerCapture && vs.releasePointerCapture(e.pointerId); } catch (er) {}
        var m = (panelLeft.style.flex || "").match(/0 0 ([0-9.]+)%/);
        if (m) persist({ leftPct: parseFloat(m[1]) });
      });
      vs.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        var m = (panelLeft.style.flex || "0 0 40%").match(/0 0 ([0-9.]+)%/);
        var cur = m ? parseFloat(m[1]) : 40;
        var next = Math.max(20, Math.min(75, cur + (e.key === "ArrowLeft" ? -2 : 2)));
        panelLeft.style.flex = "0 0 " + next.toFixed(1) + "%";
        persist({ leftPct: next });
      });
    }
    var hs = $("hsplitter");
    if (hs && copilotEl && stageRefEl) {
      var dragH = false;
      hs.addEventListener("pointerdown", function (e) {
        dragH = true; hs.classList.add("dragging");
        hs.setPointerCapture && hs.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      hs.addEventListener("pointermove", function (e) {
        if (!dragH) return;
        var panelRight = $("panel-right"); if (!panelRight) return;
        var rect = panelRight.getBoundingClientRect();
        var pct = ((e.clientY - rect.top - 50) / (rect.height - 50)) * 100;
        pct = Math.max(20, Math.min(85, pct));
        copilotEl.style.flex = "0 0 " + pct.toFixed(1) + "%";
        stageRefEl.style.flex = "0 0 " + (98 - pct).toFixed(1) + "%";
      });
      hs.addEventListener("pointerup", function (e) {
        if (!dragH) return;
        dragH = false; hs.classList.remove("dragging");
        try { hs.releasePointerCapture && hs.releasePointerCapture(e.pointerId); } catch (er) {}
        var m = (copilotEl.style.flex || "").match(/0 0 ([0-9.]+)%/);
        if (m) persist({ copilotPct: parseFloat(m[1]) });
      });
      hs.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        var m = (copilotEl.style.flex || "1 1 60%").match(/(?:0 0|1 1) ([0-9.]+)%/);
        var cur = m ? parseFloat(m[1]) : 60;
        var next = Math.max(20, Math.min(85, cur + (e.key === "ArrowUp" ? -3 : 3)));
        copilotEl.style.flex = "0 0 " + next.toFixed(1) + "%";
        stageRefEl.style.flex = "0 0 " + (98 - next).toFixed(1) + "%";
        persist({ copilotPct: next });
      });
    }
  }

  /* ---------- init ---------- */
  function init() {
    // restore mode from storage
    if (state.mode === "dm" || state.mode === "outbound") {
      document.body.classList.toggle("mode-call", state.mode === "call");
      document.body.classList.toggle("mode-dm", state.mode === "dm");
      document.body.classList.toggle("mode-outbound", state.mode === "outbound");
      ["call", "dm", "outbound"].forEach(function (k) {
        var el = $("mode-" + k);
        if (el) {
          el.classList.toggle("active", state.mode === k);
          el.setAttribute("aria-selected", state.mode === k);
        }
      });
      $("left-title").textContent = state.mode === "dm"
        ? "What the prospect just DM'd"
        : "What the prospect just said on the dial";
    }
    state.stage = STAGES()[0].id;
    renderStageStrip();
    renderToneBanner();
    renderStyleBanner();
    renderStageRef();
    renderLog();
    $("live-facts").value = state.liveFacts;

    $("mode-call").addEventListener("click", function () { setMode("call"); });
    $("mode-dm").addEventListener("click", function () { setMode("dm"); });
    $("mode-outbound").addEventListener("click", function () { setMode("outbound"); });

    $("btn-analyze").addEventListener("click", analyze);
    $("input").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyze(); }
    });
    $("btn-newcall").addEventListener("click", newCall);

    // Focus mode: restore from storage + wire the toggle button
    applyFocusMode();
    var btnFocus = $("btn-focus");
    if (btnFocus) btnFocus.addEventListener("click", toggleFocusMode);

    // Font size: restore from storage + wire the cycle button
    applyFontSize(store.get("triage_font_size") || "m");
    var btnFs = $("btn-fontsize");
    if (btnFs) btnFs.addEventListener("click", cycleFontSize);

    // 3-pane drag-resize
    attachSplitterListeners();

    $("live-facts").addEventListener("input", function () {
      state.liveFacts = this.value;
      store.set("triage_livefacts", state.liveFacts);
      flashSavePip("facts-save-pip");
    });
    $("stage-strip").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".stage-pill") : null;
      if (b) setStage(b.getAttribute("data-id"));
    });
    $("stage-ref").addEventListener("click", function (e) {
      if (!e.target.closest) return;
      // "Show all N more lines" toggle (focus mode SAY truncation)
      var showMore = e.target.closest('[data-action="show-all-say"]');
      if (showMore) {
        state.showAllSay = true;
        renderStageRef();
        return;
      }
      // Focus-mode "I got their X, next →" — cascade-tick all green-lights
      // for the current stage, then advance to the next stage in order.
      var moveOn = e.target.closest('[data-action="move-on"]');
      if (moveOn) {
        var s = currentStage();
        if (s.green_light) {
          s.green_light.forEach(function (_, idx) {
            state.greenLightDone[s.id + "|" + idx] = true;
          });
        }
        var next = nextStageInOrder(s.id);
        if (next) setStage(next.id);
        else renderStageRef();
        return;
      }
      // Focus-mode route chip — non-linear discovery jump (e.g. Opening → Results)
      var route = e.target.closest(".sr-route");
      if (route) {
        var routeStageId = route.getAttribute("data-stage");
        if (routeStageId) setStage(routeStageId);
        return;
      }
      // Focus-mode jump-to-stage chip — pick any other stage
      var jump = e.target.closest(".sr-jump-chip");
      if (jump) {
        var jumpStageId = jump.getAttribute("data-stage");
        if (jumpStageId) setStage(jumpStageId);
        return;
      }
      // SAY line tick
      var sayLi = e.target.closest(".sr-say-li");
      if (sayLi) {
        var sid = sayLi.getAttribute("data-stage");
        var sk = sayLi.getAttribute("data-key");
        if (!state.sayLineDone[sid]) state.sayLineDone[sid] = {};
        if (state.sayLineDone[sid][sk]) delete state.sayLineDone[sid][sk];
        else state.sayLineDone[sid][sk] = true;
        renderStageRef();
        return;
      }
      // Advance-when callout tick — toggles all green-light chips at once.
      // The advance button's own "ticked" state is derived from chip state,
      // so we just flip the chips and the button follows.
      var adv = e.target.closest(".sr-advance");
      if (adv) {
        var advStageId = adv.getAttribute("data-stage");
        var stage = stageById(advStageId);
        if (stage && stage.green_light) {
          var allOn = stage.green_light.every(function (_, idx) {
            return !!state.greenLightDone[advStageId + "|" + idx];
          });
          stage.green_light.forEach(function (_, idx) {
            state.greenLightDone[advStageId + "|" + idx] = !allOn;
          });
        }
        renderStageRef();
        return;
      }
      // Green-light chip tick
      var chip = e.target.closest(".greenlight-chip");
      if (chip) {
        var k = chip.getAttribute("data-key");
        state.greenLightDone[k] = !state.greenLightDone[k];
        renderStageRef();
      }
    });
    $("input").focus();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
