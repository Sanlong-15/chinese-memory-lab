let currentLevel = "ALL";
let currentSearch = "";
let _grammarKeys = []; // active grammar-pattern filter (its key characters)
let _lessonIds = new Set(); // active lesson filter (word ids in the lesson)
const wordImageCache = {};

// Shared speaker icon for every "play pronunciation" button. Inline SVG (not an
// emoji glyph) so it looks identical on every device. Uses currentColor, so it
// inherits the button's text colour. Defined once, reused everywhere.
const SPEAK_ICON =
  '<svg class="speak-ic" viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M4 9.5v5h3.5L12 18.5V5.5L7.5 9.5H4z"/>' +
  '<path d="M15 9.2a4 4 0 0 1 0 5.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
  '<path d="M17.6 7a7.5 7.5 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
  "</svg>";

// Escape text before putting it inside innerHTML — important for values that
// come from an external source (e.g. the Wikimedia image API).
function escapeHTML(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

// Strip pinyin tone marks so "ni hao" (or "nihao") matches "nǐ hǎo".
const TONE_BASE = {
  ā: "a", á: "a", ǎ: "a", à: "a",
  ē: "e", é: "e", ě: "e", è: "e",
  ī: "i", í: "i", ǐ: "i", ì: "i",
  ō: "o", ó: "o", ǒ: "o", ò: "o",
  ū: "u", ú: "u", ǔ: "u", ù: "u",
  ǖ: "v", ǘ: "v", ǚ: "v", ǜ: "v", ü: "v",
};
function normPinyin(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, (c) => TONE_BASE[c] || c)
    .replace(/\s+/g, "");
}

function matchesFilter(w) {
  if (currentLevel === "BOOKMARKS") {
    if (!isBookmarked(w.id)) return false;
  } else if (currentLevel === "GRAMMAR") {
    if (!_grammarKeys.some((k) => w.chinese.indexOf(k) !== -1)) return false;
  } else if (currentLevel === "LESSON") {
    if (!_lessonIds.has(w.id)) return false;
  } else if (currentLevel !== "ALL" && w.level !== currentLevel) {
    return false;
  }
  if (currentSearch) {
    const s = currentSearch.toLowerCase();
    const sp = normPinyin(currentSearch); // tone/space-insensitive query
    if (
      w.chinese.includes(currentSearch) ||
      (sp && normPinyin(w.pinyin).includes(sp)) ||
      w.english.toLowerCase().includes(s) ||
      (w.khmer && w.khmer.toLowerCase().includes(s)) ||
      (w.breakdown && w.breakdown.toLowerCase().includes(s))
    )
      return true;
    // radical / component search: match the characters' parts & story
    if (typeof DB !== "undefined" && DB.charInfo) {
      for (const ch of w.chars || []) {
        const ci = DB.charInfo[ch];
        if (
          ci &&
          ((ci.parts || "").toLowerCase().includes(s) ||
            (ci.story || "").toLowerCase().includes(s))
        )
          return true;
      }
    }
    return false;
  }
  return true;
}

// Recently-viewed strip on the Words view.
function renderRecent() {
  const row = document.getElementById("recentRow");
  if (!row) return;
  const ids = loadRecent();
  const words = ids
    .map((id) => (DB.words || []).find((w) => w.id === id))
    .filter(Boolean)
    .slice(0, 12);
  if (!words.length) {
    row.innerHTML = "";
    return;
  }
  row.innerHTML =
    `<span class="recent-label">Recently viewed</span>` +
    words
      .map(
        (w) =>
          `<button class="recent-chip" data-word-id="${w.id}"><span class="hanzi">${escapeHTML(
            w.chinese
          )}</span></button>`
      )
      .join("");
  row.querySelectorAll("[data-word-id]").forEach((b) =>
    b.addEventListener("click", () => openDetail(parseInt(b.dataset.wordId, 10)))
  );
}

