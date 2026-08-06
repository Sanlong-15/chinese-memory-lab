function openDetail(id) {
  const w = DB.words.find((x) => x.id === id);
  if (!w) return;
  if (!examplesLoaded) {
    // load the full sentence list first, then render the detail
    ensureExamples(() => openDetail(id));
    return;
  }
  const uniqueChars = [...new Set(w.chars)];
  const hasStory = uniqueChars.some((ch) => DB.charInfo[ch]);
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
    <div class="section-label">Characters — tap to explore</div>
    <div class="char-row">${uniqueChars.map((ch) => `<button class="char-chip" data-char="${ch}">${ch}</button>`).join("")}</div>
    ${uniqueChars.length > 1 ? `<div class="parts-line" style="margin:2px 0 8px;"><strong>Word breakdown:</strong> ${w.breakdown}</div>` : ""}
    ${hasStory ? `<div class="section-label">How to remember it</div>${uniqueChars.map(charStoryHTML).join("")}` : ""}
    ${renderRelatedWords(w)}
  `;
  document.getElementById("detailContent").innerHTML = html;
  openOverlay();
  loadWordImage(w);
  wireDetailLinks();
}

function scrollToInPatterns(selector) {
  closeDetail();
  switchView("patternsView");
  setTimeout(() => {
    const t = document.querySelector(selector);
    if (t) {
      t.scrollIntoView({ behavior: "smooth", block: "center" });
      t.classList.remove("highlight-flash");
      void t.offsetWidth;
      t.classList.add("highlight-flash");
    }
  }, 120);
}

// Wire all clickable links inside the detail overlay (words + characters).
function wireDetailLinks() {
  document.querySelectorAll("#detailContent [data-speak]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      speak(btn.dataset.speak);
    });
  });
  document.querySelectorAll("#detailContent [data-char]").forEach((el) => {
    el.addEventListener("click", () => openCharDetail(el.dataset.char));
  });
  document.querySelectorAll("#detailContent [data-word-id]").forEach((el) => {
    el.addEventListener("click", () =>
      openDetail(parseInt(el.dataset.wordId, 10)),
    );
  });
  document.querySelectorAll("#detailContent .family-chip").forEach((chip) => {
    chip.addEventListener("click", () =>
      scrollToInPatterns(`[data-group-title="${chip.dataset.family}"]`),
    );
  });
  const radBtn = document.querySelector("#detailContent [data-goto-rad]");
  if (radBtn)
    radBtn.addEventListener("click", () =>
      scrollToInPatterns(`[data-radical="${radBtn.dataset.gotoRad}"]`),
    );
  const stBtn = document.querySelector("#detailContent [data-goto-struct]");
  if (stBtn)
    stBtn.addEventListener("click", () => {
      closeDetail();
      switchView("structuresView");
    });
}

// --- Character index (words / radical / structure per single character) ---
let charWords = new Map();
let charPinyin = new Map();
let charRadical = new Map();
let charStruct = new Map();

function buildCharIndex() {
  charWords = new Map();
  charPinyin = new Map();
  charRadical = new Map();
  charStruct = new Map();
  for (const w of DB.words) {
    const chars = Array.from(w.chinese);
    if (chars.length === 1 && !charPinyin.has(w.chinese))
      charPinyin.set(w.chinese, w.pinyin);
    for (const ch of new Set(chars)) {
      if (!/[一-鿿]/.test(ch)) continue;
      if (!charWords.has(ch)) charWords.set(ch, []);
      charWords.get(ch).push(w.id);
    }
  }
  for (const g of DB.radicalGroups || [])
    for (const m of g.members)
      if (!charRadical.has(m))
        charRadical.set(m, {
          glyph: g.radical,
          pinyin: g.pinyin,
          meaning: g.meaning,
        });
  if (typeof STRUCTURES !== "undefined")
    for (const s of STRUCTURES)
      for (const m of s.members)
        if (!charStruct.has(m))
          charStruct.set(m, { name: s.name, en: s.en, svg: s.svg });
}

function wordChipsHTML(ids, selfId) {
  const words = ids
    .map((id) => DB.words.find((x) => x.id === id))
    .filter((x) => x && x.id !== selfId);
  const seen = new Set();
  const uniq = [];
  for (const x of words) {
    if (seen.has(x.chinese)) continue;
    seen.add(x.chinese);
    uniq.push(x);
  }
  return uniq
    .slice(0, 40)
    .map(
      (x) =>
        `<button class="rel-word" data-word-id="${x.id}"><span class="rel-zi">${x.chinese}</span><span class="rel-py">${x.pinyin}</span></button>`,
    )
    .join("");
}

function renderRelatedWords(w) {
  const ids = new Set();
  for (const ch of new Set(Array.from(w.chinese)))
    for (const id of charWords.get(ch) || []) if (id !== w.id) ids.add(id);
  if (!ids.size) return "";
  const chips = wordChipsHTML([...ids], w.id);
  if (!chips) return "";
  return `<div class="section-label">Related words (share a character)</div><div class="rel-words">${chips}</div>`;
}

function openCharDetail(ch) {
  const info = DB.charInfo[ch];
  const py = charPinyin.get(ch);
  const rad = charRadical.get(ch);
  const st = charStruct.get(ch);
  const ids = charWords.get(ch) || [];
  const families = DB.charToFamily[ch] || [];
  const famHTML = families
    .map(
      (f) =>
        `<span class="family-chip" data-family="${f}">Part of the ${f
          .replace("The ", "")
          .replace(" sound family", "")} family &rarr;</span>`,
    )
    .join(" ");
  const html = `
    <div class="detail-head">
      <div class="zi-row"><div class="zi">${ch}</div>
        <button class="speak-btn" data-speak="${ch}" title="Play pronunciation">🔊</button>
      </div>
      ${py ? `<div class="py">${py}</div>` : `<div class="py" style="font-size:12.5px;color:var(--ink-soft);">pinyin changes with the word</div>`}
    </div>
    ${
      info
        ? `<div class="section-label">How to remember it</div>
      <div class="char-story-body" style="border:1px solid var(--line);border-radius:12px;padding:12px 14px;">
        <span class="type-badge ${typeClass[info.type]}">${typeLabel[info.type]}</span>
        ${info.parts && info.parts !== "-" ? `<div class="parts-line"><strong>Parts:</strong> ${info.parts}</div>` : ""}
        <div class="story-line">${info.story}</div>
        ${famHTML}
      </div>`
        : ""
    }
    ${
      rad
        ? `<div class="section-label">Meaning radical</div>
      <div class="char-fact"><span class="cf-glyph">${rad.glyph}</span><div><div class="cf-main">${rad.pinyin} — ${rad.meaning}</div><button class="cf-link" data-goto-rad="${rad.glyph}">See this radical family &rarr;</button></div></div>`
        : ""
    }
    ${
      st
        ? `<div class="section-label">Shape</div>
      <div class="char-fact"><svg viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">${st.svg}</svg><div><div class="cf-main">${st.name} · ${st.en}</div><button class="cf-link" data-goto-struct="1">See character structures &rarr;</button></div></div>`
        : ""
    }
    <div class="section-label">Words using ${ch} (${new Set(ids.map((id) => (DB.words.find((x) => x.id === id) || {}).chinese)).size})</div>
    <div class="rel-words">${wordChipsHTML(ids, null) || '<span style="font-size:12.5px;color:var(--ink-soft);">No other words yet.</span>'}</div>
  `;
  document.getElementById("detailContent").innerHTML = html;
  openOverlay();
  wireDetailLinks();
}

// ---- Overlay accessibility: focus, Escape, focus trap ----
let lastOverlayFocus = null;
function openOverlay() {
  lastOverlayFocus = document.activeElement; // remember what to return focus to
  const ov = document.getElementById("overlay");
  ov.classList.add("show");
  const card = ov.querySelector(".detail-card");
  card.setAttribute("tabindex", "-1");
  card.focus();
}
function overlayIsOpen() {
  return document.getElementById("overlay").classList.contains("show");
}
function closeDetail() {
  document.getElementById("overlay").classList.remove("show");
  if (lastOverlayFocus && lastOverlayFocus.focus) lastOverlayFocus.focus();
}
// keep keyboard focus inside a dialog while it is open
function trapFocus(container, e) {
  const items = container.querySelectorAll(
    'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
  );
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
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

// Deep links: reflect the open tab in the URL (#study, #words, ...) so it can
// be bookmarked and shared, and restored on reload.
const VIEW_HASH = {
  todayView: "today",
  courseView: "course",
  wordsView: "words",
  patternsView: "patterns",
  structuresView: "structures",
  grammarView: "grammar",
  sentencesView: "sentences",
  listenView: "listen",
  toneView: "tones",
  practiceView: "drill",
  studyView: "study",
  writingView: "writing",
  progressView: "progress",
  settingsView: "settings",
};
const HASH_VIEW = Object.fromEntries(
  Object.entries(VIEW_HASH).map(([k, v]) => [v, k])
);

// Information architecture: five intent-based groups, each holding one or more
// existing views. Single-view groups (Today/Progress/You) skip the sub-row.
const GROUPS = {
  today: [["todayView", "Today"]],
  learn: [
    ["courseView", "Course"],
    ["wordsView", "Vocabulary"],
    ["structuresView", "Characters"],
    ["patternsView", "Radicals & families"],
    ["grammarView", "Grammar"],
    ["sentencesView", "Sentences"],
  ],
  practice: [
    ["practiceView", "Practice"],
    ["studyView", "Flashcards"],
    ["listenView", "Listening"],
    ["toneView", "Tones"],
    ["writingView", "Writing"],
  ],
  progress: [["progressView", "Overview"]],
  you: [["settingsView", "Settings"]],
};
const VIEW_GROUP = {};
Object.entries(GROUPS).forEach(([g, views]) =>
  views.forEach(([v]) => (VIEW_GROUP[v] = g))
);

function renderSubnav(group, activeView) {
  const sub = document.getElementById("subNav");
  if (!sub) return;
  const views = GROUPS[group] || [];
  if (views.length > 1) {
    sub.innerHTML = views
      .map(
        ([v, label]) =>
          `<button class="subnav-btn${
            v === activeView ? " active" : ""
          }" data-view="${v}">${label}</button>`
      )
      .join("");
    sub.style.display = "";
  } else {
    sub.innerHTML = "";
    sub.style.display = "none";
  }
}

