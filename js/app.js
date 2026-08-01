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

function switchView(viewId) {
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  const activeTab = document.querySelector(`[data-view="${viewId}"]`);
  if (activeTab) {
    activeTab.classList.add("active");
    // on mobile the tab row scrolls; keep the active tab visible
    activeTab.scrollIntoView({ inline: "center", block: "nearest" });
  }
  // sync the phone bottom bar
  document.querySelectorAll(".bn-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.bn === viewId);
  });
}
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

// Phone bottom bar: Words / Study / Search
document.querySelectorAll(".bn-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.bn;
    if (target === "search") {
      switchView("wordsView");
      const box = document.getElementById("searchBox");
      if (box) box.focus();
    } else {
      switchView(target);
    }
  });
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
      buildSentPool();
    });
  });
  const next = document.getElementById("sentNext");
  if (next)
    next.addEventListener("click", () => {
      if (!sentPool.length) return;
      sentIndex = (sentIndex + 1) % sentPool.length;
      renderSentence();
    });
  buildSentPool();
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
    b.textContent = o.split("-").join(" – ");
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
        <span class="gram-pat">${g.pat}</span>
        <span class="gram-en">${g.en}</span>
        <span class="gram-badge">${g.tier}</span>
      </div>
      <div class="gram-struct">${g.struct}</div>
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
let currentStudyLevel = "ALL";
let studyMode = "review"; // "review" (SRS due queue) or "browse" (free flip)
let studyDir = "recognize"; // "recognize" (中→meaning) or "recall" (meaning→中)

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

// The FSRS scheduler math lives in js/logic.js (Logic.fsrsUpdate) so it can be
// unit-tested. Here we only read/write the stored card states.
function getState(id) {
  let st = srs[id];
  if (!st)
    return { state: "new", due: 0, S: 0, D: 0, reps: 0, lapses: 0, last: 0 };
  if (st.S === undefined) {
    // migrate old SM-2-lite state so existing progress is not lost
    const iv = st.interval || 0;
    st.S = iv > 0 ? Math.max(0.5, iv) : 0;
    st.D = 5;
    st.last = st.due && iv ? st.due - iv * DAY : 0;
    if (st.state === undefined) st.state = st.reps > 0 ? "review" : "new";
    srs[id] = st;
  }
  return st;
}

function schedule(id, rating) {
  srs[id] = Logic.fsrsUpdate(getState(id), rating, Date.now());
  saveSrs(srs);
}