// Build the "More filters" menu (grammar patterns + course lessons). Built once.
function renderWordFilters() {
  const menu = document.getElementById("wordFilterMenu");
  if (!menu || menu.dataset.built) return;
  const gWrap = document.getElementById("wfGrammar");
  const lWrap = document.getElementById("wfLesson");
  const trigger = document.getElementById("wordFilterTrigger");
  const pop = document.getElementById("wordFilterPop");
  const lbl = document.getElementById("wordFilterLbl");
  if (!gWrap || !lWrap || !trigger || !pop) return;
  menu.dataset.built = "1";

  const grammar = typeof GRAMMAR !== "undefined" ? GRAMMAR : [];
  gWrap.innerHTML = grammar
    .map(
      (g, i) =>
        `<button class="filter-chip wf-opt" data-gi="${i}">${escapeHTML(g.pat)}</button>`
    )
    .join("");

  if (typeof COURSE !== "undefined" && typeof pathLessons === "function") {
    lWrap.innerHTML = COURSE.paths
      .map(
        (p) =>
          `<div class="fp-sub">${escapeHTML(p.title)}</div>` +
          pathLessons(p)
            .map(
              (L) =>
                `<button class="filter-chip wf-opt" data-lesson="${escapeHTML(
                  L.id
                )}">L${L.index} · ${escapeHTML(L.title)}</button>`
            )
            .join("")
      )
      .join("");
  }

  const close = () => {
    pop.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  };
  const open = () => {
    pop.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  };
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    pop.hidden ? open() : close();
  });
  document.addEventListener("click", (e) => {
    if (!pop.hidden && !menu.contains(e.target)) close();
  });
  const clearActive = () =>
    document
      .querySelectorAll("#wordsView .controls .filter-chip[data-level]")
      .forEach((c) => c.classList.remove("active"));

  gWrap.querySelectorAll(".wf-opt").forEach((b) =>
    b.addEventListener("click", () => {
      const g = grammar[+b.dataset.gi];
      _grammarKeys = g.keys || [];
      currentLevel = "GRAMMAR";
      lbl.textContent = "Grammar: " + g.pat;
      clearActive();
      close();
      renderGrid();
    })
  );
  lWrap.querySelectorAll(".wf-opt").forEach((b) =>
    b.addEventListener("click", () => {
      const L = typeof lessonById === "function" ? lessonById(b.dataset.lesson) : null;
      _lessonIds = new Set((L && L.wordIds) || []);
      currentLevel = "LESSON";
      lbl.textContent = "Lesson: " + (L ? L.title : "");
      clearActive();
      close();
      renderGrid();
    })
  );
  const clr = pop.querySelector("[data-clear]");
  if (clr)
    clr.addEventListener("click", () => {
      currentLevel = "ALL";
      _grammarKeys = [];
      _lessonIds = new Set();
      lbl.textContent = "More filters";
      close();
      renderGrid();
    });
  // picking a normal level chip resets the menu label
  document
    .querySelectorAll("#wordsView .controls .filter-chip[data-level]")
    .forEach((c) =>
      c.addEventListener("click", () => (lbl.textContent = "More filters"))
    );
}

