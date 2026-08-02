// logic.js — pure, side-effect-free functions.
// No DOM, no localStorage. This is the part we unit-test with Vitest.
// It works both in the browser (as window.Logic) and in Node (module.exports),
// so the site still runs with plain <script> tags — no build step needed.
(function (root) {
  "use strict";

  // ---- FSRS-style scheduler (Anki 23+ / Hack Chinese memory model) ----
  // A card tracks Stability (S = days until recall drops to ~90%) and
  // Difficulty (D = 1..10). Default FSRS-5 weights.
  const FSRS_W = [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
    0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
    0.6621,
  ];
  const FSRS_DECAY = -0.5;
  const FSRS_FACTOR = Math.pow(0.9, 1 / FSRS_DECAY) - 1; // ≈ 0.2345
  const TARGET_R = 0.9; // review when recall probability hits 90%
  const DAY = 86400000;

  const clampD = (d) => Math.min(10, Math.max(1, d));
  const clampS = (s) => Math.min(36500, Math.max(0.01, s));
  const initD = (g) => clampD(FSRS_W[4] - Math.exp(FSRS_W[5] * (g - 1)) + 1);

  // days until retention == TARGET_R (invert the forgetting curve)
  function fsrsInterval(S) {
    return (S / FSRS_FACTOR) * (Math.pow(TARGET_R, 1 / FSRS_DECAY) - 1);
  }

  // Predicted probability you'd recall this card right now (0..1).
  // Same forgetting curve FSRS uses: R = (1 + FACTOR * t/S) ^ DECAY.
  function recallProb(state, now) {
    if (!state || !state.S || !state.reps) return 0;
    const t = Math.max(0, (now - (state.last || now)) / DAY);
    return Math.pow(1 + FSRS_FACTOR * (t / state.S), FSRS_DECAY);
  }

  // Pure: take the current card state + a rating, return the NEW state.
  // Does not read or write storage — the caller persists the result.
  function fsrsUpdate(state, rating, now) {
    const g = { again: 1, hard: 2, good: 3, easy: 4 }[rating];
    if (!g) throw new Error("bad rating: " + rating);
    const st = Object.assign({}, state);
    const firstReview = st.state === "new" || !st.reps || !st.S;

    if (firstReview) {
      st.S = clampS(FSRS_W[g - 1]);
      st.D = initD(g);
    } else {
      const t = Math.max(0, (now - (st.last || now)) / DAY); // days elapsed
      const R = Math.pow(1 + FSRS_FACTOR * (t / st.S), FSRS_DECAY); // recall prob now
      const deltaD = -FSRS_W[6] * (g - 3);
      const Dp = st.D + (deltaD * (10 - st.D)) / 9; // linear damping
      st.D = clampD(FSRS_W[7] * initD(4) + (1 - FSRS_W[7]) * Dp); // mean reversion
      if (g === 1) {
        const Sf =
          FSRS_W[11] *
          Math.pow(st.D, -FSRS_W[12]) *
          (Math.pow(st.S + 1, FSRS_W[13]) - 1) *
          Math.exp(FSRS_W[14] * (1 - R));
        st.S = clampS(Math.min(Sf, st.S)); // forgetting never grows stability
        st.lapses = (st.lapses || 0) + 1;
      } else {
        const hard = g === 2 ? FSRS_W[15] : 1;
        const easy = g === 4 ? FSRS_W[16] : 1;
        const inc =
          Math.exp(FSRS_W[8]) *
          (11 - st.D) *
          Math.pow(st.S, -FSRS_W[9]) *
          (Math.exp(FSRS_W[10] * (1 - R)) - 1) *
          hard *
          easy;
        st.S = clampS(st.S * (1 + inc));
      }
    }
    st.reps = (st.reps || 0) + 1;
    st.last = now;
    st.state = "review";
    st.interval = fsrsInterval(st.S); // days, for display + dashboard
    st.due = now + Math.max(0, st.interval) * DAY;
    return st;
  }

  // ---- Tone parser: pinyin diacritics -> [1..4] sequence ----
  const TONE1 = "āēīōūǖ";
  const TONE2 = "áéíóúǘ";
  const TONE3 = "ǎěǐǒǔǚ";
  const TONE4 = "àèìòùǜ";
  function toneSeq(pinyin) {
    const seq = [];
    for (const ch of pinyin || "") {
      const c = ch.toLowerCase();
      if (TONE1.includes(c)) seq.push(1);
      else if (TONE2.includes(c)) seq.push(2);
      else if (TONE3.includes(c)) seq.push(3);
      else if (TONE4.includes(c)) seq.push(4);
    }
    return seq;
  }

  // ---- Tone number string -> contour glyphs ----
  // "3-1-2" -> "ˇ ˉ ˊ".  1=high flat, 2=rising, 3=dip, 4=falling, 0/5=neutral.
  const TONE_MARK = { 1: "ˉ", 2: "ˊ", 3: "ˇ", 4: "ˋ", 5: "·", 0: "·" };
  function toneGlyphs(str) {
    return String(str)
      .split("-")
      .map((n) => TONE_MARK[n.trim()] || n)
      .join(" ");
  }

  // ---- Choose a study task for a word based on how well it's known ----
  // Pure + testable. state = SRS card state, eligible = task types the word can
  // support (recognize/recall/listen/tone/sentence), rng = () => 0..1.
  // New words always get recognition (see the story first); as a word matures
  // (more reps) the mix shifts toward production (recall), tones, and sentences.
  // Avoids repeating the exact same task as last time when alternatives exist.
  function pickTaskFromState(state, eligible, rng) {
    rng = rng || Math.random;
    eligible = eligible && eligible.length ? eligible : ["recognize"];
    const isNew = !state || state.state === "new" || !state.reps;
    if (isNew) return "recognize";
    const elig = new Set(eligible);
    const reps = state.reps || 0;
    const pool = [];
    const add = (t, n) => {
      if (elig.has(t)) for (let i = 0; i < n; i++) pool.push(t);
    };
    if (reps < 2) {
      add("recognize", 3);
      add("listen", 1);
    } else if (reps < 5) {
      add("recognize", 1);
      add("recall", 2);
      add("listen", 1);
      add("tone", 1);
      add("sentence", 1);
    } else {
      add("recall", 3);
      add("tone", 1);
      add("sentence", 2);
      add("listen", 1);
    }
    if (!pool.length) {
      const arr = [...elig];
      return arr[Math.floor(rng() * arr.length)];
    }
    let choices = pool;
    if (state.lastTask) {
      const alt = pool.filter((t) => t !== state.lastTask);
      if (alt.length) choices = alt;
    }
    return choices[Math.floor(rng() * choices.length)];
  }

  // ---- Order new words so a priority list (e.g. A0 building blocks) comes
  // first, in its given order; everything else keeps its incoming order.
  // priorityMap: Map from chinese -> priority index. Pure + testable.
  function orderNewByPriority(words, priorityMap) {
    if (!priorityMap || typeof priorityMap.has !== "function") return words.slice();
    const pri = [];
    const rest = [];
    for (const w of words) {
      if (priorityMap.has(w.chinese)) pri.push(w);
      else rest.push(w);
    }
    pri.sort((a, b) => priorityMap.get(a.chinese) - priorityMap.get(b.chinese));
    return pri.concat(rest);
  }

  // ---- Dedupe a word list by its Chinese text (keeps first seen) ----
  function dedupeByChinese(list) {
    const seen = new Set();
    const out = [];
    for (const w of list || []) {
      if (seen.has(w.chinese)) continue;
      seen.add(w.chinese);
      out.push(w);
    }
    return out;
  }

  const Logic = {
    FSRS_W,
    FSRS_DECAY,
    FSRS_FACTOR,
    recallProb,
    TARGET_R,
    DAY,
    fsrsInterval,
    fsrsUpdate,
    TONE1,
    TONE2,
    TONE3,
    TONE4,
    toneSeq,
    toneGlyphs,
    dedupeByChinese,
    pickTaskFromState,
    orderNewByPriority,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Logic;
  root.Logic = Logic;
})(typeof window !== "undefined" ? window : globalThis);
