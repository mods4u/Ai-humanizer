/* ============================================================
 * Humanizer engine — turns stiff, AI-sounding text into natural,
 * human-sounding prose. 100% client-side, no data leaves the browser.
 * ============================================================ */
(function (global) {
  "use strict";

  /* ---------- tiny seeded RNG (mulberry32) ---------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  /* ---------- helpers ---------- */
  function matchCase(source, replacement) {
    if (!source || !replacement) return replacement;
    const first = source.charAt(0);
    if (first === first.toUpperCase() && first !== first.toLowerCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement;
  }

  function isSentenceStart(str, offset) {
    let i = offset - 1;
    let sawNewline = false;
    while (i >= 0 && /\s/.test(str[i])) {
      if (str[i] === "\n") sawNewline = true;
      i--;
    }
    if (i < 0) return true;
    if (sawNewline) return true; // new paragraph counts as a sentence start
    return /[.!?]/.test(str[i]);
  }

  /* rule factory */
  function rule(pattern, replacements, opts) {
    return Object.assign(
      { pattern, replacements, probability: 1, kind: "word" },
      opts || {}
    );
  }

  /* ============================================================
   * RULES
   * kind: "phrase" — strong AI tells, applied even at Light intensity
   * kind: "word"   — stylistic swaps, scaled down at Light intensity
   * contraction: true — skipped when the user disables contractions,
   *                   and excluded from AI-tell scoring
   * contextual: { start: [...], mid: [...] } — different replacements
   *                   at the start of a sentence vs. mid-sentence
   * ============================================================ */
  const RULES = [
    /* ---------- long AI clichés (phrases) ---------- */
    rule(/\bin today'?s fast[- ]paced (?:digital )?(?:world|landscape|era),?\s*/gi, ["These days, ", "Today, ", "Nowadays, "], { kind: "phrase" }),
    rule(/\bin today'?s digital age,?\s*/gi, ["These days, ", "Online, ", "Today, "], { kind: "phrase" }),
    rule(/\bin the ever[- ]evolving landscape of\b/gi, ["in ", "in the changing world of "], { kind: "phrase" }),
    rule(/\bin the rapidly evolving landscape of\b/gi, ["in ", "in the fast-moving world of "], { kind: "phrase" }),
    rule(/\bin the realm of\b/gi, ["in ", "in the world of "], { kind: "phrase" }),
    rule(/\bin order to\b/gi, ["to"], { kind: "phrase" }),
    rule(/\bdue to the fact that\b/gi, ["because ", "since "], { kind: "phrase" }),
    rule(/\bit(?:'s| is) worth noting that\s*/gi, null, {
      kind: "phrase",
      contextual: { start: ["Note that ", "Worth knowing: "], mid: [""] },
    }),
    rule(/\bit(?:'s| is) important to note that\s*/gi, null, {
      kind: "phrase",
      contextual: { start: ["Note that ", "Worth knowing: "], mid: [""] },
    }),
    rule(/\bit should be noted that\s*/gi, null, {
      kind: "phrase",
      contextual: { start: ["Note: ", "Worth knowing: "], mid: [""] },
    }),
    rule(/\bit is worth mentioning that\s*/gi, null, {
      kind: "phrase",
      contextual: { start: [""], mid: [""] },
    }),
    rule(/\bit goes without saying that\s*/gi, [""], { kind: "phrase", probability: 0.9 }),
    rule(/\bneedless to say,?\s*/gi, [""], { kind: "phrase", probability: 0.85 }),
    rule(/\bas we all know,?\s*/gi, [""], { kind: "phrase", probability: 0.85 }),
    rule(/\bwith regard to\b/gi, ["about", "on"], { kind: "phrase" }),
    rule(/\bwith respect to\b/gi, ["about", "when it comes to"], { kind: "phrase" }),
    rule(/\bin light of\b/gi, ["given", "because of"], { kind: "phrase" }),
    rule(/\bfirst and foremost,?\s*/gi, ["First, ", "To start, "], { kind: "phrase" }),
    rule(/\blast but not least,?\s*/gi, ["Finally, ", "And finally, "], { kind: "phrase" }),
    rule(/\bat the end of the day,?\s*/gi, ["In the end, ", "When it comes down to it, "], { kind: "phrase" }),
    rule(/\ba wide range of\b/gi, ["all kinds of", "lots of"], { kind: "phrase" }),
    rule(/\ba plethora of\b/gi, ["plenty of", "tons of"], { kind: "phrase" }),
    rule(/\ba wealth of\b/gi, ["plenty of", "lots of"], { kind: "phrase" }),
    rule(/\ba myriad of\b/gi, ["lots of", "many"], { kind: "phrase" }),
    rule(/\bmyriad\b/gi, ["many", "countless"], { kind: "phrase" }),
    rule(/\bplethora\b/gi, ["plenty", "a bunch"], { kind: "phrase" }),
    rule(/\bplays (?:a |an )?(?:crucial|vital|pivotal|key|significant|important) role in\b/gi, ["is a big part of", "really matters for"], { kind: "phrase" }),
    rule(/\bplay (?:a |an )?(?:crucial|vital|pivotal|key|significant|important) role in\b/gi, ["are a big part of", "really matter for"], { kind: "phrase" }),
    rule(/\ba testament to\b/gi, ["proof of", "a sign of"], { kind: "phrase" }),
    rule(/\ba cornerstone of\b/gi, ["a key part of", "the foundation of"], { kind: "phrase" }),
    rule(/\bnavigate the complexities of\b/gi, ["work through", "deal with"], { kind: "phrase" }),
    rule(/\bnavigates the complexities of\b/gi, ["works through", "deals with"], { kind: "phrase" }),
    rule(/\bnavigating the complexities of\b/gi, ["working through", "dealing with"], { kind: "phrase" }),
    rule(/\bnavigat(?:e|es|ing) the challenges of\b/gi, ["handle", "handles", "handling"], { kind: "phrase" }),
    rule(/\bunlocks the (?:full )?potential of\b/gi, ["gets the most out of"], { kind: "phrase" }),
    rule(/\bunlock(?:ed)? the (?:full )?potential of\b/gi, ["get the most out of"], { kind: "phrase" }),
    rule(/\bembark on a journey of\b/gi, ["commit to"], { kind: "phrase" }),
    rule(/\bembarks on a journey of\b/gi, ["commits to"], { kind: "phrase" }),
    rule(/\bembark on a journey\b/gi, ["get started", "set off"], { kind: "phrase" }),
    rule(/\bembarks on\b/gi, ["starts"], { kind: "phrase" }),
    rule(/\bembarked on\b/gi, ["started"], { kind: "phrase" }),
    rule(/\bembark on\b/gi, ["start"], { kind: "phrase" }),
    rule(/\bstate[- ]of[- ]the[- ]art\b/gi, ["top-of-the-line", "the latest"], { kind: "phrase" }),
    rule(/\bcutting[- ]edge\b/gi, ["modern", "the latest"], { kind: "phrase" }),
    rule(/\bgame[- ]chang(?:er|ing)\b/gi, ["big deal", "major"], { kind: "phrase" }),
    rule(/\bparadigm shift\b/gi, ["big change", "major shift"], { kind: "phrase" }),
    rule(/\bbest[- ]in[- ]class\b/gi, ["top", "best"], { kind: "phrase" }),
    rule(/\buser[- ]friendly\b/gi, ["easy to use", "simple"], { kind: "phrase" }),
    rule(/\bseamless integration\b/gi, ["easy setup", "smooth setup"], { kind: "phrase" }),
    rule(/\bserves? as a\b/gi, ["works as a", "is a"], { kind: "phrase" }),
    rule(/\bever[- ]evolving\b/gi, ["always-changing", "fast-moving"], { kind: "phrase" }),
    rule(/\brapidly evolving\b/gi, ["fast-moving", "quickly changing"], { kind: "phrase" }),

    /* ---------- transition words (phrases) ---------- */
    rule(/\bFurthermore,?\s*/gi, ["Also, ", "Plus, ", "On top of that, "], { kind: "phrase" }),
    rule(/\bMoreover,?\s*/gi, ["Also, ", "Besides, ", "Plus, "], { kind: "phrase" }),
    rule(/\bAdditionally,?\s*/gi, ["Also, ", "Plus, ", "And "], { kind: "phrase" }),
    rule(/\bConsequently,?\s*/gi, ["So, ", "Because of that, "], { kind: "phrase" }),
    rule(/\bNevertheless,?\s*/gi, ["Still, ", "Even so, ", "But "], { kind: "phrase" }),
    rule(/\bNonetheless,?\s*/gi, ["Still, ", "Even so, "], { kind: "phrase" }),
    rule(/\bTherefore,?\s*/gi, ["So, ", "That's why "], { kind: "phrase" }),
    rule(/\bThus,?\s*/gi, ["So, ", "This way, "], { kind: "phrase", probability: 0.8 }),
    rule(/\bHence,?\s*/gi, ["So, ", "That's why "], { kind: "phrase", probability: 0.8 }),
    rule(/\bIn conclusion,?\s*/gi, ["So, ", "Overall, ", "All in all, "], { kind: "phrase" }),
    rule(/\bTo summarize,?\s*/gi, ["In short, ", "So, "], { kind: "phrase" }),
    rule(/\bIn summary,?\s*/gi, ["In short, ", "Long story short, "], { kind: "phrase" }),
    rule(/\bHowever,?\s*/gi, ["But ", "Though ", "That said, "], { kind: "phrase", probability: 0.65 }),
    rule(/\bOn the other hand,?\s*/gi, ["Then again, ", "But "], { kind: "phrase" }),
    rule(/\bImportantly,?\s*/gi, [""], { kind: "phrase", probability: 0.6 }),
    rule(/\bindeed,?\s*/gi, null, {
      kind: "phrase",
      probability: 0.55,
      contextual: { start: ["Indeed, "], mid: [""] },
    }),

    /* ---------- fancy single words → plain ones ---------- */
    rule(/\bdelving into\b/gi, ["digging into", "looking into"]),
    rule(/\bdelve into\b/gi, ["dig into", "look into", "explore"]),
    rule(/\bdelves into\b/gi, ["digs into", "looks into"]),
    rule(/\bdelved into\b/gi, ["dug into", "looked into"]),
    rule(/\bdelve\b/gi, ["dig", "look"], { probability: 0.9 }),
    rule(/\butilize\b/gi, ["use"]),
    rule(/\butilizes\b/gi, ["uses"]),
    rule(/\butilizing\b/gi, ["using"]),
    rule(/\butilized\b/gi, ["used"]),
    rule(/\butilization\b/gi, ["use", "usage"]),
    rule(/\bleverage\b/gi, ["use"]),
    rule(/\bleverages\b/gi, ["uses"]),
    rule(/\bleveraging\b/gi, ["using"]),
    rule(/\bleveraged\b/gi, ["used"]),
    rule(/\bobtains\b/gi, ["gets"]),
    rule(/\bobtain\b/gi, ["get"]),
    rule(/\bobtaining\b/gi, ["getting"]),
    rule(/\bobtained\b/gi, ["got"]),
    rule(/\bcommences\b/gi, ["starts", "begins"]),
    rule(/\bcommence\b/gi, ["start", "begin"]),
    rule(/\bcommenced\b/gi, ["started", "began"]),
    rule(/\bterminates\b/gi, ["ends"]),
    rule(/\bterminate\b/gi, ["end"]),
    rule(/\bterminated\b/gi, ["ended"]),
    rule(/\bendeavors\b/gi, ["tries", "attempts"]),
    rule(/\bendeavor\b/gi, ["try", "attempt"]),
    rule(/\bascertains?\b/gi, ["finds out", "find out", "figures out"]),
    rule(/\bascertain\b/gi, ["find out", "figure out"]),
    rule(/\bfacilitates\b/gi, ["helps with", "supports"]),
    rule(/\bfacilitate\b/gi, ["help with", "support"]),
    rule(/\bfacilitating\b/gi, ["helping with"]),
    rule(/\bfacilitated\b/gi, ["helped with"]),
    rule(/\bsubsequently\b/gi, ["later", "after that"]),
    rule(/\bapproximately\b/gi, ["about", "around", "roughly"]),
    rule(/\bsufficient\b/gi, ["enough"]),
    rule(/\brequires\b/gi, ["needs"]),
    rule(/\brequire\b/gi, ["need"]),
    rule(/\brequiring\b/gi, ["needing"]),
    rule(/\brequired\b/gi, ["needed"]),
    rule(/\bnumerous\b/gi, ["many", "a lot of"]),
    rule(/\bindividuals\b/gi, ["people"]),
    rule(/\bcomponents\b/gi, ["parts"], { probability: 0.6 }),
    rule(/\bcomponent\b/gi, ["part"], { probability: 0.6 }),
    rule(/\bmethodologies\b/gi, ["methods", "approaches"]),
    rule(/\bmethodology\b/gi, ["method", "approach"]),
    rule(/\bfunctionalities\b/gi, ["features"]),
    rule(/\bfunctionality\b/gi, ["features", "function"]),
    rule(/\benhances\b/gi, ["improves", "boosts"]),
    rule(/\benhance\b/gi, ["improve", "boost"]),
    rule(/\benhancing\b/gi, ["improving", "boosting"]),
    rule(/\benhanced\b/gi, ["improved", "better"]),
    rule(/\benhancements\b/gi, ["improvements"]),
    rule(/\benhancement\b/gi, ["improvement"]),
    rule(/\bcrucial\b/gi, ["key", "vital", "huge"]),
    rule(/\bparamount\b/gi, ["key", "essential"]),
    rule(/\bpivotal\b/gi, ["key", "major"]),
    rule(/\bseamlessly\b/gi, ["smoothly"]),
    rule(/\bseamless\b/gi, ["smooth"]),
    rule(/\brobust\b/gi, ["solid", "strong", "reliable"]),
    rule(/\bcomprehensive\b/gi, ["thorough", "complete", "full"]),
    rule(/\bintricate\b/gi, ["complex", "tricky"]),
    rule(/\blandscape\b/gi, ["space", "scene", "world"], { probability: 0.55 }),
    rule(/\bfosters\b/gi, ["builds", "encourages", "grows"]),
    rule(/\bfoster\b/gi, ["build", "encourage", "grow"]),
    rule(/\bfostering\b/gi, ["building", "encouraging"]),
    rule(/\bharnesses\b/gi, ["uses", "taps into"]),
    rule(/\bharness\b/gi, ["use", "tap into"]),
    rule(/\bharnessing\b/gi, ["using", "tapping into"]),
    rule(/\bharnessed\b/gi, ["used", "tapped into"]),
    rule(/\bundescors?e?s?\b/gi, ["highlight", "highlights", "shows"], { probability: 0 }),
    rule(/\bunderscores\b/gi, ["highlights", "shows"]),
    rule(/\bunderscore\b/gi, ["highlight", "show"]),
    rule(/\bundescoring\b/gi, ["highlighting", "showing"]),
    rule(/\bnoteworthy\b/gi, ["interesting", "worth a look"]),
    rule(/\bmeticulously\b/gi, ["carefully"]),
    rule(/\bmeticulous\b/gi, ["careful"]),
    rule(/\bmultifaceted\b/gi, ["complex", "many-sided"]),
    rule(/\brevolutionizes\b/gi, ["reshapes", "changes"]),
    rule(/\brevolutionize\b/gi, ["reshape", "change"]),
    rule(/\btransformative\b/gi, ["huge", "major"]),
    rule(/\bsynergy\b/gi, ["teamwork", "cooperation"]),
    rule(/\bstreamlines\b/gi, ["simplifies", "speeds up"]),
    rule(/\bstreamline\b/gi, ["simplify", "speed up"]),
    rule(/\bstreamlining\b/gi, ["simplifying", "speeding up"]),
    rule(/\boptimizes\b/gi, ["improves", "tunes"], { probability: 0.6 }),
    rule(/\boptimize\b/gi, ["improve", "tune"], { probability: 0.6 }),
    rule(/\bholistic\b/gi, ["well-rounded", "complete"]),
    rule(/\binnovative\b/gi, ["fresh", "new", "creative"], { probability: 0.6 }),
    rule(/\bground[- ]?break(?:ing|er)\b/gi, ["major", "big"]),
    rule(/\bunveils\b/gi, ["shows", "announces"]),
    rule(/\bunveil\b/gi, ["show", "announce"]),
    rule(/\bunveiled\b/gi, ["showed", "announced"]),
    rule(/\bempowers\b/gi, ["helps", "enables"]),
    rule(/\bempower\b/gi, ["help", "enable"]),
    rule(/\bempowering\b/gi, ["helping", "enabling"]),
    rule(/\belevates\b/gi, ["lifts", "improves"]),
    rule(/\belevate\b/gi, ["lift", "improve"]),
    rule(/\bamplifies\b/gi, ["boosts"]),
    rule(/\bamplify\b/gi, ["boost"]),
    rule(/\bresonates\b/gi, ["connects", "lands"]),
    rule(/\bresonate\b/gi, ["connect", "land"]),
    rule(/\bdemonstrates\b/gi, ["shows"]),
    rule(/\bdemonstrate\b/gi, ["show"]),
    rule(/\bdemonstrating\b/gi, ["showing"]),
    rule(/\bdemonstrated\b/gi, ["showed"]),
    rule(/\bassists\b/gi, ["helps"]),
    rule(/\bassist\b/gi, ["help"]),
    rule(/\bassisting\b/gi, ["helping"]),
    rule(/\bassisted\b/gi, ["helped"]),
    rule(/\bpurchases\b/gi, ["buys"], { probability: 0.7 }),
    rule(/\bpurchase\b/gi, ["buy"], { probability: 0.7 }),
    rule(/\bpurchased\b/gi, ["bought"], { probability: 0.7 }),
    rule(/\baforementioned\b/gi, ["that", "the one mentioned"], { probability: 0.8 }),
    rule(/\bnotwithstanding\b/gi, ["despite", "even with"]),
    rule(/\bfundamentally\b/gi, ["at its core", "basically"], { probability: 0.5 }),
    rule(/\bintriguing\b/gi, ["interesting", "curious"], { probability: 0.6 }),
    rule(/\bprofound\b/gi, ["deep", "big"], { probability: 0.5 }),
    rule(/\beffortlessly\b/gi, ["easily", "without much effort"]),
    rule(/\bdiverse\b/gi, ["varied", "mixed"], { probability: 0.4 }),

    /* ---------- contractions ---------- */
    rule(/\bdo not\b/gi, ["don't"], { contraction: true }),
    rule(/\bdoes not\b/gi, ["doesn't"], { contraction: true }),
    rule(/\bdid not\b/gi, ["didn't"], { contraction: true }),
    rule(/\bcannot\b/gi, ["can't"], { contraction: true }),
    rule(/\bcan not\b/gi, ["can't"], { contraction: true }),
    rule(/\bwill not\b/gi, ["won't"], { contraction: true }),
    rule(/\bwould not\b/gi, ["wouldn't"], { contraction: true }),
    rule(/\bcould not\b/gi, ["couldn't"], { contraction: true }),
    rule(/\bshould not\b/gi, ["shouldn't"], { contraction: true }),
    rule(/\bis not\b/gi, ["isn't"], { contraction: true }),
    rule(/\bare not\b/gi, ["aren't"], { contraction: true }),
    rule(/\bwas not\b/gi, ["wasn't"], { contraction: true }),
    rule(/\bwere not\b/gi, ["weren't"], { contraction: true }),
    rule(/\bhas not\b/gi, ["hasn't"], { contraction: true }),
    rule(/\bhave not\b/gi, ["haven't"], { contraction: true }),
    rule(/\bhad not\b/gi, ["hadn't"], { contraction: true }),
    rule(/\bit is\b/gi, ["it's"], { contraction: true, probability: 0.85 }),
    rule(/\bit has\b/gi, ["it's"], { contraction: true, probability: 0.5 }),
    rule(/\bthat is\b/gi, ["that's"], { contraction: true, probability: 0.7 }),
    rule(/\bthere is\b/gi, ["there's"], { contraction: true, probability: 0.7 }),
    rule(/\byou are\b/gi, ["you're"], { contraction: true }),
    rule(/\bwe are\b/gi, ["we're"], { contraction: true }),
    rule(/\bthey are\b/gi, ["they're"], { contraction: true }),
    rule(/\bI am\b/g, ["I'm"], { contraction: true }),
    rule(/\bI have\b/g, ["I've"], { contraction: true, probability: 0.8 }),
    rule(/\bI will\b/g, ["I'll"], { contraction: true, probability: 0.85 }),
    rule(/\bI would\b/g, ["I'd"], { contraction: true, probability: 0.8 }),
    rule(/\byou will\b/gi, ["you'll"], { contraction: true, probability: 0.85 }),
    rule(/\bwe will\b/gi, ["we'll"], { contraction: true, probability: 0.85 }),
    rule(/\bthey will\b/gi, ["they'll"], { contraction: true, probability: 0.85 }),
    rule(/\byou have\b/gi, ["you've"], { contraction: true, probability: 0.8 }),
    rule(/\bwe have\b/gi, ["we've"], { contraction: true, probability: 0.8 }),
    rule(/\bthey have\b/gi, ["they've"], { contraction: true, probability: 0.8 }),
    rule(/\blet us\b/gi, ["let's"], { contraction: true }),
    rule(/\bwhat is\b/gi, ["what's"], { contraction: true, probability: 0.7 }),
    rule(/\bwho is\b/gi, ["who's"], { contraction: true, probability: 0.7 }),
    rule(/\bhow is\b/gi, ["how's"], { contraction: true, probability: 0.7 }),
  ];

  /* detection patterns for scoring — style rules only, not contractions */
  const DETECT_PATTERNS = RULES.filter((r) => !r.contraction && r.probability > 0).map(
    (r) => r.pattern
  );

  /* ---------- sentence helpers ---------- */
  function splitSentences(text) {
    const parts = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g);
    return parts || [text];
  }

  function capitalizeFirst(s) {
    return s.replace(/\S/, (c) => c.toUpperCase());
  }

  function uncapitalizeFirst(s) {
    return s.replace(/\S/, (c) => c.toLowerCase());
  }

  /* ---------- core transforms ---------- */

  function applyRules(text, rng, opts) {
    let out = text;
    for (const r of RULES) {
      if (r.probability <= 0) continue;
      if (!opts.contractions && r.contraction) continue;
      // Light intensity: clichés still get fixed, word swaps are gentler
      const scale = r.kind === "phrase" ? Math.max(opts.ruleScale, 1) : opts.ruleScale;
      const prob = Math.min(1, r.probability * scale);

      out = out.replace(r.pattern, function (match, offset, full) {
        if (rng() > prob) return match;
        let alts = r.replacements;
        if (r.contextual) {
          alts = isSentenceStart(full, offset) ? r.contextual.start : r.contextual.mid;
        }
        let repl = pick(rng, alts);
        if (repl === "") return "";
        repl = matchCase(match, repl);
        // preserve trailing space if the pattern consumed one via \s*
        return repl;
      });
    }
    return out;
  }

  function fixEmDashes(text, rng, opts) {
    if (!opts.emDashes) return text;
    return text.replace(/\s+—\s+/g, () => (rng() < 0.55 ? ", " : " — "));
  }

  function splitLongSentences(text, rng, opts) {
    if (!opts.splitSentences) return text;
    const sentences = splitSentences(text);
    return sentences
      .map((s) => {
        const words = s.trim().split(/\s+/).length;
        if (words < 30 || rng() > 0.75 * opts.ruleScale) return s;
        const lead = s.match(/^\s*/)[0];
        const body = s.slice(lead.length);
        const pivotRe = /,\s+(?:and|but|so|yet|while|although)\s+|;\s+/i;
        const m = body.match(pivotRe);
        if (!m || m.index < 15) return s;
        let first = body.slice(0, m.index).trim().replace(/[,;]$/, "");
        const second = capitalizeFirst(body.slice(m.index + m[0].length).trim());
        if (!/[.!?]$/.test(first)) first += ".";
        return lead + first + " " + second;
      })
      .join("");
  }

  const OPENERS = ["Honestly, ", "Look, ", "Truth is, ", "Here's the thing: ", "Frankly, "];
  const CONNECTIVE_RE =
    /^(Also|Plus|But|So|And|Besides|Still|Even so|That said|Then again|First|Finally|Overall|In short|Long story short|On top of that|Because of that|Worth knowing|Note that|Honestly|Frankly|Look|Truth is|Here's the thing)(?=[,:.\s])/i;

  function addOpeners(text, rng, opts) {
    if (opts.intensity === "light" || !opts.openers) return text;
    const rate = opts.intensity === "bold" ? 0.22 : 0.1;
    const sentences = splitSentences(text);
    let changed = 0;
    return sentences
      .map((s, i) => {
        const lead = s.match(/^\s*/)[0];
        const body = s.slice(lead.length);
        if (
          changed >= 3 ||
          i < 1 || // never touch the very first sentence
          body.length < 25 ||
          /^[("'“”]/.test(body) ||
          CONNECTIVE_RE.test(body) ||
          rng() > rate
        ) {
          return s;
        }
        changed++;
        return lead + pick(rng, OPENERS) + uncapitalizeFirst(body);
      })
      .join("");
  }

  function dropHedging(text, rng, opts) {
    if (opts.intensity !== "bold") return text;
    return text
      .replace(/\b[Ii]t is (?:quite )?clear that\s+/g, (m) => (rng() < 0.7 ? "" : m))
      .replace(/,\s*indeed\s*,/g, (m) => (rng() < 0.75 ? "," : m))
      .replace(/\b[Cc]ertainly,?\s+/g, (m) => (rng() < 0.6 ? "" : m))
      .replace(/\b[Ii]ndeed,?\s+/g, (m) => (rng() < 0.6 ? "" : m))
      .replace(/\b[Aa]rguably,?\s+/g, (m) => (rng() < 0.5 ? "" : m));
  }

  function cleanup(text) {
    return text
      .replace(/ {2,}/g, " ")
      .replace(/ +([,.!?;:])/g, "$1")
      .replace(/(^|[\n(]) +/g, "$1")
      .replace(/ +$/gm, "")
      .replace(/,+/g, (m) => (m.length > 1 ? "," : m))
      .replace(/,\.|\. ,/g, ".")
      .replace(/\.\s*\.(?!\.)/g, ".")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\.{2,}([A-Za-z])/g, ". $1")
      // "; Plus, ..." reads better as ". Plus, ..."
      .replace(/;\s+(Plus|Also|Besides|But|So|And|However|Moreover|Furthermore|Additionally|Instead|Meanwhile|Then)\b/g, ". $1")
      .replace(/\s+([,;])(?=,|;)/g, "$1");
  }

  /* ---------- AI-score heuristic ---------- */
  function analyze(text) {
    const words = text.match(/[A-Za-z']+/g) || [];
    const wordCount = words.length;
    const sentences = splitSentences(text).filter((s) => s.trim().length > 0);
    const sentenceCount = Math.max(1, sentences.length);
    const avgLen = wordCount / sentenceCount;
    const chars = text.length;

    let hits = 0;
    for (const p of DETECT_PATTERNS) {
      const re = new RegExp(p.source, p.flags);
      const m = text.match(re);
      if (m) hits += m.length;
    }

    const emDashes = (text.match(/—/g) || []).length;
    const contractions = (text.match(/\b\w+'\w+\b/g) || []).length;

    let score = 92;
    score -= hits * 7;
    score -= Math.max(0, avgLen - 18) * 1.6;
    score -= emDashes * 3;
    score += Math.min(12, contractions * 2);
    if (wordCount > 0) score += Math.min(6, (contractions / wordCount) * 220);
    score = Math.round(Math.max(4, Math.min(98, score)));

    return {
      wordCount,
      charCount: chars,
      sentenceCount,
      avgSentenceLength: Math.round(avgLen * 10) / 10,
      hits,
      score,
      readingMinutes: Math.round((wordCount / 200) * 10) / 10,
      verdict:
        score >= 75
          ? { label: "Reads human", tone: "good" }
          : score >= 50
          ? { label: "Mixed signals", tone: "mid" }
          : { label: "Sounds AI-written", tone: "bad" },
    };
  }

  /* ---------- public API ---------- */
  function humanize(text, options) {
    const opts = Object.assign(
      {
        intensity: "standard", // light | standard | bold
        seed: Date.now() & 0xffffffff,
        contractions: true,
        emDashes: true,
        splitSentences: true,
        openers: true,
      },
      options || {}
    );
    const rng = mulberry32(opts.seed);
    opts.ruleScale = opts.intensity === "light" ? 0.55 : opts.intensity === "bold" ? 1.2 : 1;

    let out = text;
    out = applyRules(out, rng, opts);
    out = fixEmDashes(out, rng, opts);
    out = splitLongSentences(out, rng, opts);
    out = addOpeners(out, rng, opts);
    out = dropHedging(out, rng, opts);
    out = cleanup(out);
    return out;
  }

  global.Humanizer = { humanize, analyze };
})(typeof window !== "undefined" ? window : globalThis);