let _gridLimit = 80; // windowing: cap rendered cards (keeps DOM + tab order sane)
function renderGrid(keepLimit) {
  const grid = document.getElementById("wordGrid");
  if (!grid) return;
  if (!keepLimit) _gridLimit = 80; // reset on a fresh filter/search
  const more = document.getElementById("gridMore");
  const filtered = (DB.words || []).filter(matchesFilter);
  const note = document.getElementById("countNote");
  if (note)
    note.textContent = filtered.length
      ? filtered.length + " words"
      : "No matching characters found";
  if (more) more.innerHTML = "";
  if (!filtered.length) {
    grid.innerHTML = `<div class="word-card empty">No matching characters found.</div>`;
    return;
  }
  const shown = filtered.slice(0, _gridLimit);
  grid.innerHTML = shown
    .map((w) => {
      // Escape every field: the word list can be extended via lesson upload,
      // so treat it as untrusted before putting it in HTML / an attribute.
      const zi = escapeHTML(w.chinese);
      const py = escapeHTML(w.pinyin);
      const en = escapeHTML(w.english);
      const lvl = escapeHTML(w.level);
      const label = escapeHTML(
        `${w.chinese}, ${w.pinyin}, ${w.english}. Open details.`
      );
      return `
    <div class="word-card" data-id="${w.id}" role="button" tabindex="0" aria-label="${label}">
      <div class="zi">${zi}</div>
      <div class="py">${py}</div>
      <div class="en">${en}</div>
      <div class="level-tag">${lvl}</div>
    </div>
  `;
    })
    .join("");
  if (more && filtered.length > _gridLimit) {
    more.innerHTML = `<button class="study-btn" id="gridMoreBtn">Show more (${
      filtered.length - _gridLimit
    } left)</button>`;
    more.querySelector("#gridMoreBtn").addEventListener("click", () => {
      _gridLimit += 120;
      renderGrid(true);
    });
  }
}

// One delegated listener for the whole grid instead of 2 per card.
// Called once at startup; survives every renderGrid() re-render.
function wireWordGrid() {
  const grid = document.getElementById("wordGrid");
  if (!grid || grid.dataset.wired) return;
  grid.dataset.wired = "1";
  const openCard = (card) => {
    const id = parseInt(card.dataset.id, 10);
    const w = (DB.words || []).find((x) => x.id === id);
    if (w) speak(w.chinese);
    openDetail(id);
  };
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".word-card");
    if (card && card.dataset.id) openCard(card);
  });
  grid.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".word-card");
    if (card && card.dataset.id) {
      e.preventDefault();
      openCard(card);
    }
  });
}

// Reusable touch-swipe helper for mobile gestures. handlers = {left,right,up,down}.
function attachSwipe(el, handlers) {
  let x0 = 0,
    y0 = 0,
    t0 = 0;
  el.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      x0 = t.clientX;
      y0 = t.clientY;
      t0 = Date.now();
    },
    { passive: true }
  );
  el.addEventListener(
    "touchend",
    (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - x0,
        dy = t.clientY - y0;
      if (Date.now() - t0 > 800) return; // too slow to be a swipe
      if (Math.abs(dx) < 45 && Math.abs(dy) < 45) return; // too small
      let fn;
      if (Math.abs(dx) > Math.abs(dy)) fn = dx > 0 ? handlers.right : handlers.left;
      else fn = dy < 0 ? handlers.up : handlers.down;
      if (fn) fn();
    },
    { passive: true }
  );
}

// ---- Bookmarks + recently-viewed (exploration history) ----
const BOOKMARK_KEY = "cml_bookmarks_v1";
const RECENT_KEY = "cml_recent_v1";
function loadBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARK_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function isBookmarked(id) {
  return loadBookmarks().indexOf(id) !== -1;
}
function toggleBookmark(id) {
  const b = loadBookmarks();
  const i = b.indexOf(id);
  if (i === -1) b.push(id);
  else b.splice(i, 1);
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(b));
  } catch (e) {
    /* private mode */
  }
  return i === -1; // true if now bookmarked
}
function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function pushRecent(id) {
  let r = loadRecent().filter((x) => x !== id);
  r.unshift(id);
  r = r.slice(0, 24);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(r));
  } catch (e) {
    /* private mode */
  }
}

// ---- Audio (text-to-speech) with smart voice selection ----
const VOICE_KEY = "cml_voice"; // remembers the user's chosen voice
let chosenVoiceURI = null;
try {
  chosenVoiceURI = localStorage.getItem(VOICE_KEY);
} catch (e) {}