function setActiveGroup(group) {
  document
    .querySelectorAll(".group-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.group === group));
  document
    .querySelectorAll(".bn-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.group === group));
}

// clicking a primary group opens its first view
function selectGroup(group) {
  const views = GROUPS[group];
  if (views) switchView(views[0][0]);
}

// Lazy view rendering: heavy views build their DOM the first time they are
// opened, not at startup. main.js registers render fns into LAZY_VIEWS.
const LAZY_VIEWS = {};
const _lazyRendered = new Set();
function lazyRender(viewId) {
  if (_lazyRendered.has(viewId)) return;
  const fn = LAZY_VIEWS[viewId];
  if (typeof fn === "function") {
    _lazyRendered.add(viewId); // mark first so a re-entrant call can't loop
    fn();
  }
}

function switchView(viewId) {
  const el = document.getElementById(viewId);
  if (!el) return;
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  el.classList.add("active");
  lazyRender(viewId); // build this view's DOM on first open
  const token = VIEW_HASH[viewId];
  if (token && "#" + token !== location.hash) {
    history.replaceState(null, "", "#" + token);
  }
  const group = VIEW_GROUP[viewId] || "today";
  setActiveGroup(group);
  renderSubnav(group, viewId);
  // per-view refreshes
  if (viewId === "sentencesView" && !sentPool.length) {
    ensureExamples(buildSentPool);
  }
  if (viewId === "progressView" && typeof renderDashboard === "function") {
    renderDashboard();
  }
  if (viewId === "todayView" && typeof updateTodayStart === "function") {
    updateTodayStart();
  }
  if (viewId === "courseView" && typeof renderCourse === "function") {
    renderCourse(); // rebuild each open so unlock progress is current
  }
  if (viewId === "practiceView" && typeof renderPracticePicker === "function") {
    renderPracticePicker();
  }
}

document.querySelectorAll(".group-btn").forEach((btn) => {
  btn.addEventListener("click", () => selectGroup(btn.dataset.group));
});
document.querySelectorAll(".bn-btn").forEach((btn) => {
  btn.addEventListener("click", () => selectGroup(btn.dataset.group));
});
const subNavEl = document.getElementById("subNav");
if (subNavEl)
  subNavEl.addEventListener("click", (e) => {
    const b = e.target.closest(".subnav-btn");
    if (b) switchView(b.dataset.view);
  });
// render the initial sub-nav for the default group
renderSubnav("today", "todayView");
