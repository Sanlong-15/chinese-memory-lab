let currentLevel = "ALL";
let currentSearch = "";
const wordImageCache = {};

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
  if (currentLevel !== "ALL" && w.level !== currentLevel) {
    return false;
  }
  if (currentSearch) {
    const s = currentSearch.toLowerCase();
    const sp = normPinyin(currentSearch); // tone/space-insensitive query
    return (
      w.chinese.includes(currentSearch) ||
      (sp && normPinyin(w.pinyin).includes(sp)) ||
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
    <div class="word-card" data-id="${w.id}" role="button" tabindex="0" aria-label="${w.chinese}, ${w.pinyin}, ${w.english}. Open details.">
      <div class="zi">${w.chinese}</div>
      <div class="py">${w.pinyin}</div>
      <div class="en">${w.english}</div>
      <div class="level-tag">${w.level}</div>
    </div>
  `,
    )
    .join("");
  grid.querySelectorAll(".word-card").forEach((card) => {
    const open = () => {
      const id = parseInt(card.dataset.id, 10);
      const w = (DB.words || []).find((x) => x.id === id);
      if (w) speak(w.chinese);
      openDetail(id);
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
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
      <div class="cn">${ex.cn} <button class="speak-btn small" data-speak="${ex.cn}" title="Play sentence">🔊</button></div>
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
  s.src = "js/examples.js?v=40";
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
