/* coach.js — phone-view WebSocket client.
 *
 * Subscribes to /coach/:callId/ws, renders guidance cards as they arrive.
 * On disconnect: exponential backoff with jitter, falls back to /state poll
 * after 3 failed reconnects so guidance keeps flowing on a flaky cellular
 * link. The page never captures audio — Recall + Deepgram do that.
 *
 * Methodology lookups (DISCOVER letters, stage names) are inlined here so the
 * page renders even if the methodology JSON ever fails to load on the server.
 */

(function () {
  "use strict";

  var CALL_ID = window.__CALL_ID__;
  if (!CALL_ID || CALL_ID === "__CALL_" + "ID__") {
    document.querySelector("main").innerHTML =
      '<div class="card card-none">No call id — open the link Lauren generated when she started the call.</div>';
    return;
  }

  // ── DISCOVER + funnel labels (mirrors engine/keyword.ts) ───────────────
  var STAGES = [
    { id: "introduction", name: "1. Intro" },
    { id: "discovery", name: "2. Discovery" },
    { id: "transition", name: "3. Transition" },
    { id: "pitch", name: "4. Pitch" },
    { id: "committing", name: "5. Committing" },
    { id: "objections", name: "6. Objections" },
    { id: "close-confirmation", name: "7. Close" },
  ];
  var DISCOVER_ORDER = ["desire", "pain", "math", "cost", "doubt", "trust", "support", "money", "why"];
  var DISCOVER_LETTER = { desire: "D", pain: "I", math: "S", cost: "C", doubt: "O", trust: "V", support: "E", money: "R", why: "Y" };
  var BELIEF_LABEL = { desire: "Desire", pain: "Issue", math: "Sum", cost: "Cost", doubt: "Own", trust: "Verify", support: "Everyone", money: "Resources", why: "Why" };

  // ── shorthand ──────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toast(text) {
    var t = $("toast");
    t.textContent = text;
    t.classList.add("shown");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("shown"); }, 2400);
  }

  // ── state ──────────────────────────────────────────────────────────────
  var state = {
    ws: null,
    backoff: 1000,
    backoffMax: 15000,
    reconnects: 0,
    pollTimer: null,
    stage: "introduction",
    beliefsCovered: {},
    prospectName: "",
    smartByObjId: {},
  };

  // ── rendering ──────────────────────────────────────────────────────────
  function renderStageStrip() {
    var strip = $("stage-strip");
    strip.innerHTML = STAGES.map(function (s) {
      var active = s.id === state.stage;
      return '<button class="stage-pill' + (active ? " active" : "") + '" data-id="' + esc(s.id) + '">' + esc(s.name) + "</button>";
    }).join("");
  }
  function renderBeliefs() {
    var strip = $("belief-strip");
    if (state.stage !== "discovery") {
      strip.hidden = true; strip.innerHTML = "";
      return;
    }
    strip.hidden = false;
    var done = 0;
    var chips = DISCOVER_ORDER.map(function (b) {
      var on = !!state.beliefsCovered[b];
      if (on) done++;
      return '<button class="belief-chip' + (on ? " on" : "") + '" data-belief="' + b + '">' +
        '<span class="letter">' + DISCOVER_LETTER[b] + "</span> " + esc(BELIEF_LABEL[b]) +
        "</button>";
    }).join("");
    strip.innerHTML = '<p class="belief-label">DISCOVERY — ' + done + "/9</p>" + chips;
  }

  function cardObjection(m) {
    var o = m.item;
    var h = '<div class="card card-obj">';
    h += '<div class="kicker">▲ Objection — handle now</div>';
    h += '<h3 class="title">' + esc(o.label) + '</h3>';
    h += '<div class="handle-strip">↳ Run the handle: <b>diffuse → isolate → temp-check → scale → double tie-down</b>.</div>';
    h += '<div class="say-label">Say this</div>';
    (o.response_steps || []).forEach(function (s, i) {
      h += '<div class="say-step"><span class="say-num">' + (i + 1) + "</span><span>" + esc(s) + "</span></div>";
    });
    if (o.do_not) h += '<div class="donot"><strong>Don\'t:</strong> ' + esc(o.do_not) + "</div>";
    h += '<div class="meta">Bucket: ' + esc(o.bucket) + " · matched: " + esc((m.hits || []).slice(0, 3).join(", ")) + "</div>";
    h += "</div>";
    return h;
  }
  function cardFlag(m) {
    var f = m.item;
    var h = '<div class="card card-flag">';
    h += '<div class="kicker">⚑ Discovery flag — probe</div>';
    h += '<h3 class="title">' + esc(f.signal) + '</h3>';
    h += '<div class="say-label">Probe</div>';
    h += '<div class="say-step"><span class="say-num">→</span><span>' + esc(f.probe) + "</span></div>";
    if (f.note) h += '<div class="meta" style="margin-top:8px;font-style:italic">' + esc(f.note) + "</div>";
    h += '<div class="meta">Belief: ' + esc(f.belief) + " · matched: " + esc((m.hits || []).slice(0, 3).join(", ")) + "</div>";
    h += "</div>";
    return h;
  }
  function cardRetie(activeObj) {
    return '<div class="card card-retie">' +
      '<div class="kicker">↻ Re-tie-down &amp; close</div>' +
      '<div class="say-step"><span class="say-num">→</span><span>' +
      esc("So that aside — is there anything ELSE keeping you from being 100% in? ... Then let's get you started.") +
      "</span></div></div>";
  }
  function cardSmart(text, err) {
    return '<div class="card card-smart">' +
      '<div class="kicker">✦ ' + (err ? "Smart mode unavailable" : "Claude — adapted from the playbook") + "</div>" +
      '<div class="smart-body">' + esc(text) + "</div></div>";
  }
  function cardLastUtterance(u) {
    if (!u) return "";
    return '<div class="last-utt">prospect: "' + esc(u.text).slice(0, 220) + '"</div>';
  }

  function renderGuidance(msg) {
    var main = $("copilot");
    var html = cardLastUtterance(msg.utterance);
    if (msg.result.objections.length) {
      msg.result.objections.forEach(function (m) { html += cardObjection(m); });
    }
    if (msg.result.flags.length) {
      msg.result.flags.forEach(function (m) { html += cardFlag(m); });
    }
    if (msg.showRetie) html += cardRetie(msg.activeObjection);
    if (!msg.result.objections.length && !msg.result.flags.length) {
      html += '<div class="card card-none">No new objection or flag in that line — keep running ' +
        esc(stageName(msg.stage)) + '.</div>';
    }
    main.innerHTML = html;
    window.scrollTo(0, 0);

    // Update belief tracker if anything ticked.
    state.stage = msg.stage;
    state.beliefsCovered = msg.beliefsCovered || state.beliefsCovered;
    renderStageStrip();
    renderBeliefs();
  }

  function stageName(id) {
    var s = STAGES.filter(function (s) { return s.id === id; })[0];
    return s ? s.name : id;
  }

  function appendSmart(payload) {
    if (!payload.ok && !payload.text) return; // surface even errors so Lauren knows smart died
    var main = $("copilot");
    var existing = main.querySelector(".card-smart");
    var html = cardSmart(payload.ok ? payload.text : payload.error || "Smart mode failed.", !payload.ok);
    if (existing) existing.outerHTML = html;
    else main.insertAdjacentHTML("afterbegin", html);
  }

  // ── connection ─────────────────────────────────────────────────────────
  function setConn(label, kind) {
    var b = $("conn-badge");
    b.textContent = label;
    b.className = "conn" + (kind ? " " + kind : "");
  }

  function connect() {
    var scheme = location.protocol === "https:" ? "wss:" : "ws:";
    var url = scheme + "//" + location.host + "/coach/" + encodeURIComponent(CALL_ID) + "/ws";
    setConn("connecting…");
    try {
      state.ws = new WebSocket(url);
    } catch (e) {
      console.error("ws open threw", e);
      scheduleReconnect();
      return;
    }
    state.ws.addEventListener("open", function () {
      setConn("live", "live");
      state.backoff = 1000;
      state.reconnects = 0;
      stopPolling();
    });
    state.ws.addEventListener("message", function (ev) {
      try {
        var msg = JSON.parse(ev.data);
        handleMessage(msg);
      } catch (e) {
        console.error("bad ws message", ev.data, e);
      }
    });
    state.ws.addEventListener("close", function (ev) {
      setConn("reconnecting…", "lost");
      if (ev.code !== 1000) scheduleReconnect();
    });
    state.ws.addEventListener("error", function (ev) {
      console.error("ws error", ev);
    });
  }

  function scheduleReconnect() {
    state.reconnects++;
    if (state.reconnects >= 3 && !state.pollTimer) startPolling();
    var delay = Math.min(state.backoff, state.backoffMax) + Math.floor(Math.random() * 500);
    state.backoff = Math.min(state.backoff * 2, state.backoffMax);
    setTimeout(connect, delay);
  }

  function startPolling() {
    setConn("polling (fallback)", "lost");
    var prev = -1;
    state.pollTimer = setInterval(function () {
      fetch("/coach/" + encodeURIComponent(CALL_ID) + "/state")
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (!j) return;
          state.stage = j.stage;
          state.beliefsCovered = j.beliefsCovered || {};
          renderStageStrip();
          renderBeliefs();
          if (j.recentGuidance && j.recentGuidance.length) {
            var last = j.recentGuidance[j.recentGuidance.length - 1];
            if (last && last.utterance && last.utterance.timestamp !== prev) {
              prev = last.utterance.timestamp;
              renderGuidance(last);
            }
          }
        })
        .catch(function (e) { console.error("poll failed", e); });
    }, 3000);
  }
  function stopPolling() {
    if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
  }

  function handleMessage(msg) {
    if (msg.type === "hello") {
      state.prospectName = msg.prospect && msg.prospect.name || "";
      $("prospect-name").textContent = state.prospectName || "live call";
      state.stage = msg.stage;
      state.beliefsCovered = msg.beliefsCovered || {};
      renderStageStrip();
      renderBeliefs();
      // Replay last guidance if any.
      if (msg.recentGuidance && msg.recentGuidance.length) {
        renderGuidance(msg.recentGuidance[msg.recentGuidance.length - 1]);
      }
    } else if (msg.type === "guidance") {
      renderGuidance(msg);
    } else if (msg.type === "smart") {
      appendSmart(msg);
    } else if (msg.type === "stage") {
      state.stage = msg.stage;
      state.beliefsCovered = msg.beliefsCovered || state.beliefsCovered;
      renderStageStrip();
      renderBeliefs();
    } else if (msg.type === "end") {
      showReview(msg.review, msg.ghl);
    }
  }

  function sendWS(obj) {
    if (state.ws && state.ws.readyState === 1) {
      state.ws.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  // ── UI handlers ────────────────────────────────────────────────────────
  function bind() {
    $("stage-strip").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".stage-pill");
      if (!b) return;
      var id = b.getAttribute("data-id");
      if (!sendWS({ type: "set-stage", stage: id })) {
        fetch("/coach/" + encodeURIComponent(CALL_ID) + "/stage", {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ stage: id }),
        });
      }
    });
    $("belief-strip").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".belief-chip");
      if (!b) return;
      var belief = b.getAttribute("data-belief");
      if (!sendWS({ type: "mark-belief", belief: belief })) {
        fetch("/coach/" + encodeURIComponent(CALL_ID) + "/belief", {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ belief: belief }),
        });
      }
    });
    $("btn-prev-stage").addEventListener("click", function () {
      var i = STAGES.findIndex(function (s) { return s.id === state.stage; });
      if (i > 0) sendStage(STAGES[i - 1].id);
    });
    $("btn-next-stage").addEventListener("click", function () {
      var i = STAGES.findIndex(function (s) { return s.id === state.stage; });
      if (i < STAGES.length - 1) sendStage(STAGES[i + 1].id);
    });
    $("btn-livefacts").addEventListener("click", function () {
      var t = prompt("Live note (visible to smart mode for the rest of the call):", "");
      if (t == null) return;
      sendWS({ type: "live-facts", text: t });
      toast("note saved");
    });
    $("btn-end").addEventListener("click", function () { $("end-modal").classList.add("open"); });
    $("btn-cancel-end").addEventListener("click", function () { $("end-modal").classList.remove("open"); });
    $("btn-confirm-end").addEventListener("click", runEnd);
  }

  function sendStage(id) {
    if (!sendWS({ type: "set-stage", stage: id })) {
      fetch("/coach/" + encodeURIComponent(CALL_ID) + "/stage", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ stage: id }),
      });
    }
  }

  function runEnd() {
    var btn = $("btn-confirm-end");
    btn.disabled = true; btn.textContent = "Writing review…";
    var out = $("review-out");
    out.classList.add("shown");
    out.textContent = "Reading the call against the methodology — can take 30-60s for a full call…";
    fetch("/end-call", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        callId: CALL_ID,
        outcome: $("end-outcome").value,
        outcomeNotes: $("end-notes").value,
      }),
    })
      .then(function (r) { return r.json().catch(function () { return { ok: false, reviewError: "non-JSON response" }; }); })
      .then(function (j) {
        if (j.ok) {
          out.textContent = j.review;
          var ghl = j.ghl;
          if (ghl && ghl.ok) toast("✓ Pushed to GoHighLevel (" + ghl.contactId + ")");
          else if (ghl) toast("⚠ GHL push failed: " + (ghl.reason || "unknown"));
          else toast("Saved locally — no GHL configured");
        } else {
          out.textContent = "Review failed: " + (j.reviewError || "unknown");
          toast("⚠ Review failed");
        }
      })
      .catch(function (e) {
        out.textContent = "End-call request failed: " + e.message;
        toast("⚠ End failed: " + e.message);
      })
      .then(function () {
        btn.disabled = false; btn.textContent = "Generate review & push to GHL";
      });
  }

  function showReview(md, ghl) {
    var out = $("review-out");
    $("end-modal").classList.add("open");
    out.classList.add("shown");
    out.textContent = md;
    if (ghl && ghl.ok) toast("✓ Review pushed to GHL");
  }

  // ── boot ───────────────────────────────────────────────────────────────
  renderStageStrip();
  bind();
  connect();
})();