// dedupe lives in js/logic.js (Logic.dedupeByChinese), unit-tested
function dedupeByChinese(list) {
  return Logic.dedupeByChinese(list);
}
function filteredWords() {
  const base =
    currentStudyLevel === "ALL"
      ? DB.words.slice()
      : DB.words.filter((w) => w.level === currentStudyLevel);
  return dedupeByChinese(base);
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

// Fill the flashcard for one word in the chosen direction.
// recognize: front = characters, reveal = pinyin + meaning + Khmer.
// recall:    front = meaning,    reveal = characters + pinyin + Khmer.
function paintFlashcard(w, dir) {
  const zi = document.getElementById("fc-zi");
  const ans = document.getElementById("fc-answer");
  const hint = document.querySelector("#flashcard .prompt-hint");
  if (dir === "recall") {
    zi.textContent = w.english;
    zi.classList.add("recall-prompt");
    ans.textContent = w.chinese;
    document.getElementById("fc-py").textContent = w.pinyin;
    document.getElementById("fc-en").textContent = "";
    document.getElementById("fc-kh").textContent = w.khmer;
    if (hint) hint.textContent = "Say the characters, then tap to check";
  } else {
    zi.textContent = w.chinese;
    zi.classList.remove("recall-prompt");
    ans.textContent = "";
    document.getElementById("fc-py").textContent = w.pinyin;
    document.getElementById("fc-en").textContent = w.english;
    document.getElementById("fc-kh").textContent = w.khmer;
    if (hint) hint.textContent = "Tap to reveal pinyin, meaning & memory story";
  }
}

function renderBrowseCard() {
  const w = studyList[studyIndex];
  const card = document.getElementById("flashcard");
  card.classList.remove("flipped");
  if (!w) return;
  paintFlashcard(w, "recognize");
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
    const zi = document.getElementById("fc-zi");
    zi.textContent = "完成";
    zi.classList.remove("recall-prompt");
    document.getElementById("fc-answer").textContent = "";
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
  paintFlashcard(w, studyDir);
  document.getElementById("progressNote").textContent =
    "In this session: " + reviewQueue.length + " left";
}

function rateCurrent(rating) {
  if (studyMode !== "review" || reviewQueue.length === 0) return;
  const w = reviewQueue.shift();
  schedule(w.id, rating);
  recordStudyDay();
  if (rating === "again") {
    const pos = Math.min(4, reviewQueue.length);
    reviewQueue.splice(pos, 0, w); // repeat later this session
  }
  renderReviewCard();
  renderDashboard();
}

// ---- Daily dashboard (streak, goal, stats) ----
const DAILY_KEY = "cml_daily_v1";
function dayStr(ts) {
  const d = new Date(ts);
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
function loadDaily() {
  try {
    return JSON.parse(localStorage.getItem(DAILY_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveDaily(d) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(d));
  } catch (e) {
    /* private mode */
  }
}
function recordStudyDay() {
  const d = loadDaily();
  const today = dayStr(Date.now());
  if (d.lastDay === today) {
    d.todayCount = (d.todayCount || 0) + 1;
  } else {
    const y = dayStr(Date.now() - DAY);
    d.streak = d.lastDay === y ? (d.streak || 0) + 1 : 1;
    d.lastDay = today;
    d.todayCount = 1;
  }
  if (!d.goal) d.goal = 20;
  saveDaily(d);
}
function renderDashboard() {
  const streakEl = document.getElementById("dashStreak");
  if (!streakEl) return;
  const d = loadDaily();
  const today = dayStr(Date.now());
  const y = dayStr(Date.now() - DAY);
  const goal = d.goal || 20;
  const liveStreak =
    d.lastDay === today || d.lastDay === y ? d.streak || 0 : 0;
  const todayCount = d.lastDay === today ? d.todayCount || 0 : 0;
  const now = Date.now();
  const distinct = dedupeByChinese(DB.words);
  let learned = 0,
    due = 0;
  for (const w of distinct) {
    const st = getState(w.id);
    if (st.reps > 0) learned++;
    if (st.state !== "new" && st.due <= now) due++;
  }
  streakEl.textContent = liveStreak;
  document.getElementById("dashToday").textContent = todayCount + " / " + goal;
  document.getElementById("dashLearned").textContent =
    learned + " / " + distinct.length;
  document.getElementById("dashDue").textContent = due;
  const pct = Math.min(100, Math.round((todayCount / goal) * 100));
  document.getElementById("dashBar").style.width = pct + "%";
  const goalInput = document.getElementById("dashGoal");
  if (goalInput && document.activeElement !== goalInput) goalInput.value = goal;
}
function initDashboard() {
  const goalInput = document.getElementById("dashGoal");
  if (goalInput)
    goalInput.addEventListener("change", () => {
      let v = parseInt(goalInput.value, 10);
      if (isNaN(v) || v < 5) v = 5;
      if (v > 200) v = 200;
      const d = loadDaily();
      d.goal = v;
      saveDaily(d);
      renderDashboard();
    });
  renderDashboard();
}

// --- Listening practice ---
let listenLevel = "ALL";
let listenPool = [];
let listenIndex = 0;
let listenCorrect = 0;
let listenTotal = 0;
let listenAnswered = false;

function buildListenPool() {
  const words =
    listenLevel === "ALL"
      ? DB.words
      : DB.words.filter((w) => w.level === listenLevel);
  listenPool = words.slice();
  shuffleArray(listenPool);
  listenIndex = 0;
  listenCorrect = 0;
  listenTotal = 0;
  renderListen();
}

function updateListenScore() {
  const el = document.getElementById("listenScore");
  if (el)
    el.textContent =
      "Correct " + listenCorrect + " / " + listenTotal;
}

function renderListen() {
  const revealEl = document.getElementById("listenReveal");
  const optWrap = document.getElementById("listenOptions");
  const nextBtn = document.getElementById("listenNext");
  if (!optWrap) return;
  nextBtn.classList.add("hidden");
  revealEl.classList.remove("show");
  optWrap.innerHTML = "";
  const ln = document.getElementById("listenNote");
  if (ln) ln.textContent = "";
  if (!listenPool.length) {
    revealEl.classList.add("show");
    document.getElementById("listenZi").textContent = "—";
    document.getElementById("listenPy").textContent = "";
    document.getElementById("listenEn").textContent =
      "No words for this level.";
    updateListenScore();
    return;
  }
  const w = listenPool[listenIndex];
  document.getElementById("listenZi").textContent = "？";
  document.getElementById("listenPy").textContent = "";
  document.getElementById("listenEn").textContent = "";
  listenAnswered = false;
  // english options
  const others = listenPool.filter((x) => x.english !== w.english);
  shuffleArray(others);
  const opts = [w.english];
  for (const o of others) {
    if (opts.length >= 4) break;
    if (!opts.includes(o.english)) opts.push(o.english);
  }
  shuffleArray(opts);
  for (const o of opts) {
    const b = document.createElement("button");
    b.className = "listen-opt";
    b.textContent = o;
    b.addEventListener("click", () => chooseListen(b, o, w));
    optWrap.appendChild(b);
  }
  updateListenScore();
  speak(w.chinese);
}

function chooseListen(btn, choice, w) {
  if (listenAnswered) return;
  listenAnswered = true;
  listenTotal++;
  if (choice === w.english) {
    listenCorrect++;
    btn.classList.add("correct");
  } else {
    btn.classList.add("wrong");
    document.querySelectorAll(".listen-opt").forEach((bb) => {
      if (bb.textContent === w.english) bb.classList.add("correct");
    });
    demoteToReview(w.id, "listenNote");
  }
  const revealEl = document.getElementById("listenReveal");
  document.getElementById("listenZi").textContent = w.chinese;
  document.getElementById("listenPy").textContent = w.pinyin;
  document.getElementById("listenEn").textContent = w.english;
  revealEl.classList.add("show");
  document.getElementById("listenNext").classList.remove("hidden");
  updateListenScore();
}

function initListen() {
  document.querySelectorAll(".listen-filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".listen-filter-chip")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      listenLevel = btn.dataset.level;
      buildListenPool();
    });
  });
  const replay = document.getElementById("listenReplay");
  if (replay)
    replay.addEventListener("click", () => {
      if (listenPool.length) speak(listenPool[listenIndex].chinese);
    });
  const next = document.getElementById("listenNext");
  if (next)
    next.addEventListener("click", () => {
      if (!listenPool.length) return;
      listenIndex = (listenIndex + 1) % listenPool.length;
      renderListen();
    });
  buildListenPool();
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
  document
    .getElementById("dirToggle")
    .classList.toggle("hidden", mode !== "review");
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

function setStudyDir(dir) {
  studyDir = dir;
  document
    .getElementById("dir-recognize")
    .classList.toggle("active", dir === "recognize");
  document
    .getElementById("dir-recall")
    .classList.toggle("active", dir === "recall");
  // re-paint the current card without losing the queue or its schedule
  const card = document.getElementById("flashcard");
  card.classList.remove("flipped");
  document.getElementById("ratingRow").classList.remove("show");
  if (studyMode === "review") {
    if (reviewQueue.length) paintFlashcard(reviewQueue[0], studyDir);
  } else if (studyList[studyIndex]) {
    paintFlashcard(studyList[studyIndex], "recognize");
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
document.getElementById("dir-recognize").addEventListener("click", () => setStudyDir("recognize"));
document.getElementById("dir-recall").addEventListener("click", () => setStudyDir("recall"));

// custom audio voice picker
function voiceMenuEl() {
  return document.getElementById("voiceMenu");
}
function voiceMenuOpen() {
  return !voiceMenuEl().hasAttribute("hidden");
}
function openVoiceMenu() {
  voiceMenuEl().removeAttribute("hidden");
  document.getElementById("voiceCurrent").setAttribute("aria-expanded", "true");
  const cur = voiceMenuEl().querySelector('[aria-selected="true"]');
  if (cur) cur.classList.add("active");
}
function closeVoiceMenu() {
  voiceMenuEl().setAttribute("hidden", "");
  document.getElementById("voiceCurrent").setAttribute("aria-expanded", "false");
  voiceMenuEl()
    .querySelectorAll(".active")
    .forEach((o) => o.classList.remove("active"));
}
function selectVoice(uri) {
  chosenVoiceURI = uri;
  try {
    localStorage.setItem(VOICE_KEY, uri);
  } catch (err) {}
  updateVoiceUI();
  closeVoiceMenu();
  document.getElementById("voiceCurrent").focus();
}
document.getElementById("voiceCurrent").addEventListener("click", () => {
  if (voiceMenuOpen()) closeVoiceMenu();
  else openVoiceMenu();
});
voiceMenuEl().addEventListener("click", (e) => {
  const opt = e.target.closest(".voice-opt");
  if (opt) selectVoice(opt.dataset.uri);
});
// keyboard nav inside the picker (stopPropagation so Study shortcuts don't fire)
document.getElementById("voicePicker").addEventListener("keydown", (e) => {
  const opts = Array.from(voiceMenuEl().querySelectorAll(".voice-opt"));
  if (["ArrowDown", "ArrowUp", "Enter", " ", "Escape"].includes(e.key))
    e.stopPropagation();
  if (e.key === "Escape") {
    if (voiceMenuOpen()) {
      e.preventDefault();
      closeVoiceMenu();
      document.getElementById("voiceCurrent").focus();
    }
    return;
  }
  if ((e.key === "Enter" || e.key === " ") && !voiceMenuOpen()) {
    e.preventDefault();
    openVoiceMenu();
    return;
  }
  if (!voiceMenuOpen()) return;
  let i = opts.findIndex((o) => o.classList.contains("active"));
  if (e.key === "ArrowDown") {
    e.preventDefault();
    i = (i + 1) % opts.length;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    i = (i - 1 + opts.length) % opts.length;
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (opts[i]) selectVoice(opts[i].dataset.uri);
    return;
  } else {
    return;
  }
  opts.forEach((o) => o.classList.remove("active"));
  if (opts[i]) {
    opts[i].classList.add("active");
    opts[i].scrollIntoView({ block: "nearest" });
  }
});
// click outside closes the menu
document.addEventListener("click", (e) => {
  if (voiceMenuOpen() && !e.target.closest("#voicePicker")) closeVoiceMenu();
});
document.getElementById("voiceTest").addEventListener("click", () => speak("你好"));

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

// ---- Welcome / help dialog (first run, reopen with ?) ----
const WELCOME_KEY = "cml_seen_welcome_v1";
let lastWelcomeFocus = null;
function showWelcome() {
  lastWelcomeFocus = document.activeElement;
  const w = document.getElementById("welcome");
  w.classList.add("show");
  const start = document.getElementById("welcomeStart");
  if (start) start.focus();
}
function hideWelcome() {
  document.getElementById("welcome").classList.remove("show");
  try {
    localStorage.setItem(WELCOME_KEY, "1");
  } catch (e) {}
  if (lastWelcomeFocus && lastWelcomeFocus.focus) lastWelcomeFocus.focus();
}
function welcomeIsOpen() {
  return document.getElementById("welcome").classList.contains("show");
}
function initWelcome() {
  let seen = false;
  try {
    seen = localStorage.getItem(WELCOME_KEY) === "1";
  } catch (e) {}
  if (!seen) showWelcome();
  document.getElementById("welcomeStart").addEventListener("click", () => {
    hideWelcome();
    switchView("studyView");
    setStudyMode("review");
  });
  document
    .getElementById("welcomeClose")
    .addEventListener("click", hideWelcome);
  document.getElementById("welcomeX").addEventListener("click", hideWelcome);
  document.getElementById("helpBtn").addEventListener("click", showWelcome);
}

// ---- Keyboard shortcuts + dialog Escape/focus-trap ----
document.addEventListener("keydown", (e) => {
  // 1) welcome dialog has priority
  if (welcomeIsOpen()) {
    if (e.key === "Escape") hideWelcome();
    else if (e.key === "Tab")
      trapFocus(document.querySelector("#welcome .welcome-card"), e);
    return;
  }
  // 2) detail overlay
  if (overlayIsOpen()) {
    if (e.key === "Escape") closeDetail();
    else if (e.key === "Tab")
      trapFocus(document.querySelector("#overlay .detail-card"), e);
    return;
  }
  // 3) Study Mode shortcuts (only when not typing in a field)
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return;
  if (!document.getElementById("studyView").classList.contains("active")) return;
  const card = document.getElementById("flashcard");
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    card.click(); // flip (reuses existing flip logic)
  } else if (["1", "2", "3", "4"].includes(e.key)) {
    if (studyMode === "review" && card.classList.contains("flipped")) {
      const map = { 1: "again", 2: "hard", 3: "good", 4: "easy" };
      rateCurrent(map[e.key]);
    }
  } else if (e.key === "ArrowRight" && studyMode === "browse") {
    const b = document.getElementById("nextBtn");
    if (b) b.click();
  } else if (e.key === "ArrowLeft" && studyMode === "browse") {
    const b = document.getElementById("prevBtn");
    if (b) b.click();
  }
});

// init
initTheme();
initWelcome();
updateVoiceUI();
buildCharIndex();
renderGrid();
renderPatterns();
initRadicalFilter();
renderStructures();
renderGrammar();
initSentences();
initListen();
initTone();
initDashboard();
setStudyMode("review");
renderWritingWord();
