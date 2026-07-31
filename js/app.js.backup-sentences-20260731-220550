let currentLevel = "ALL";
let currentSearch = "";
const wordImageCache = {};

function matchesFilter(w) {
  if (currentLevel !== "ALL" && w.level !== currentLevel) {
    return false;
  }
  if (currentSearch) {
    const s = currentSearch.toLowerCase();
    return (
      w.chinese.includes(currentSearch) ||
      w.pinyin.toLowerCase().includes(s) ||
      w.english.toLowerCase().includes(s) ||
      (w.khmer && w.khmer.toLowerCase().includes(s)) ||
      (w.breakdown && w.breakdown.toLowerCase().includes(s))
    );
  }
  return true;
}

function renderGrid() {
  const grid = document.getElementById("wordGrid");
  const filtered = (DB.words || []).filter(matchesFilter);
  document.getElementById("countNote").textContent = filtered.length
    ? filtered.length + " words"
    : "No matching characters found";

  if (!filtered.length) {
    grid.innerHTML = `<div class="word-card empty">No matching characters found.</div>`;
    return;
  }

  grid.innerHTML = filtered
    .map(
      (w) => `
    <div class="word-card" data-id="${w.id}">
      <div class="zi">${w.chinese}</div>
      <div class="py">${w.pinyin}</div>
      <div class="en">${w.english}</div>
      <div class="level-tag">${w.level}</div>
    </div>
  `,
    )
    .join("");
  grid.querySelectorAll(".word-card").forEach((card) => {
    card.addEventListener("click", () => {
      const w = (DB.words || []).find(
        (x) => x.id === parseInt(card.dataset.id, 10),
      );
      if (w) speak(w.chinese);
      openDetail(parseInt(card.dataset.id, 10));
    });
  });
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    alert("Your browser doesn't support speech. Try Chrome or Edge.");
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "zh-CN";
  utter.rate = 0.85;
  // Try to pick a Chinese voice if one is installed
  const voices = window.speechSynthesis.getVoices();
  const zhVoice =
    voices.find((v) => v.lang === "zh-CN") ||
    voices.find((v) => v.lang && v.lang.startsWith("zh"));
  if (zhVoice) utter.voice = zhVoice;
  window.speechSynthesis.speak(utter);
}
// Some browsers load voices asynchronously - warm them up
if ("speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () =>
    window.speechSynthesis.getVoices();
}

function charStoryHTML(ch) {
  const info = DB.charInfo[ch];
  if (!info) return "";
  const families = DB.charToFamily[ch] || [];
  const famHTML = families
    .map(
      (f) =>
        `<span class="family-chip" data-family="${f}">Part of the ${f.replace("The ", "").replace(" sound family", "")} family &rarr;</span>`,
    )
    .join(" ");
  return `
    <div class="char-story-card">
      <div class="big-zi">
        ${ch}
        <button class="speak-btn small" data-speak="${ch}" title="Play pronunciation" style="display:block;margin:6px auto 0;">🔊</button>
      </div>
      <div class="char-story-body">
        <span class="type-badge ${typeClass[info.type]}">${typeLabel[info.type]}</span>
        ${info.parts && info.parts !== "-" ? `<div class="parts-line"><strong>Parts:</strong> ${info.parts}</div>` : ""}
        <div class="story-line">${info.story}</div>
        ${famHTML}
      </div>
    </div>
  `;
}

// --- Picture (live Wikimedia Commons search, no key needed) ---
function cleanImageQuery(english) {
  let t = (english || "").replace(/\([^)]*\)/g, "").trim();
  t = t.split(",")[0].trim();
  return t;
}

async function loadWordImage(w) {
  const wrap = document.getElementById("wordImageWrap");
  if (!wrap) return;
  const term = cleanImageQuery(w.english);
  if (!term) {
    wrap.innerHTML = `<p class="image-none">No picture found for this word.</p>`;
    return;
  }

  if (wordImageCache[term]) {
    renderWordImage(wrap, term, wordImageCache[term], 0);
    return;
  }

  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: term,
      gsrnamespace: "6",
      gsrlimit: "8",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "320",
      format: "json",
      origin: "*",
    });
    const res = await fetch(
      "https://commons.wikimedia.org/w/api.php?" + params.toString(),
    );
    const data = await res.json();
    const pages = (data.query && data.query.pages) || {};
    const results = Object.values(pages)
      .filter((p) => p.imageinfo && p.imageinfo[0] && p.imageinfo[0].thumburl)
      .filter((p) => /\.(jpe?g|png|webp)$/i.test(p.title || ""))
      .sort((a, b) => (a.index || 99) - (b.index || 99))
      .map((p) => ({
        thumb: p.imageinfo[0].thumburl,
        page: p.imageinfo[0].descriptionurl,
      }));
    wordImageCache[term] = results;
    if (document.getElementById("wordImageWrap") === wrap) {
      renderWordImage(wrap, term, results, 0);
    }
  } catch (err) {
    wrap.innerHTML = `<p class="image-none">Couldn't reach the picture search. Check your internet connection.</p>`;
  }
}

