let currentLevel = "ALL";
let currentSearch = "";

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
      width: 110,
      height: 110,
      padding: 6,
      showCharacter: false,
      showOutline: true,
      strokeColor: "#2A2622",
      outlineColor: "#DDD2BC",
      highlightColor: "#3F6F5E",
      drawingColor: "#AE3428",
      onLoadCharDataError: () => {
        box.innerHTML =
          '<p class="writing-error-note" style="padding:10px;max-width:110px;">No stroke data for ' +
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

// --- Speaking practice ---
const SpeechRecognitionAPI =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const hasSpeechRecognition = !!SpeechRecognitionAPI;
const hasRecording = !!(navigator.mediaDevices && window.MediaRecorder);

let currentSpeakingLevel = "ALL";
let speakingList = (DB.words || []).slice();
let speakingIndex = 0;
let recognition = null;
let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let lastRecordingUrl = null;

if (hasSpeechRecognition) {
  recognition = new SpeechRecognitionAPI();
  recognition.lang = "zh-CN";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

function normalizeZh(s) {
  return (s || "").replace(/[，,。.!！?？\s]/g, "");
}

function buildSpeakingList() {
  speakingList =
    currentSpeakingLevel === "ALL"
      ? DB.words.slice()
      : DB.words.filter((w) => w.level === currentSpeakingLevel);
  speakingIndex = 0;
  renderSpeakingWord();
}

function renderSpeakingWord() {
  const w = speakingList[speakingIndex];
  document.getElementById("sp-zi").textContent = w.chinese;
  document.getElementById("sp-py").textContent = w.pinyin;
  document.getElementById("sp-en").textContent = w.english;
  document.getElementById("sp-kh").textContent = w.khmer;
  document.getElementById("sp-ex-cn").textContent = w.ex_cn;
  document.getElementById("sp-ex-py").textContent = w.ex_py;
  document.getElementById("sp-ex-en").textContent = w.ex_en;
  document.getElementById("spResult").textContent = "";
  document.getElementById("spPlayBtn").disabled = true;
  document.getElementById("speakingProgress").textContent =
    speakingIndex + 1 + " / " + speakingList.length;
  if (lastRecordingUrl) {
    URL.revokeObjectURL(lastRecordingUrl);
    lastRecordingUrl = null;
  }
}

function stopMicStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
}

async function startRecordingForPlayback() {
  if (!hasRecording) return;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, {
        type: mediaRecorder.mimeType || "audio/webm",
      });
      if (lastRecordingUrl) URL.revokeObjectURL(lastRecordingUrl);
      lastRecordingUrl = URL.createObjectURL(blob);
      document.getElementById("spPlayBtn").disabled = false;
      stopMicStream();
    };
    mediaRecorder.start();
  } catch (err) {
    document.getElementById("spResult").textContent =
      "Microphone permission is needed to record.";
  }
}

function stopRecordingForPlayback() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  } else {
    stopMicStream();
  }
}

const speakingErrorMessages = {
  "no-speech": "Didn't catch any speech — try again and speak right after clicking.",
  "audio-capture": "No microphone found. Check your mic is connected and allowed.",
  "not-allowed": "Microphone access was blocked. Allow the mic for this page and try again.",
  network:
    "Network error reaching the speech service. Check your internet connection and try again.",
  "service-not-allowed": "The speech service refused the request. Try again in a moment.",
  aborted: "Recording was stopped before finishing. Try again.",
};

function runRecognitionAttempt(w, isRetry) {
  let settled = false;

  recognition.onstart = () => {
    // Only grab the mic for playback recording once recognition itself
    // has actually started, so the two don't race for the microphone at
    // the exact same instant.
    startRecordingForPlayback();
  };
  recognition.onresult = (event) => {
    settled = true;
    const transcriptRaw = event.results[0][0].transcript;
    const transcript = normalizeZh(transcriptRaw);
    const target = normalizeZh(w.chinese);
    const isMatch = transcript === target || transcript.includes(target);
    document.getElementById("spResult").innerHTML = isMatch
      ? "✅ Nice — recognized: “" + transcriptRaw + "”"
      : "❌ Heard: “" +
        transcriptRaw +
        "” — target was " +
        w.chinese +
        ". Try again.";
  };
  recognition.onerror = (event) => {
    settled = true;
    // "network" errors are often a one-off glitch (or the very first call
    // warming up the connection) — auto-retry once before showing an error.
    if (event.error === "network" && !isRetry) {
      document.getElementById("spResult").textContent =
        "Network hiccup, retrying...";
      stopRecordingForPlayback();
      setTimeout(() => runRecognitionAttempt(w, true), 400);
      return;
    }
    document.getElementById("spResult").textContent =
      speakingErrorMessages[event.error] ||
      "Could not hear you (" + event.error + "). Try again.";
    document.getElementById("spRecordBtn").disabled = false;
  };
  recognition.onend = () => {
    stopRecordingForPlayback();
    document.getElementById("spRecordBtn").disabled = false;
    if (!settled) {
      document.getElementById("spResult").textContent =
        "No result — try again.";
    }
  };
  recognition.start();
}

function startSpeakingAttempt() {
  const w = speakingList[speakingIndex];
  document.getElementById("spRecordBtn").disabled = true;
  document.getElementById("spResult").textContent = hasSpeechRecognition
    ? "Listening..."
    : "Recording (recognition not supported in this browser)...";

  if (!hasSpeechRecognition) {
    // No recognition available: just record for playback, stop after 3 seconds.
    startRecordingForPlayback();
    setTimeout(() => {
      stopRecordingForPlayback();
      document.getElementById("spRecordBtn").disabled = false;
      document.getElementById("spResult").textContent =
        "Recorded. Play it back and compare it yourself to the reference audio.";
    }, 3000);
    return;
  }

  runRecognitionAttempt(w, false);
}

document.querySelectorAll(".speaking-filter-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".speaking-filter-chip")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentSpeakingLevel = btn.dataset.level;
    buildSpeakingList();
  });
});
document.getElementById("spListenBtn").addEventListener("click", () => {
  speak(speakingList[speakingIndex].chinese);
});
document.getElementById("spRecordBtn").addEventListener("click", () => {
  startSpeakingAttempt();
});
document.getElementById("spPlayBtn").addEventListener("click", () => {
  if (lastRecordingUrl) new Audio(lastRecordingUrl).play();
});
document.getElementById("spNextBtn").addEventListener("click", () => {
  speakingIndex = (speakingIndex + 1) % speakingList.length;
  renderSpeakingWord();
});
document.getElementById("spPrevBtn").addEventListener("click", () => {
  speakingIndex =
    (speakingIndex - 1 + speakingList.length) % speakingList.length;
  renderSpeakingWord();
});
document.getElementById("spShuffleBtn").addEventListener("click", () => {
  shuffleArray(speakingList);
  speakingIndex = 0;
  renderSpeakingWord();
});

if (!hasSpeechRecognition) {
  const note = document.getElementById("spSupportNote");
  note.textContent = hasRecording
    ? "Automatic recognition isn't supported in this browser (try Chrome or Edge). You can still record yourself and compare by ear."
    : "This browser doesn't support speech recognition or recording. Try Chrome or Edge.";
  note.style.display = "block";
  if (!hasRecording) {
    document.getElementById("spRecordBtn").disabled = true;
  }
}

// init
renderGrid();
renderPatterns();
renderFlashcard();
renderWritingWord();
renderSpeakingWord();
