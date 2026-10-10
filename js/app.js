/* ============================================================
 * AI Humanizer — UI wiring
 * ============================================================ */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const input = $("#input");
  const output = $("#output");
  const inputStats = $("#input-stats");
  const outputStats = $("#output-stats");
  const scorebar = $("#scorebar");
  const toast = $("#toast");

  const state = {
    intensity: "standard",
    seed: 1,
  };

  /* ---------- sample text (deliberately robotic) ---------- */
  const SAMPLE =
    "In today's fast-paced digital landscape, artificial intelligence has emerged as a game-changer. " +
    "It is important to note that organizations must leverage cutting-edge AI solutions in order to unlock the full potential of their workforce. " +
    "Furthermore, the implementation of robust, seamless systems facilitates a myriad of opportunities; moreover, it fosters innovation and enhances productivity across a wide range of industries. " +
    "Utilizing state-of-the-art methodologies is crucial — indeed, it serves as a testament to the transformative power of technology. " +
    "Additionally, individuals who delve into these comprehensive frameworks will undoubtedly obtain numerous benefits. " +
    "Consequently, we must embark on a journey of continuous learning, ensuring that we harness these pivotal tools effectively. " +
    "In conclusion, the future is undeniably bright for those who embrace this paradigm shift, and it is worth noting that the possibilities are virtually limitless.";

  /* ---------- helpers ---------- */
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function fmtStats(analysis) {
    return (
      analysis.wordCount.toLocaleString() +
      " words · " +
      analysis.charCount.toLocaleString() +
      " characters · " +
      analysis.sentenceCount +
      " sentences"
    );
  }

  function renderScore(el, analysis) {
    el.querySelector("[data-num]").textContent = analysis.score;
    const v = el.querySelector("[data-verdict]");
    v.textContent = analysis.verdict.label;
    v.className = "score-verdict " + analysis.verdict.tone;
  }

  function updateInputStats() {
    inputStats.textContent = fmtStats(Humanizer.analyze(input.value));
  }

  function newSeed() {
    state.seed = (Math.random() * 0xffffffff) >>> 0;
  }

  function readOptions() {
    return {
      intensity: state.intensity,
      seed: state.seed,
      contractions: $("#opt-contractions").checked,
      emDashes: $("#opt-emdashes").checked,
      splitSentences: $("#opt-split").checked,
      openers: $("#opt-openers").checked,
    };
  }

  /* ---------- main action ---------- */
  function humanize() {
    const text = input.value.trim();
    if (!text) {
      showToast("Paste some AI text first ✍️");
      input.focus();
      return;
    }
    const before = Humanizer.analyze(text);
    const result = Humanizer.humanize(text, readOptions());
    output.value = result;

    const after = Humanizer.analyze(result);
    outputStats.textContent = fmtStats(after);

    renderScore($("#score-before"), before);
    renderScore($("#score-after"), after);
    scorebar.hidden = false;

    const delta = after.score - before.score;
    showToast(
      delta >= 0
        ? "Humanized ✓  score +" + delta
        : "Humanized ✓  (score change " + delta + ")"
    );
  }

  /* ---------- events ---------- */
  $("#btn-humanize").addEventListener("click", humanize);

  $("#btn-regenerate").addEventListener("click", () => {
    if (!input.value.trim()) {
      showToast("Nothing to regenerate yet");
      return;
    }
    newSeed();
    humanize();
  });

  $("#btn-sample").addEventListener("click", () => {
    input.value = SAMPLE;
    updateInputStats();
    newSeed();
    humanize();
  });

  $("#btn-clear").addEventListener("click", () => {
    input.value = "";
    output.value = "";
    updateInputStats();
    outputStats.textContent = "0 words · 0 characters";
    scorebar.hidden = true;
    input.focus();
  });

  $("#btn-copy").addEventListener("click", async () => {
    if (!output.value) {
      showToast("Nothing to copy yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(output.value);
      showToast("Copied to clipboard ✓");
    } catch {
      output.select();
      document.execCommand("copy");
      showToast("Copied to clipboard ✓");
    }
  });

  $("#btn-download").addEventListener("click", () => {
    if (!output.value) {
      showToast("Nothing to download yet");
      return;
    }
    const blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "humanized-text.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Downloaded humanized-text.txt ✓");
  });

  // intensity segmented control
  document.querySelectorAll(".segmented button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".segmented button").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-checked", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-checked", "true");
      state.intensity = btn.dataset.intensity;
      if (input.value.trim() && output.value) humanize(); // live re-run
    });
  });

  // option toggles re-run live
  ["opt-contractions", "opt-emdashes", "opt-split", "opt-openers"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => {
      if (input.value.trim() && output.value) humanize();
    });
  });

  input.addEventListener("input", updateInputStats);

  // Ctrl/Cmd + Enter runs the humanizer
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      humanize();
    }
  });

  newSeed();
  updateInputStats();
})();
