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

function openDetail(id) {
  const w = DB.words.find((x) => x.id === id);
  if (!w) return;
  const uniqueChars = [...new Set(w.chars)];
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
    <div class="section-label">Example</div>
    <div class="example-box">
      <div class="cn">${w.ex_cn} <button class="speak-btn small" data-speak="${w.ex_cn}" title="Play sentence">🔊</button></div>
      <div class="py">${w.ex_py}</div>
      <div class="en">${w.ex_en}</div>
    </div>
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

  const radWrap = document.getElementById("radicalGroupsWrap");
  const radicalGroups = DB.radicalGroups || [];
  radWrap.innerHTML = radicalGroups
    .map(
      (g) => `
    <div class="radical-group">
      <span class="rad-tag">${g.radical}</span> — <span style="font-size:12.5px;color:var(--ink-soft);">${g.meaning}</span>
      <div class="rad-members">${g.members.join(" ")}</div>
    </div>
  `,
    )
    .join("");
}

// --- Study mode ---
let currentStudyLevel = "ALL";
let studyList = (DB.words || []).slice();
let studyIndex = 0;

function buildStudyList() {
  studyList =
    currentStudyLevel === "ALL"
      ? DB.words.slice()
      : DB.words.filter((w) => w.level === currentStudyLevel);
  studyIndex = 0;
  renderFlashcard();
}
document.querySelectorAll(".study-filter-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".study-filter-chip")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentStudyLevel = btn.dataset.level;
    buildStudyList();
  });
});

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderFlashcard() {
  const w = studyList[studyIndex];
  const card = document.getElementById("flashcard");
  card.classList.remove("flipped");
  document.getElementById("fc-zi").textContent = w.chinese;
  document.getElementById("fc-py").textContent = w.pinyin;
  document.getElementById("fc-en").textContent = w.english;
  document.getElementById("fc-kh").textContent = w.khmer;
  document.getElementById("progressNote").textContent =
    studyIndex + 1 + " / " + studyList.length;
}
document.getElementById("flashcard").addEventListener("click", () => {
  const card = document.getElementById("flashcard");
  card.classList.toggle("flipped");
  if (card.classList.contains("flipped")) {
    speak(studyList[studyIndex].chinese);
  }
});
document.getElementById("nextBtn").addEventListener("click", () => {
  studyIndex = (studyIndex + 1) % studyList.length;
  renderFlashcard();
});
document.getElementById("prevBtn").addEventListener("click", () => {
  studyIndex = (studyIndex - 1 + studyList.length) % studyList.length;
  renderFlashcard();
});
document.getElementById("shuffleBtn").addEventListener("click", () => {
  shuffleArray(studyList);
  studyIndex = 0;
  renderFlashcard();
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
  document.getElementById("wr-ex-cn").textContent = w.ex_cn;
  document.getElementById("wr-ex-py").textContent = w.ex_py;
  document.getElementById("wr-ex-en").textContent = w.ex_en;
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
renderFlashcard();
renderWritingWord();
