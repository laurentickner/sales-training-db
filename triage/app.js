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
  var GLOBAL_SIGNALS = (DATA.uncertainty_globals && DATA.uncertainty_globals.signals) || [];
  var GLOBAL_ALERT = (DATA.uncertainty_globals && DATA.uncertainty_globals.alert) || "";
  if (!Array.isArray(CALL_STAGES) || !CALL_STAGES.length) fail("triage data has no call stages.");
  function STAGES() { return state.mode === "dm" ? DM_STAGES : CALL_STAGES; }

  /* ---------- safe localStorage ---------- */
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- state ---------- */
  var state = {
    mode: store.get("triage_mode") || "call",  // "call" or "dm"
    stage: CALL_STAGES[0].id,
    log: [],
    liveFacts: store.get("triage_livefacts") || "",
    greenLightDone: {}   // "stageId|index" -> true
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
    if (m !== "call" && m !== "dm") return;
    state.mode = m;
    store.set("triage_mode", m);
    document.body.classList.toggle("mode-dm", m === "dm");
    $("mode-call").classList.toggle("active", m === "call");
    $("mode-dm").classList.toggle("active", m === "dm");
    $("mode-call").setAttribute("aria-selected", m === "call");
    $("mode-dm").setAttribute("aria-selected", m === "dm");
    $("left-title").textContent = m === "dm"
      ? "What the prospect just DM'd"
      : "What the prospect just said";
    state.stage = STAGES()[0].id;
    renderStageStrip();
    renderToneBanner();
    renderStageRef();
    $("copilot").innerHTML = '<div class="empty-state"><p class="empty-big">Ready.</p>' +
      "<p>" + (m === "dm"
        ? "Paste their reply on the left. If it's vague, a red PUSH BACK card with the exact words to send will appear."
        : "Type what the prospect just said on the left. If they give uncertainty, a big red PUSH BACK card with the exact words to use will appear.") +
      "</p></div>";
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
    return {
      stage: stage,
      stageHits: stageHits,
      globalHits: globalHits,
      anyHit: stageHits.length > 0 || globalHits.length > 0
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
    c.innerHTML = result.anyHit ? pushbackCard(result) : noneCard();
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
  function renderStageRef() {
    var s = currentStage();
    var h = "<h3>" + esc(s.name) + " — what to do</h3>";
    h += '<div class="sr-goal"><strong>Goal:</strong> ' + esc(s.goal) + "</div>";
    h += '<div class="sr-say-label">Say</div><ul>';
    (s.say || []).forEach(function (line) { h += "<li>" + esc(line) + "</li>"; });
    h += "</ul>";
    if (s.green_light && s.green_light.length) {
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
    $("stage-ref").innerHTML = h;
  }
  function setStage(id) {
    state.stage = stageById(id).id;
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
    if (state.log.length && !confirm("Start a fresh session? This clears the log + green-lights.")) return;
    state.log = [];
    state.greenLightDone = {};
    nextId = 1;
    renderLog();
    setStage(STAGES()[0].id);
    $("copilot").innerHTML = '<div class="empty-state"><p class="empty-big">Ready.</p>' +
      '<p>Type what the prospect just said on the left.</p></div>';
    $("input").focus();
  }

  /* ---------- init ---------- */
  function init() {
    // restore mode from storage
    if (state.mode === "dm") {
      document.body.classList.add("mode-dm");
      $("mode-call").classList.remove("active");
      $("mode-dm").classList.add("active");
      $("mode-call").setAttribute("aria-selected", "false");
      $("mode-dm").setAttribute("aria-selected", "true");
      $("left-title").textContent = "What the prospect just DM'd";
    }
    state.stage = STAGES()[0].id;
    renderStageStrip();
    renderToneBanner();
    renderStageRef();
    renderLog();
    $("live-facts").value = state.liveFacts;

    $("mode-call").addEventListener("click", function () { setMode("call"); });
    $("mode-dm").addEventListener("click", function () { setMode("dm"); });

    $("btn-analyze").addEventListener("click", analyze);
    $("input").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyze(); }
    });
    $("btn-newcall").addEventListener("click", newCall);
    $("live-facts").addEventListener("input", function () {
      state.liveFacts = this.value;
      store.set("triage_livefacts", state.liveFacts);
    });
    $("stage-strip").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".stage-pill") : null;
      if (b) setStage(b.getAttribute("data-id"));
    });
    $("stage-ref").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".greenlight-chip") : null;
      if (!b) return;
      var k = b.getAttribute("data-key");
      state.greenLightDone[k] = !state.greenLightDone[k];
      renderStageRef();
    });
    $("input").focus();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
