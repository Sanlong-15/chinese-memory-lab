function renderPatterns() {
  const wrap = document.getElementById("patternGroupsWrap");
  const patternGroups = DB.patternGroups || [];
  wrap.innerHTML = patternGroups
    .map(
      (g) => `
    <div class="pattern-group" data-group-title="${g.title}">
      <span class="sound-tag">${g.sound_component}</span>
      <h3>${g.title}</h3>
      <p class="explain">${g.explain}</p>
      <div class="member-row">
        ${g.members
          .map(
            (m) => `
          <div class="member-pill" data-lookup="${m[0]}">
            <div class="zi">${m[0]}</div>
            <div class="py">${m[1]}</div>
            <div class="gloss">${m[3]}</div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `,
    )
    .join("");

  wrap.querySelectorAll(".member-pill").forEach((p) => {
    p.addEventListener("click", () => {
      const ch = p.dataset.lookup;
      speak(ch);
      const w = (DB.words || []).find((x) => x.chars.includes(ch));
      if (w) {
        switchView("wordsView");
        openDetail(w.id);
      }
    });
  });

  renderRadicals("ALL");
}

// --- Meaning-clue families (radicals) ---
const TIER_LABEL = {
  "very high": "very common",
  high: "common",
  medium: "medium",
  low: "less common",
};

function renderRadicals(tierFilter) {
  const radWrap = document.getElementById("radicalGroupsWrap");
  if (!radWrap) return;
  const all = DB.radicalGroups || [];
  const groups =
    tierFilter && tierFilter !== "ALL"
      ? all.filter((g) => g.tier === tierFilter)
      : all;

  radWrap.innerHTML = groups
    .map((g) => {
      const showFull = g.full && g.full !== g.radical;
      return `
    <div class="radical-group" data-radical="${g.radical}">
      <div class="rad-head">
        <div class="rad-glyph">${g.radical}</div>
        <div class="rad-id">
          <div class="rad-line1">
            <span class="rad-py">${g.pinyin}</span>
            <span class="rad-meaning">${g.meaning}</span>
          </div>
          <div class="rad-line2">
            <span class="rad-name">${g.name}</span>
            <span class="rad-nameen">${g.nameEn}</span>
          </div>
        </div>
        <div class="rad-badges">
          <span class="rad-badge tier-${g.tier.replace(" ", "-")}">${TIER_LABEL[g.tier] || g.tier}</span>
          <span class="rad-badge count">${g.inLab} in your lab</span>
        </div>
      </div>
      <p class="rad-explain">${g.explain}</p>
      <div class="rad-facts">
        <span><b>Where it sits:</b> ${g.position}</span>
        ${showFull ? `<span><b>Standalone form:</b> <span class="rad-fullform">${g.full}</span></span>` : ""}
      </div>
      <div class="rad-members">
        ${g.members
          .map(
            (ch) =>
              `<button class="rad-chip" data-lookup="${ch}" title="Click to hear it and open the word">${ch}</button>`,
          )
          .join("")}
      </div>
    </div>
  `;
    })
    .join("");

  radWrap.querySelectorAll(".rad-chip").forEach((p) => {
    p.addEventListener("click", () => {
      const ch = p.dataset.lookup;
      speak(ch);
      const w = (DB.words || []).find((x) => (x.chars || []).includes(ch));
      if (w) {
        switchView("wordsView");
        openDetail(w.id);
      }
    });
  });

  const note = document.getElementById("radCountNote");
  if (note) {
    const links = groups.reduce((n, g) => n + g.inLab, 0);
    note.textContent = `Showing ${groups.length} radicals · ${links} characters from your lab`;
  }
}

// --- Sentence practice (cloze / fill the blank) ---
let sentLevel = "ALL";
let sentPool = [];
let sentIndex = 0;
let sentCorrect = 0;
let sentTotal = 0;
let sentAnswered = false;
let sentAllChoices = [];

function buildSentPool() {
  const words =
    sentLevel === "ALL"
      ? DB.words
      : DB.words.filter((w) => w.level === sentLevel);
  sentPool = [];
  for (const w of words)
    for (const ex of w.examples || [])
      if (ex.cn && ex.cn.includes(w.chinese)) sentPool.push({ w, ex });
  shuffleArray(sentPool);
  if (!sentAllChoices.length)
    sentAllChoices = [...new Set(DB.words.map((w) => w.chinese))];
  sentIndex = 0;
  sentCorrect = 0;
  sentTotal = 0;
  renderSentence();
}

function pickSentOptions(correct) {
  const correctLen = Array.from(correct).length;
  let same = sentAllChoices.filter(
    (c) => c !== correct && Array.from(c).length === correctLen,
  );
  shuffleArray(same);
  let opts = same.slice(0, 3);
  if (opts.length < 3) {
    let others = sentAllChoices.filter(
      (c) => c !== correct && !opts.includes(c),
    );
    shuffleArray(others);
    opts = opts.concat(others.slice(0, 3 - opts.length));
  }
  opts.push(correct);
  shuffleArray(opts);
  return opts;
}

function updateSentScore() {
  const el = document.getElementById("sentScore");
  if (el)
    el.textContent =
      "Correct " +
      sentCorrect +
      " / " +
      sentTotal +
      "  ·  " +
      sentPool.length +
      " sentences in this set";
}

function renderSentence() {
  const nextBtn = document.getElementById("sentNext");
  if (nextBtn) nextBtn.classList.add("hidden");
  const cnEl = document.getElementById("sentCn");
  const enEl = document.getElementById("sentEn");
  const pyEl = document.getElementById("sentPy");
  const wrap = document.getElementById("sentOptions");
  if (!cnEl) return;
  pyEl.textContent = "";
  wrap.innerHTML = "";
  const sn = document.getElementById("sentNote");
  if (sn) sn.textContent = "";
  if (!sentPool.length) {
    cnEl.textContent = "No sentences for this level.";
    enEl.textContent = "";
    updateSentScore();
    return;
  }
  const { w, ex } = sentPool[sentIndex];
  const cn = ex.cn;
  const idx = cn.indexOf(w.chinese);
  const before = cn.slice(0, idx);
  const after = cn.slice(idx + w.chinese.length);
  cnEl.innerHTML =
    before + '<span class="blank" id="theBlank">____</span>' + after;
  enEl.textContent = ex.en;
  sentAnswered = false;
  for (const o of pickSentOptions(w.chinese)) {
    const b = document.createElement("button");
    b.className = "sent-opt hanzi";
    b.textContent = o;
    b.addEventListener("click", () => chooseSent(b, o, w, ex));
    wrap.appendChild(b);
  }
  updateSentScore();
}

function chooseSent(btn, choice, w, ex) {
  if (sentAnswered) return;
  sentAnswered = true;
  sentTotal++;
  const correct = w.chinese;
  const blank = document.getElementById("theBlank");
  if (choice === correct) {
    sentCorrect++;
    btn.classList.add("correct");
    if (blank) {
      blank.textContent = correct;
      blank.classList.add("filled-correct");
    }
  } else {
    btn.classList.add("wrong");
    document.querySelectorAll(".sent-opt").forEach((bb) => {
      if (bb.textContent === correct) bb.classList.add("correct");
    });
    if (blank) {
      blank.textContent = correct;
      blank.classList.add("filled-wrong");
    }
    demoteToReview(w.id, "sentNote");
  }
  document.getElementById("sentPy").textContent = ex.py;
  speak(ex.cn);
  document.getElementById("sentNext").classList.remove("hidden");
  updateSentScore();
}

function initSentences() {
  document.querySelectorAll(".sent-filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".sent-filter-chip")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      sentLevel = btn.dataset.level;
      ensureExamples(buildSentPool);
    });
  });
  const next = document.getElementById("sentNext");
  if (next)
    next.addEventListener("click", () => {
      if (!sentPool.length) return;
      sentIndex = (sentIndex + 1) % sentPool.length;
      renderSentence();
    });
  // pool is built lazily the first time the Sentences tab is opened
}

// --- Theme (day / night) ---
function applyTheme(t) {
  if (t === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = t === "dark" ? "Day mode" : "Night mode";
}
function initTheme() {
  const KEY = "cml_theme";
  let t = "light";
  try {
    t = localStorage.getItem(KEY) || "light";
  } catch (e) {}
  applyTheme(t);
  const btn = document.getElementById("themeToggle");
  if (btn)
    btn.addEventListener("click", () => {
      const cur =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "dark"
          : "light";
      const next = cur === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
    });
}

// --- Connect practice modes to spaced repetition ---
// When a word is missed in Sentences / Listen / Tone, bring it back soon in Study Mode.
function demoteToReview(id, noteElId) {
  if (typeof schedule === "function") schedule(id, "again");
  if (typeof renderDashboard === "function") renderDashboard();
  const note = noteElId && document.getElementById(noteElId);
  if (note) note.textContent = "↩ added back to Study Mode";
}

// --- Tone practice ---
// tone parsing lives in js/logic.js (Logic.toneSeq), unit-tested
function toneSeq(pinyin) {
  return Logic.toneSeq(pinyin);
}

let toneLevel = "ALL";
let tonePool = [];
let toneIndex = 0;
let toneCorrect = 0;
let toneTotal = 0;
let toneAnswered = false;
let toneCurrentSeq = [];

function toneEligible(w) {
  const seq = toneSeq(w.pinyin);
  const chars = Array.from(w.chinese).filter((ch) => /[一-鿿]/.test(ch)).length;
  return seq.length === chars && seq.length >= 1 && seq.length <= 3;
}

function buildTonePool() {
  const words =
    toneLevel === "ALL"
      ? dedupeByChinese(DB.words)
      : dedupeByChinese(DB.words.filter((w) => w.level === toneLevel));
  tonePool = words.filter(toneEligible);
  shuffleArray(tonePool);
  toneIndex = 0;
  toneCorrect = 0;
  toneTotal = 0;
  renderTone();
}

function updateToneScore() {
  const el = document.getElementById("toneScore");
  if (el)
    el.textContent =
      "Correct " + toneCorrect + " / " + toneTotal + "  ·  " + tonePool.length + " words in this set";
}

function randTonePattern(len) {
  const a = [];
  for (let i = 0; i < len; i++) a.push(1 + Math.floor(Math.random() * 4));
  return a.join("-");
}

function renderTone() {
  const optWrap = document.getElementById("toneOptions");
  const nextBtn = document.getElementById("toneNext");
  if (!optWrap) return;
  nextBtn.classList.add("hidden");
  optWrap.innerHTML = "";
  document.getElementById("toneNote").textContent = "";
  document.getElementById("tonePy").textContent = "";
  if (!tonePool.length) {
    document.getElementById("toneZi").textContent = "—";
    updateToneScore();
    return;
  }
  const w = tonePool[toneIndex];
  toneCurrentSeq = toneSeq(w.pinyin);
  const correct = toneCurrentSeq.join("-");
  document.getElementById("toneZi").textContent = "？";
  toneAnswered = false;
  const set = new Set([correct]);
  let guard = 0;
  while (set.size < 4 && guard < 50) {
    set.add(randTonePattern(toneCurrentSeq.length));
    guard++;
  }
  const opts = [...set];
  shuffleArray(opts);
  for (const o of opts) {
    const b = document.createElement("button");
    b.className = "listen-opt tone-opt";
    b.innerHTML = `<span class="tone-glyph">${Logic.toneGlyphs(o)}</span>`;
    b.dataset.seq = o;
    b.addEventListener("click", () => chooseTone(b, o, w));
    optWrap.appendChild(b);
  }
  updateToneScore();
  speak(w.chinese);
}

function chooseTone(btn, choice, w) {
  if (toneAnswered) return;
  toneAnswered = true;
  toneTotal++;
  const correct = toneCurrentSeq.join("-");
  if (choice === correct) {
    toneCorrect++;
    btn.classList.add("correct");
  } else {
    btn.classList.add("wrong");
    document.querySelectorAll(".tone-opt").forEach((bb) => {
      if (bb.dataset.seq === correct) bb.classList.add("correct");
    });
    demoteToReview(w.id, "toneNote");
  }
  document.getElementById("toneZi").textContent = w.chinese;
  document.getElementById("tonePy").textContent = w.pinyin;
  document.getElementById("toneNext").classList.remove("hidden");
  updateToneScore();
}

function initTone() {
  document.querySelectorAll(".tone-filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tone-filter-chip")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      toneLevel = btn.dataset.level;
      buildTonePool();
    });
  });
  const replay = document.getElementById("toneReplay");
  if (replay)
    replay.addEventListener("click", () => {
      if (tonePool.length) speak(tonePool[toneIndex].chinese);
    });
  const next = document.getElementById("toneNext");
  if (next)
    next.addEventListener("click", () => {
      if (!tonePool.length) return;
      toneIndex = (toneIndex + 1) % tonePool.length;
      renderTone();
    });
  buildTonePool();
}

// --- Grammar patterns ---
function renderGrammar() {
  const wrap = document.getElementById("grammarWrap");
  if (!wrap || typeof GRAMMAR === "undefined") return;
  wrap.innerHTML = GRAMMAR.map((g) => {
    const hi = (s) => {
      let out = s;
      for (const k of g.keys) out = out.split(k).join('<span class="gk">' + k + "</span>");
      return out;
    };
    const ex = g.examples
      .map(
        (e) =>
          `<button class="gram-ex" data-speak="${e.cn}"><span class="gcn hanzi">${hi(e.cn)}</span><span class="gpy">${e.py}</span><span class="gen">${e.en}</span></button>`,
      )
      .join("");
    return `
    <div class="gram-card">
      <div class="gram-head">
        <span class="gram-pat hanzi">${g.pat}</span>
        <span class="gram-en">${g.en}</span>
        <span class="gram-badge">${g.tier}</span>
      </div>
      <div class="gram-formula"><span class="gram-formula-lbl">Pattern</span><span class="gram-struct">${g.struct}</span></div>
      <p class="gram-rule">${g.rule}</p>
      <div class="gram-examples">${ex}</div>
      ${g.pit ? `<div class="gram-pit"><strong>Watch out:</strong> ${g.pit}</div>` : ""}
    </div>`;
  }).join("");
  wrap.querySelectorAll(".gram-ex").forEach((b) => {
    b.addEventListener("click", () => speak(b.dataset.speak));
  });
}

// --- Character structures ---
function renderStructures() {
  const wrap = document.getElementById("structuresWrap");
  if (!wrap || typeof STRUCTURES === "undefined") return;
  const labChars = new Set();
  for (const w of DB.words || [])
    for (const ch of w.chinese) if (/[一-鿿]/.test(ch)) labChars.add(ch);

  const tierClass = {
    "most common": "tier-very-high",
    common: "tier-high",
    "less common": "tier-low",
    base: "tier-medium",
  };

  wrap.innerHTML = STRUCTURES.map((s) => {
    const chips = s.members
      .map((ch) => {
        const inLab = labChars.has(ch);
        return inLab
          ? `<button class="struct-chip" data-lookup="${ch}">${ch}</button>`
          : `<span class="struct-chip flat">${ch}</span>`;
      })
      .join("");
    return `
    <div class="struct-card">
      <div class="struct-diagram">
        <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">${s.svg}</svg>
      </div>
      <div class="struct-body">
        <div class="struct-head">
          <span class="struct-name">${s.name}</span>
          <span class="struct-py">${s.pinyin}</span>
          <span class="struct-en">${s.en}</span>
          <span class="struct-badge ${tierClass[s.tier] || "tier-medium"}">${s.tier}</span>
        </div>
        <p class="struct-hint">${s.hint}</p>
        <div class="struct-members">${chips}</div>
      </div>
    </div>`;
  }).join("");

  wrap.querySelectorAll(".struct-chip[data-lookup]").forEach((p) => {
    p.addEventListener("click", () => {
      const ch = p.dataset.lookup;
      speak(ch);
      const w = (DB.words || []).find((x) => (x.chars || []).includes(ch));
      if (w) {
        switchView("wordsView");
        openDetail(w.id);
      }
    });
  });
}

function initRadicalFilter() {
  document.querySelectorAll(".rad-filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".rad-filter-chip")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderRadicals(btn.dataset.tier);
    });
  });
}

// --- Study mode (with spaced repetition) ---