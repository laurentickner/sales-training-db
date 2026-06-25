// v=88 — extracted from inline <script> because CSP "script-src 'self'" in
// _headers was silently blocking the inline IIFE. Loaded by onboarding.html.
// 2-tab onboarding with quiz gates. Persist pass state per quiz in
// localStorage so the rep doesn't have to redo it on refresh.
(function () {
  var KEY_PREFIX = "copilot_onb_quiz_";

  function setupQuiz(quizId, onAllPassed) {
    var quizEl = document.getElementById(quizId);
    if (!quizEl) return;
    var questions = quizEl.querySelectorAll(".qz-q");
    function checkAllPassed() {
      var allPassed = true;
      questions.forEach(function (q) {
        if (q.getAttribute("data-passed") !== "true") allPassed = false;
      });
      if (allPassed) {
        try { localStorage.setItem(KEY_PREFIX + quizId, "passed"); } catch (e) {}
        onAllPassed();
      }
    }
    function wireBlock(q, blockEl, correct, isTwin) {
      blockEl.querySelectorAll(".qz-opt").forEach(function (opt) {
        opt.addEventListener("click", function () {
          if (blockEl.getAttribute("data-locked") === "true") return;
          blockEl.querySelectorAll(".qz-opt").forEach(function (o) {
            o.classList.remove("qz-right", "qz-wrong");
          });
          var picked = opt.getAttribute("data-val");
          var correctEl = blockEl.querySelector('.qz-opt[data-val="' + correct + '"]');
          if (picked === correct) {
            opt.classList.add("qz-right");
            blockEl.querySelector(".qz-reveal").classList.add("qz-show");
            blockEl.setAttribute("data-locked", "true");
            q.setAttribute("data-passed", "true");
            q.classList.add("qz-passed");
            checkAllPassed();
          } else {
            opt.classList.add("qz-wrong");
            if (correctEl) correctEl.classList.add("qz-right");
            blockEl.querySelector(".qz-reveal").classList.add("qz-show");
            blockEl.setAttribute("data-locked", "true");
            q.removeAttribute("data-passed");
            q.classList.remove("qz-passed");
            if (!isTwin) {
              var twin = q.querySelector(".qz-twin");
              if (twin) {
                twin.hidden = false;
                twin.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }
          }
        });
      });
    }
    questions.forEach(function (q) {
      var primary = q.querySelector(".qz-primary");
      var twin = q.querySelector(".qz-twin");
      var primaryCorrect = q.getAttribute("data-correct");
      var twinCorrect = q.getAttribute("data-twin-correct") || primaryCorrect;
      if (primary) wireBlock(q, primary, primaryCorrect, false);
      if (twin) wireBlock(q, twin, twinCorrect, true);
    });
  }

  function unlockTab2() {
    var tab2 = document.querySelector('.tab[data-tab="tool"]');
    var gateSales = document.getElementById("gate-sales");
    var gateSalesBtn = document.getElementById("gate-sales-btn");
    var gateSalesStatus = document.getElementById("gate-sales-status");
    if (tab2) {
      tab2.classList.remove("tab-locked");
      var lock = tab2.querySelector(".tab-lock");
      if (lock) lock.textContent = "✓";
    }
    if (gateSales) gateSales.classList.add("gate-passed");
    if (gateSalesBtn) {
      gateSalesBtn.classList.add("gate-unlocked", "gate-passed");
      gateSalesBtn.removeAttribute("disabled");
      gateSalesBtn.textContent = "✓ Unlocked, open Tab 2";
    }
    if (gateSalesStatus) gateSalesStatus.textContent = "All 5 correct. Tab 2 is open, click above or hit the button.";
  }

  function unlockTool() {
    var gateTool = document.getElementById("gate-tool");
    var gateToolBtn = document.getElementById("gate-tool-btn");
    var gateToolStatus = document.getElementById("gate-tool-status");
    if (gateTool) gateTool.classList.add("gate-passed");
    if (gateToolBtn) {
      gateToolBtn.classList.add("gate-unlocked", "gate-passed");
      gateToolBtn.removeAttribute("disabled");
    }
    if (gateToolStatus) gateToolStatus.textContent = "All 5 correct. The tool is unlocked.";
  }

  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      if (tab.classList.contains("tab-locked")) return;
      document.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("tab-active"); });
      document.querySelectorAll(".tab-content").forEach(function (c) { c.classList.remove("tab-visible"); });
      tab.classList.add("tab-active");
      var targetId = "tab-" + tab.getAttribute("data-tab");
      var targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.classList.add("tab-visible");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  var gateSalesBtn = document.getElementById("gate-sales-btn");
  if (gateSalesBtn) gateSalesBtn.addEventListener("click", function () {
    if (gateSalesBtn.classList.contains("gate-unlocked")) {
      document.querySelector('.tab[data-tab="tool"]').click();
    }
  });

  setupQuiz("quiz-sales", unlockTab2);
  setupQuiz("quiz-tool", unlockTool);
  setupQuiz("roleplay", function () { /* no-op, roleplay is practice not a gate */ });

  var toolBtn = document.getElementById("gate-tool-btn");
  if (toolBtn) toolBtn.addEventListener("click", function (e) {
    if (!toolBtn.classList.contains("gate-unlocked")) {
      e.preventDefault();
    }
  });

  try {
    if (localStorage.getItem(KEY_PREFIX + "quiz-sales") === "passed") unlockTab2();
    if (localStorage.getItem(KEY_PREFIX + "quiz-tool") === "passed") unlockTool();
  } catch (e) {}
})();