// All installed Mandarin/Chinese voices.
function chineseVoices() {
  if (!("speechSynthesis" in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang && v.lang.toLowerCase().startsWith("zh"));
}

// Score a voice so we can pick the best-sounding one by default.
// Higher = better. Mainland Mandarin + natural/neural voices win;
// robotic eSpeak loses.
function voiceScore(v) {
  let s = 0;
  const lang = (v.lang || "").toLowerCase();
  if (lang.startsWith("zh-cn")) s += 100;
  else if (lang.startsWith("zh-sg")) s += 60;
  else if (lang.startsWith("zh-tw") || lang.startsWith("zh-hk")) s += 40;
  else s += 20;
  const n = (v.name || "").toLowerCase();
  if (n.includes("natural") || n.includes("neural")) s += 45;
  if (n.includes("google")) s += 30;
  if (n.includes("siri")) s += 28;
  if (n.includes("microsoft")) s += 22;
  if (
    /tingting|ting-ting|yaoyao|huihui|kangkang|xiaoxiao|xiaoyi|yunxi|mei-jia|meijia|sinji|yue/.test(
      n
    )
  )
    s += 18;
  if (n.includes("espeak")) s -= 60; // notoriously robotic
  if (v.localService === false) s += 5; // cloud voices usually clearer
  return s;
}

// The voice we will actually use: the remembered one if still present,
// otherwise the best-scoring Chinese voice.
function currentVoice() {
  const list = chineseVoices();
  if (!list.length) return null;
  if (chosenVoiceURI) {
    const saved = list.find((v) => v.voiceURI === chosenVoiceURI);
    if (saved) return saved;
  }
  return list.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    updateVoiceUI();
    return;
  }
  const voice = currentVoice();
  if (!voice) {
    // No Chinese voice on this device — an English voice would mangle the
    // characters, so warn instead of playing wrong sounds.
    updateVoiceUI();
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.voice = voice;
  utter.lang = voice.lang || "zh-CN";
  utter.rate = 0.8;
  window.speechSynthesis.speak(utter);
}

// Turn a long system voice name into a short, clean label.
// "Microsoft Huihui - Chinese (Simplified, PRC)" -> { name: "Huihui", region: "普通话 · zh-CN" }
const VOICE_REGIONS = {
  "zh-cn": "普通话",
  "zh-sg": "新加坡",
  "zh-tw": "台灣",
  "zh-hk": "粵語",
};
function voiceLabel(v) {
  let name = (v.name || "Voice")
    .replace(/^(Microsoft|Google|Apple)\s+/i, "")
    .split(" - ")[0]
    .split(" (")[0]
    .replace(/\s+Online$/i, "")
    .trim();
  const lang = (v.lang || "").toLowerCase();
  const region = VOICE_REGIONS[lang] || v.lang || "";
  return { name, region: region ? region + " · " + v.lang : v.lang };
}

// Fill the custom voice picker and show/hide the "no Chinese voice" warning.
function updateVoiceUI() {
  const label = document.getElementById("voiceCurrentLabel");
  const menu = document.getElementById("voiceMenu");
  const warn = document.getElementById("voiceWarn");
  const picker = document.getElementById("voicePicker");
  if (!label || !menu || !warn || !picker) return;
  const list = chineseVoices();
  if (!list.length) {
    picker.style.display = "none";
    warn.textContent =
      "No Chinese voice on this device. Add one in your settings (Language / Text-to-speech) to hear audio.";
    warn.style.display = "";
    return;
  }
  warn.style.display = "none";
  picker.style.display = "";
  const active = currentVoice();
  const sorted = list.slice().sort((a, b) => voiceScore(b) - voiceScore(a));
  const cur = voiceLabel(active);
  label.innerHTML = `<span class="vc-name">${cur.name}</span><span class="vc-region">${cur.region}</span>`;
  menu.innerHTML = sorted
    .map((v) => {
      const l = voiceLabel(v);
      const sel = active && v.voiceURI === active.voiceURI;
      return `<li class="voice-opt" role="option" data-uri="${v.voiceURI}" aria-selected="${sel}"><span class="vo-name">${l.name}</span><span class="vo-region">${l.region}</span></li>`;
    })
    .join("");
}

if ("speechSynthesis" in window) {
  window.speechSynthesis.getVoices(); // warm up
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
    updateVoiceUI();
  };
}