function renderWordImage(wrap, term, results, index) {
  if (!results.length) {
    wrap.innerHTML = `<p class="image-none">No picture found for "${term}".</p>`;
    return;
  }
  const i = index % results.length;
  const r = results[i];
  wrap.innerHTML = `
    <img class="word-image" src="${r.thumb}" alt="${term}" loading="lazy" />
    <div class="image-caption">
      <span>photo: &ldquo;${term}&rdquo; &middot; <a href="${r.page}" target="_blank" rel="noopener">Wikimedia Commons</a></span>
      ${results.length > 1 ? `<button type="button" class="img-shuffle-btn">&#128260; try another</button>` : ""}
    </div>
  `;
  const shuffleBtn = wrap.querySelector(".img-shuffle-btn");
  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", () => {
      renderWordImage(wrap, term, results, i + 1);
    });
  }
  const img = wrap.querySelector(".word-image");
  img.addEventListener("error", () => {
    const remaining = results.filter((x) => x !== r);
    renderWordImage(wrap, term, remaining, 0);
  });
}

function exampleBoxHTML(ex) {
  const badge = ex.level
    ? `<span class="level-badge level-badge-${ex.level.toLowerCase()}">${ex.level}</span>`
    : "";
  return `
    <div class="example-box">
      ${badge}
      <div class="cn">${ex.cn} <button class="speak-btn small" data-speak="${ex.cn}" title="Play sentence">🔊</button></div>
      <div class="py">${ex.py}</div>
      <div class="en">${ex.en}</div>
    </div>
  `;
}

function openDetail(id) {
  const w = DB.words.find((x) => x.id === id);
  if (!w) return;
  const uniqueChars = [...new Set(w.chars)];
  const examples =
    w.examples && w.examples.length
      ? w.examples
      : [{ level: null, cn: w.ex_cn, py: w.ex_py, en: w.ex_en }];
  const html = `
    <div class="detail-head">
      <div class="zi-row"><div class="zi">${w.chinese}</div>
        <button class="speak-btn" data-speak="${w.chinese}" title="Play pronunciation">🔊</button>
      </div>
      <div class="py">${w.pinyin}</div>
      <div class="en">${w.english}</div>
      <div class="kh">${w.khmer}</div>
    </div>
    <div class="section-label">Picture</div>
    <div id="wordImageWrap" class="word-image-wrap"><p class="image-loading">Looking for a picture&hellip;</p></div>
    <div class="section-label">${examples.length > 1 ? "Examples" : "Example"}</div>
    ${examples.map(exampleBoxHTML).join("")}
    <div class="section-label">How to remember it</div>
    ${uniqueChars.length > 1 ? `<div class="parts-line" style="margin-bottom:8px;"><strong>Word breakdown:</strong> ${w.breakdown}</div>` : ""}
    ${uniqueChars.map(charStoryHTML).join("")}
  `;
  document.getElementById("detailContent").innerHTML = html;
  document.getElementById("overlay").classList.add("show");
  loadWordImage(w);

  document.querySelectorAll("#detailContent [data-speak]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      speak(btn.dataset.speak);
    });
  });

  document.querySelectorAll(".family-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      closeDetail();
      switchView("patternsView");
      setTimeout(() => {
        const target = document.querySelector(
          `[data-group-title="${chip.dataset.family}"]`,
        );
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.classList.add("highlight-flash");
        }
      }, 100);
    });
  });
}

function closeDetail() {
  document.getElementById("overlay").classList.remove("show");
}
document.getElementById("closeDetail").addEventListener("click", closeDetail);
document.getElementById("overlay").addEventListener("click", (e) => {
  if (e.target.id === "overlay") closeDetail();
});

document.getElementById("searchBox").addEventListener("input", (e) => {
  currentSearch = e.target.value.trim();
  renderGrid();
});
document.querySelectorAll(".filter-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-chip")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentLevel = btn.dataset.level;
    renderGrid();
  });
});

function switchView(viewId) {
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.querySelector(`[data-view="${viewId}"]`).classList.add("active");
}
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

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
    <div class="radical-group">
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
let currentStudyLevel = "ALL";
let studyMode = "review"; // "review" (SRS due queue) or "browse" (free flip)

// browse-mode state
let studyList = (DB.words || []).slice();
let studyIndex = 0;

// review-mode state
let reviewQueue = [];
const NEW_PER_SESSION = 15;
const DAY = 86400000;
const SRS_KEY = "cml_srs_v1";

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---- SRS storage ----
function loadSrs() {
  try {
    return JSON.parse(localStorage.getItem(SRS_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveSrs(data) {
  try {
    localStorage.setItem(SRS_KEY, JSON.stringify(data));
  } catch (e) {
    /* private mode: progress won't persist, app still works */
  }
}
let srs = loadSrs();

function getState(id) {
  return (
    srs[id] || { state: "new", due: 0, interval: 0, ease: 2.3, reps: 0, lapses: 0 }
  );
}

function schedule(id, rating) {
  const now = Date.now();
  const st = { ...getState(id) };
  const fresh = st.state === "new" || st.state === "learning";
  if (rating === "again") {
    if (st.state === "review") st.lapses++;
    st.ease = Math.max(1.3, st.ease - 0.2);
    st.state = "learning";
    st.interval = 0;
    st.due = now;
  } else if (rating === "hard") {
    st.ease = Math.max(1.3, st.ease - 0.15);
    st.interval = fresh ? 1 : Math.max(1, Math.round(st.interval * 1.2));
    st.state = "review";
    st.reps++;
    st.due = now + st.interval * DAY;
  } else if (rating === "good") {
    st.interval = fresh ? 1 : Math.max(1, Math.round(st.interval * st.ease));
    st.state = "review";
    st.reps++;
    st.due = now + st.interval * DAY;
  } else if (rating === "easy") {
    st.ease = st.ease + 0.15;
    st.interval = fresh ? 4 : Math.max(4, Math.round(st.interval * st.ease * 1.3));
    st.state = "review";
    st.reps++;
    st.due = now + st.interval * DAY;
  }
  srs[id] = st;
  saveSrs(srs);
}

function filteredWords() {
  return currentStudyLevel === "ALL"
    ? DB.words.slice()
    : DB.words.filter((w) => w.level === currentStudyLevel);
}

function updateSrsStats() {
  const el = document.getElementById("srsStats");
  if (!el) return;
  const now = Date.now();
  const words = filteredWords();
  let due = 0,
    fresh = 0,
    learned = 0;
  for (const w of words) {
    const st = getState(w.id);
    if (st.state === "new") fresh++;
    else {
      if (st.reps > 0) learned++;
      if (st.due <= now) due++;
    }
  }
  el.innerHTML =
    `<span class="srs-stat due">Due: ${due}</span>` +
    `<span class="srs-stat new">New: ${fresh}</span>` +
    `<span class="srs-stat learned">Learned: ${learned}</span>`;
}

// ---- Browse mode ----
function buildStudyList() {
  studyList = filteredWords();
  studyIndex = 0;
  renderBrowseCard();
}

function renderBrowseCard() {
  const w = studyList[studyIndex];
  const card = document.getElementById("flashcard");
  card.classList.remove("flipped");
  if (!w) return;
  document.getElementById("fc-zi").textContent = w.chinese;
  document.getElementById("fc-py").textContent = w.pinyin;
  document.getElementById("fc-en").textContent = w.english;
  document.getElementById("fc-kh").textContent = w.khmer;
  document.getElementById("progressNote").textContent =
    studyIndex + 1 + " / " + studyList.length;
}

// ---- Review mode (SRS queue) ----
function buildReviewQueue() {
  const now = Date.now();
  const words = filteredWords();
  const dueCards = [];
  const newCards = [];
  for (const w of words) {
    const st = getState(w.id);
    if (st.state === "new") newCards.push(w);
    else if (st.due <= now) dueCards.push(w);
  }
  shuffleArray(dueCards);
  shuffleArray(newCards);
  reviewQueue = dueCards.concat(newCards.slice(0, NEW_PER_SESSION));
  renderReviewCard();
}

function renderReviewCard() {
  const card = document.getElementById("flashcard");
  const ratingRow = document.getElementById("ratingRow");
  card.classList.remove("flipped");
  ratingRow.classList.remove("show");
  updateSrsStats();

  if (reviewQueue.length === 0) {
    document.getElementById("fc-zi").textContent = "完成";
    document.getElementById("fc-py").textContent = "wánchéng le";
    document.getElementById("fc-en").textContent =
      "All caught up for this filter. Come back later, or switch level.";
    document.getElementById("fc-kh").textContent = "";
    document.getElementById("progressNote").textContent = "Nothing due right now";
    card.classList.add("done");
    return;
  }
  card.classList.remove("done");
  const w = reviewQueue[0];
  document.getElementById("fc-zi").textContent = w.chinese;
  document.getElementById("fc-py").textContent = w.pinyin;
  document.getElementById("fc-en").textContent = w.english;
  document.getElementById("fc-kh").textContent = w.khmer;
  document.getElementById("progressNote").textContent =
    "In this session: " + reviewQueue.length + " left";
}

function rateCurrent(rating) {
  if (studyMode !== "review" || reviewQueue.length === 0) return;
  const w = reviewQueue.shift();
  schedule(w.id, rating);
  if (rating === "again") {
    const pos = Math.min(4, reviewQueue.length);
    reviewQueue.splice(pos, 0, w); // repeat later this session
  }
  renderReviewCard();
}

// ---- Mode switching ----
function setStudyMode(mode) {
  studyMode = mode;
  document
    .getElementById("mode-review")
    .classList.toggle("active", mode === "review");
  document
    .getElementById("mode-browse")
    .classList.toggle("active", mode === "browse");
  document
    .getElementById("srsStats")
    .classList.toggle("hidden", mode !== "review");
  document
    .getElementById("browseControls")
    .classList.toggle("hidden", mode !== "browse");
  const ratingRow = document.getElementById("ratingRow");
  if (mode === "review") {
    ratingRow.classList.remove("hidden");
    buildReviewQueue();
  } else {
    ratingRow.classList.add("hidden");
    ratingRow.classList.remove("show");
    buildStudyList();
  }
}

function refreshStudy() {
  if (studyMode === "review") buildReviewQueue();
  else buildStudyList();
}

// ---- Wiring ----
document.querySelectorAll(".study-filter-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".study-filter-chip")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentStudyLevel = btn.dataset.level;
    refreshStudy();
  });
});

document.getElementById("mode-review").addEventListener("click", () => setStudyMode("review"));
document.getElementById("mode-browse").addEventListener("click", () => setStudyMode("browse"));

document.getElementById("flashcard").addEventListener("click", () => {
  const card = document.getElementById("flashcard");
  if (card.classList.contains("done")) return;
  card.classList.toggle("flipped");
  const flipped = card.classList.contains("flipped");
  if (flipped) {
    const w = studyMode === "review" ? reviewQueue[0] : studyList[studyIndex];
    if (w) speak(w.chinese);
    if (studyMode === "review")
      document.getElementById("ratingRow").classList.add("show");
  } else {
    document.getElementById("ratingRow").classList.remove("show");
  }
});

["again", "hard", "good", "easy"].forEach((r) => {
  const b = document.getElementById("rate-" + r);
  if (b) b.addEventListener("click", () => rateCurrent(r));
});

document.getElementById("srsReset").addEventListener("click", () => {
  const label =
    currentStudyLevel === "ALL" ? "ALL levels" : currentStudyLevel;
  if (
    !confirm(
      "Reset spaced-repetition progress for " +
        label +
        "? This cannot be undone.",
    )
  )
    return;
  if (currentStudyLevel === "ALL") {
    srs = {};
  } else {
    for (const w of DB.words.filter((x) => x.level === currentStudyLevel))
      delete srs[w.id];
  }
  saveSrs(srs);
  refreshStudy();
});

// browse buttons
document.getElementById("nextBtn").addEventListener("click", () => {
  if (!studyList.length) return;
  studyIndex = (studyIndex + 1) % studyList.length;
  renderBrowseCard();
});
document.getElementById("prevBtn").addEventListener("click", () => {
  if (!studyList.length) return;
  studyIndex = (studyIndex - 1 + studyList.length) % studyList.length;
  renderBrowseCard();
});
document.getElementById("shuffleBtn").addEventListener("click", () => {
  shuffleArray(studyList);
  studyIndex = 0;
  renderBrowseCard();
});

// --- Writing practice ---
let currentWritingLevel = "ALL";
let writingList = (DB.words || []).slice();
let writingIndex = 0;
let activeWriters = [];

function buildWritingList() {
  writingList =
    currentWritingLevel === "ALL"
      ? DB.words.slice()
      : DB.words.filter((w) => w.level === currentWritingLevel);
  writingIndex = 0;
  renderWritingWord();
}

function renderWritingWord() {
  if (typeof HanziWriter === "undefined") {
    document.getElementById("writingCanvases").innerHTML =
      '<p class="writing-error-note">Could not load the writing library (needs internet the first time). Check your connection and reload.</p>';
    return;
  }
  const w = writingList[writingIndex];
  document.getElementById("wr-py").textContent = w.pinyin;
  document.getElementById("wr-en").textContent = w.english;
  document.getElementById("wr-kh").textContent = w.khmer;
  const wrEx = w.examples && w.examples.length ? w.examples[0] : w;
  document.getElementById("wr-ex-cn").textContent = wrEx.cn || w.ex_cn;
  document.getElementById("wr-ex-py").textContent = wrEx.py || w.ex_py;
  document.getElementById("wr-ex-en").textContent = wrEx.en || w.ex_en;
  document.getElementById("writingResult").textContent = "";
  document.getElementById("writingHint").textContent = "";
  document.getElementById("writingProgress").textContent =
    writingIndex + 1 + " / " + writingList.length;

  const canvasWrap = document.getElementById("writingCanvases");
  canvasWrap.innerHTML = "";
  activeWriters = [];

  const chars = Array.from(w.chinese);
  let completedCount = 0;

  chars.forEach((ch) => {
    const box = document.createElement("div");
    box.className = "writing-box";
    canvasWrap.appendChild(box);

    const writer = HanziWriter.create(box, ch, {
      width: 180,
      height: 180,
      padding: 10,
      showCharacter: false,
      showOutline: true,
      strokeColor: "#2A2622",
      outlineColor: "#DDD2BC",
      highlightColor: "#3F6F5E",
      drawingColor: "#AE3428",
      drawingWidth: 5,
      onLoadCharDataError: () => {
        box.innerHTML =
          '<p class="writing-error-note" style="padding:10px;max-width:180px;">No stroke data for ' +
          ch +
          "</p>";
      },
    });
    activeWriters.push(writer);

    writer.quiz({
      showHintAfterMisses: 2,
      onMistake: (strokeData) => {
        box.classList.remove("mistake");
        void box.offsetWidth;
        box.classList.add("mistake");
        const missCount = strokeData.mistakesOnStroke;
        document.getElementById("writingHint").textContent =
          missCount >= 2
            ? "Not quite on " + ch + " — watch the highlighted stroke."
            : "Not quite on " + ch + " — try again.";
      },
      onCorrectStroke: () => {
        document.getElementById("writingHint").textContent = "";
      },
      onComplete: () => {
        box.classList.remove("mistake");
        document.getElementById("writingHint").textContent = "";
        completedCount++;
        if (completedCount === chars.length) {
          document.getElementById("writingResult").textContent =
            "Well done — " + w.chinese + " complete!";
          speak(w.chinese);
        }
      },
    });
  });
}

document.querySelectorAll(".writing-filter-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".writing-filter-chip")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentWritingLevel = btn.dataset.level;
    buildWritingList();
  });
});
document.getElementById("wrRevealBtn").addEventListener("click", () => {
  activeWriters.forEach((w) => w.showCharacter());
});
document.getElementById("wrHearBtn").addEventListener("click", () => {
  speak(writingList[writingIndex].chinese);
});
document.getElementById("wrNextBtn").addEventListener("click", () => {
  writingIndex = (writingIndex + 1) % writingList.length;
  renderWritingWord();
});
document.getElementById("wrPrevBtn").addEventListener("click", () => {
  writingIndex = (writingIndex - 1 + writingList.length) % writingList.length;
  renderWritingWord();
});
document.getElementById("wrShuffleBtn").addEventListener("click", () => {
  shuffleArray(writingList);
  writingIndex = 0;
  renderWritingWord();
});

// init
renderGrid();
renderPatterns();
initRadicalFilter();
renderStructures();
setStudyMode("review");
renderWritingWord();
