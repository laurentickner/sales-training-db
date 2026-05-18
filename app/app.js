/* Call Copilot — Scale Systems. v1 (type-driven). Live audio notetaker = v2.
   Data comes from window.COPILOT_DATA (data/data.js), generated from app-data/*.json. */

(function () {
  "use strict";

  var DATA = window.COPILOT_DATA;
  if (!DATA) { alert("data/data.js failed to load."); return; }

  var OBJECTIONS = DATA.objections.objections;
  var FRAMEWORK  = DATA.objections.universal_framework;
  var FLAGS      = DATA.discoveryFlags.flags;
  var STAGES     = DATA.funnel.stages;

  /* ---------- state ---------- */
  var state = {
    stage: "discovery",
    log: [],            // { id, time, text, result }
    apiKey: localStorage.getItem("copilot_api_key") || "",
    smart: localStorage.getItem("copilot_smart") === "1"
  };

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function norm(s) {
    return " " + String(s).toLowerCase().replace(/[^a-z0-9$ ]+/g, " ").replace(/\s+/g, " ").trim() + " ";
  }
  function nowTime() {
    var d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  /* ---------- matching engine (keyword mode — always runs, instant, offline) ---------- */
  function scoreTriggers(inputNorm, triggers) {
    var score = 0, hits = [];
    for (var i = 0; i < triggers.length; i++) {
      var t = triggers[i];
      var tn = norm(t);
      var words = tn.trim().split(" ");
      if (inputNorm.indexOf(tn.trim()) !== -1 && tn.trim().length > 1) {
        // direct substring hit — specificity bonus for longer phrases
        score += 1 + Math.min(words.length - 1, 4) * 0.4;
        hits.push(t);
      } else if (words.length >= 2) {
        // partial: most words present as whole tokens
        var present = 0;
        for (var w = 0; w < words.length; w++) {
          if (words[w].length > 2 && inputNorm.indexOf(" " + words[w] + " ") !== -1) present++;
        }
        if (present >= Math.ceil(words.length * 0.7)) { score += 0.5; hits.push(t); }
      }
    }
    return { score: score, hits: hits };
  }

  function analyzeKeyword(text) {
    var inputNorm = norm(text);
    var objs = [], flags = [];
    OBJECTIONS.forEach(function (o) {
      var r = scoreTriggers(inputNorm, o.triggers);
      if (r.score > 0) objs.push({ item: o, score: r.score, hits: r.hits });
    });
    FLAGS.forEach(function (f) {
      var r = scoreTriggers(inputNorm, f.triggers);
      if (r.score > 0) flags.push({ item: f, score: r.score, hits: r.hits });
    });
    objs.sort(function (a, b) { return b.score - a.score; });
    flags.sort(function (a, b) { return b.score - a.score; });
    return { objections: objs.slice(0, 3), flags: flags.slice(0, 3) };
  }

  /* ---------- render: copilot cards ---------- */
  function pips(score, kind) {
    var n = Math.min(3, Math.max(1, Math.round(score)));
    var html = '<span class="scorepips">';
    for (var i = 0; i < 3; i++) html += '<span class="pip ' + (i < n ? "on-" + kind : "") + '"></span>';
    return html + "</span>";
  }

  function objectionCard(m) {
    var o = m.item, h = "";
    h += '<div class="card card-obj">';
    h += '<div class="card-head"><span class="card-kicker">▲ Objection detected</span>';
    h += '<span class="card-bucket">' + esc(o.bucket) + '</span></div>';
    h += '<div class="card-title">' + esc(o.label) + "</div>";
    h += '<div class="say-block"><div class="say-label">Say this</div>';
    o.response_steps.forEach(function (s, i) {
      h += '<div class="say-step"><span class="say-num">' + (i + 1) + "</span><span>" + esc(s) + "</span></div>";
    });
    h += "</div>";
    if (o.do_not) h += '<div class="donot"><strong>Don\'t:</strong> ' + esc(o.do_not) + "</div>";
    h += '<div class="card-meta">Bucket: ' + esc(o.bucket) +
         ' &nbsp;·&nbsp; matched: ' + esc(m.hits.slice(0, 4).join(", ")) + " " + pips(m.score, "obj") + "</div>";
    h += "</div>";
    return h;
  }

  function flagCard(m) {
    var f = m.item, h = "";
    h += '<div class="card card-flag">';
    h += '<div class="card-head"><span class="card-kicker">⚑ Discovery flag — probe this</span>';
    h += '<span class="card-bucket">' + esc(f.belief) + "</span></div>";
    h += '<div class="card-title">' + esc(f.signal) + "</div>";
    h += '<div class="say-block say-flag"><div class="say-label">Probe</div>';
    h += '<div class="say-step"><span class="say-num">→</span><span>' + esc(f.probe) + "</span></div>";
    if (f.note) h += '<div class="card-sub" style="padding-top:8px">' + esc(f.note) + "</div>";
    h += "</div>";
    h += '<div class="card-meta">Belief: ' + esc(f.belief) +
         ' &nbsp;·&nbsp; matched: ' + esc(m.hits.slice(0, 4).join(", ")) + " " + pips(m.score, "flag") + "</div>";
    h += "</div>";
    return h;
  }

  function noneCard() {
    var st = STAGES.filter(function (s) { return s.id === state.stage; })[0];
    var h = '<div class="card card-none">';
    h += '<div class="card-head"><span class="card-kicker">✓ No objection or flag</span></div>';
    h += '<div class="card-sub" style="padding-top:2px">Nothing to handle in that line — keep running <strong>' +
         esc(st.name) + '</strong>. ' + esc(st.goal) + "</div>";
    h += "</div>";
    return h;
  }

  function smartCardLoading() {
    return '<div class="card card-smart" id="smart-card">' +
      '<div class="card-head"><span class="card-kicker">✦ Claude is reading the call…</span></div>' +
      '<div class="card-sub" style="padding-bottom:12px">One moment.</div></div>';
  }
  function smartCard(textHtml, err) {
    var h = '<div class="card card-smart" id="smart-card">';
    h += '<div class="card-head"><span class="card-kicker">✦ ' +
         (err ? "Smart mode unavailable" : "Claude — best line right now") + "</span></div>";
    h += '<div class="say-block"><div class="say-step"><span class="say-num">✦</span><span>' +
         textHtml + "</span></div></div></div>";
    return h;
  }

  function renderCopilot(result, smartPlaceholder) {
    var c = $("copilot");
    var objHtml = result.objections.map(objectionCard).join("");
    var flagHtml = result.flags.map(flagCard).join("");
    var body = "";
    if (smartPlaceholder) body += smartCardLoading();
    // ordering: a confident objection (score >= 2) always leads; otherwise
    // discovery-style stages lead with flags, later stages lead with objections.
    var strongObj = result.objections.length && result.objections[0].score >= 2;
    var flagsFirst = !strongObj &&
      (state.stage === "discovery" || state.stage === "transition" || state.stage === "introduction");
    if (flagsFirst) { body += flagHtml + objHtml; }
    else { body += objHtml + flagHtml; }
    if (!objHtml && !flagHtml) body += noneCard();
    c.innerHTML = body;
    c.scrollTop = 0;
  }

  /* ---------- call log ---------- */
  function tagsFor(result) {
    var t = [];
    if (result.objections.length) t.push('<span class="log-tag tag-obj">▲ ' + result.objections.length + " objection" + (result.objections.length > 1 ? "s" : "") + "</span>");
    if (result.flags.length) t.push('<span class="log-tag tag-flag">⚑ ' + result.flags.length + " flag" + (result.flags.length > 1 ? "s" : "") + "</span>");
    if (!t.length) t.push('<span class="log-tag tag-none">✓ clear</span>');
    return t.join("");
  }
  function renderLog() {
    var el = $("log");
    if (!state.log.length) { el.innerHTML = '<p class="hint">Nothing logged yet.</p>'; return; }
    el.innerHTML = state.log.slice().reverse().map(function (e) {
      return '<div class="log-entry" data-id="' + e.id + '">' +
        '<div class="log-time">' + esc(e.time) + " · " + esc(e.stageName) + "</div>" +
        '<div class="log-text">' + esc(e.text) + "</div>" +
        '<div class="log-tags">' + tagsFor(e.result) + "</div></div>";
    }).join("");
    Array.prototype.forEach.call(el.querySelectorAll(".log-entry"), function (node) {
      node.addEventListener("click", function () {
        var id = +node.getAttribute("data-id");
        var entry = state.log.filter(function (x) { return x.id === id; })[0];
        if (entry) {
          renderCopilot(entry.result, false);
          Array.prototype.forEach.call(el.querySelectorAll(".log-entry"), function (n) { n.classList.remove("active"); });
          node.classList.add("active");
        }
      });
    });
  }

  /* ---------- analyze ---------- */
  function analyze() {
    var text = $("input").value.trim();
    if (!text) return;
    var result = analyzeKeyword(text);
    var stObj = STAGES.filter(function (s) { return s.id === state.stage; })[0];
    var entry = { id: Date.now(), time: nowTime(), stageName: stObj.name, text: text, result: result };
    state.log.push(entry);
    $("input").value = "";
    renderLog();
    var useSmart = state.smart && state.apiKey;
    renderCopilot(result, useSmart);
    if (useSmart) runSmart(text, result);
  }

  /* ---------- smart mode (Claude) ---------- */
  function buildSystemPrompt() {
    var objIndex = OBJECTIONS.map(function (o) {
      return "- " + o.label + " [" + o.bucket + "] id:" + o.id;
    }).join("\n");
    var flagIndex = FLAGS.map(function (f) { return "- " + f.signal; }).join("\n");
    return [
      "You are a live sales-call copilot for a Scale Systems sales rep. They sell an AI-powered organic-social-media revenue system.",
      "The rep pastes what the prospect just said. You tell them what to say back — fast, verbatim, ready to read aloud.",
      "",
      "METHODOLOGY (Cole Gordon): handle objections by diffuse -> isolate -> handle UNCERTAINTY before any logistic (money/support/timing) -> trade every concession for a decision. In discovery, when the prospect flags something, probe it.",
      "",
      "UNIVERSAL OBJECTION HANDLE: " + FRAMEWORK.step_1_diffuse + " | " + FRAMEWORK.step_2_isolate + " | " + FRAMEWORK.step_5_double_tie_down,
      "",
      "OBJECTION TYPES:\n" + objIndex,
      "",
      "DISCOVERY FLAGS:\n" + flagIndex,
      "",
      "RESPOND IN UNDER 110 WORDS. Format:",
      "READ: <the exact words the rep should say next, in quotes>",
      "WHY: <one short line — what's happening / which objection or flag / what stage>",
      "Never invent guarantees or specific results. If it's an objection, give the diffuse + isolate line first."
    ].join("\n");
  }

  function runSmart(text, kwResult) {
    var ctx = "Current funnel stage: " + state.stage + ".\n";
    var recent = state.log.slice(-4, -1).map(function (e) { return "- prospect: " + e.text; }).join("\n");
    if (recent) ctx += "Recent call log:\n" + recent + "\n";
    if (kwResult.objections.length) ctx += "Keyword engine flagged objection(s): " + kwResult.objections.map(function (m) { return m.item.label; }).join("; ") + "\n";
    if (kwResult.flags.length) ctx += "Keyword engine flagged discovery signal(s): " + kwResult.flags.map(function (m) { return m.item.signal; }).join("; ") + "\n";

    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": state.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: buildSystemPrompt(),
        messages: [{ role: "user", content: ctx + '\nThe prospect just said: "' + text + '"' }]
      })
    })
      .then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error("HTTP " + r.status + " — " + t.slice(0, 160)); });
        return r.json();
      })
      .then(function (j) {
        var out = (j.content && j.content[0] && j.content[0].text) ? j.content[0].text : "(no response)";
        var card = $("smart-card");
        if (card) card.outerHTML = smartCard(esc(out).replace(/\n/g, "<br>"), false);
      })
      .catch(function (e) {
        var card = $("smart-card");
        if (card) card.outerHTML = smartCard("Keyword mode is still running below. (" + esc(e.message) + ")", true);
      });
  }

  /* ---------- funnel stage strip + reference ---------- */
  function renderStageStrip() {
    var strip = $("stage-strip");
    strip.innerHTML = STAGES.map(function (s) {
      return '<button class="stage-pill' + (s.id === state.stage ? " active" : "") +
        '" data-id="' + s.id + '">' + esc(s.name) + "</button>";
    }).join("");
    Array.prototype.forEach.call(strip.querySelectorAll(".stage-pill"), function (node) {
      node.addEventListener("click", function () { setStage(node.getAttribute("data-id")); });
    });
  }
  function renderStageRef() {
    var s = STAGES.filter(function (x) { return x.id === state.stage; })[0];
    var h = "<h3>" + esc(s.name) + " — what to do</h3>";
    h += '<div class="sr-goal">' + esc(s.goal) + "</div>";
    if (s.listen_for) h += '<div class="sr-listen">👂 Listen for: ' + esc(s.listen_for) + "</div>";
    h += '<div class="sr-say-label">Say</div><ul>';
    s.say.forEach(function (line) { h += "<li>" + esc(line) + "</li>"; });
    h += "</ul>";
    if (s.advance_when) h += '<div class="sr-listen" style="margin-top:8px;color:var(--amber)">▸ Advance when: ' + esc(s.advance_when) + "</div>";
    $("stage-ref").innerHTML = h;
  }
  function setStage(id) {
    state.stage = id;
    renderStageStrip();
    renderStageRef();
  }

  /* ---------- settings ---------- */
  function openSettings() {
    $("api-key").value = state.apiKey;
    $("smart-toggle").checked = state.smart;
    $("settings-modal").classList.remove("hidden");
  }
  function closeSettings() { $("settings-modal").classList.add("hidden"); }
  function saveSettings() {
    state.apiKey = $("api-key").value.trim();
    state.smart = $("smart-toggle").checked;
    localStorage.setItem("copilot_api_key", state.apiKey);
    localStorage.setItem("copilot_smart", state.smart ? "1" : "0");
    updateModeBadge();
    closeSettings();
  }
  function updateModeBadge() {
    var b = $("mode-badge");
    if (state.smart && state.apiKey) {
      b.textContent = "Smart mode"; b.className = "mode-badge mode-smart";
    } else {
      b.textContent = "Keyword mode"; b.className = "mode-badge mode-offline";
    }
  }

  /* ---------- export + new call ---------- */
  function exportLog() {
    if (!state.log.length) { alert("Nothing to export yet."); return; }
    var lines = ["CALL COPILOT — CALL LOG", new Date().toLocaleString(), ""];
    state.log.forEach(function (e) {
      lines.push("[" + e.time + " · " + e.stageName + "]");
      lines.push("Prospect: " + e.text);
      e.result.objections.forEach(function (m) { lines.push("  ▲ Objection: " + m.item.label); });
      e.result.flags.forEach(function (m) { lines.push("  ⚑ Flag: " + m.item.signal); });
      lines.push("");
    });
    var blob = new Blob([lines.join("\n")], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "call-log-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".txt";
    a.click();
  }
  function newCall() {
    if (state.log.length && !confirm("Start a fresh call? This clears the current log.")) return;
    state.log = [];
    renderLog();
    $("copilot").innerHTML =
      '<div class="empty-state"><p class="empty-big">Ready.</p>' +
      "<p>Type what the prospect just said on the left. The copilot will tell you " +
      "what to say back, flag what to probe, and keep you on the funnel.</p></div>";
    setStage("introduction");
  }

  /* ---------- init ---------- */
  function init() {
    renderStageStrip();
    renderStageRef();
    renderLog();
    updateModeBadge();

    $("btn-analyze").addEventListener("click", analyze);
    $("input").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyze(); }
    });
    $("btn-export").addEventListener("click", exportLog);
    $("btn-newcall").addEventListener("click", newCall);
    $("btn-settings").addEventListener("click", openSettings);
    $("btn-save-settings").addEventListener("click", saveSettings);
    $("btn-close-settings").addEventListener("click", closeSettings);
    $("settings-modal").addEventListener("click", function (e) {
      if (e.target === $("settings-modal")) closeSettings();
    });
    $("input").focus();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