// Character-type labels for the "How to remember it" cards.
// Kept here (hand-maintained) rather than in the generated data file, which
// used to hold them and dropped them on regeneration.
const typeLabel = {
  pictograph: "Pictograph — no parts",
  compound: "Meaning + Meaning",
  phono: "Sound + Meaning",
  whole: "Whole shape — no reliable split",
};
const typeClass = {
  pictograph: "type-pictograph",
  compound: "type-compound",
  phono: "type-phono",
  whole: "type-whole",
};

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
        <span class="char-link" data-char="${ch}" title="Open character details">${ch}</span>
        <button class="speak-btn small" data-speak="${ch}" title="Play pronunciation" style="display:block;margin:6px auto 0;">${SPEAK_ICON}</button>
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
  const t = escapeHTML(term);
  if (!results.length) {
    wrap.innerHTML = `<p class="image-none">No picture found for "${t}".</p>`;
    return;
  }
  const i = index % results.length;
  const r = results[i];
  wrap.innerHTML = `
    <img class="word-image" src="${escapeHTML(r.thumb)}" alt="${t}" loading="lazy" />
    <div class="image-caption">
      <span>photo: &ldquo;${t}&rdquo; &middot; <a href="${escapeHTML(r.page)}" target="_blank" rel="noopener">Wikimedia Commons</a></span>
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
      <div class="cn">${ex.cn} <button class="speak-btn small" data-speak="${ex.cn}" title="Play sentence">${SPEAK_ICON}</button></div>
      <div class="py">${ex.py}</div>
      <div class="en">${ex.en}</div>
    </div>
  `;
}

// ---- Lazy-loaded example sentences (js/examples.js) ----
// The 6,655 example sentences are ~64% of the data and are not needed for a
// normal review session, so they load on demand (Sentences tab, word detail)
// instead of at startup. Injecting a <script> works even from a file:// path.
let examplesLoaded = false;
let examplesLoading = false;
let examplesQueue = [];
function mergeExamples() {
  if (window.DB_EXAMPLES) {
    for (const w of DB.words) {
      const e = window.DB_EXAMPLES[w.id];
      if (e) w.examples = e;
    }
  }
  examplesLoaded = true;
}
function ensureExamples(cb) {
  if (examplesLoaded) {
    if (cb) cb();
    return;
  }
  if (cb) examplesQueue.push(cb);
  if (examplesLoading) return;
  examplesLoading = true;
  const s = document.createElement("script");
  s.src = "js/data/examples.js?v=82";
  const done = (ok) => {
    if (ok) mergeExamples();
    else examplesLoaded = true; // degrade gracefully to the primary example
    examplesLoading = false;
    const q = examplesQueue.slice();
    examplesQueue = [];
    q.forEach((f) => f());
  };
  s.onload = () => done(true);
  s.onerror = () => done(false);
  document.head.appendChild(s);
}

// Lazily load the character stories (charinfo.js sets DB.charInfo). Kept out of
// the initial payload — it's ~48 KB gzipped and only needed when a word or
// lesson opens, or when searching by radical.
let charInfoLoaded = false;
let charInfoLoading = false;
let charInfoQueue = [];
function ensureCharInfo(cb) {
  if (charInfoLoaded) {
    if (cb) cb();
    return;
  }
  if (cb) charInfoQueue.push(cb);
  if (charInfoLoading) return;
  charInfoLoading = true;
  const s = document.createElement("script");
  s.src = "js/data/charinfo.js?v=82";
  const done = () => {
    charInfoLoaded = true; // charinfo.js has assigned DB.charInfo by now
    charInfoLoading = false;
    const q = charInfoQueue.slice();
    charInfoQueue = [];
    q.forEach((f) => f());
  };
  s.onload = done;
  s.onerror = done; // degrade gracefully: stories just won't show
  document.head.appendChild(s);
}
