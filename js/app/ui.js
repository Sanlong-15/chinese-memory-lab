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

// ---- Backup / restore all progress (localStorage) ----
const BACKUP_KEYS = [
  "cml_srs_v1", // spaced-repetition state (the important one)
  "cml_daily_v1", // streak + daily stats
  "cml_theme", // day/night preference
  "cml_voice", // chosen audio voice
  "cml_seen_welcome_v1", // welcome-seen flag
];
function exportProgress() {
  const out = {
    app: "character-memory-lab",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {},
  };
  BACKUP_KEYS.forEach((k) => {
    const v = localStorage.getItem(k);
    if (v !== null) out.data[k] = v;
  });
  const blob = new Blob([JSON.stringify(out, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const stamp =
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0");
  const a = document.createElement("a");
  a.href = url;
  a.download = "memory-lab-backup-" + stamp + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function importProgress(file) {
  const reader = new FileReader();
  reader.onerror = () => alert("Could not read that file.");
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (e) {
      alert("That file is not a valid backup (could not read it).");
      return;
    }
    if (!parsed || parsed.app !== "character-memory-lab" || !parsed.data) {
      alert("That does not look like a Memory Lab backup file.");
      return;
    }
    let cards = 0;
    try {
      cards = Object.keys(JSON.parse(parsed.data["cml_srs_v1"] || "{}")).length;
    } catch (e) {}
    const when = parsed.exportedAt ? " saved " + parsed.exportedAt.slice(0, 10) : "";
    if (
      !confirm(
        "Restore this backup?" +
          when +
          "\n\nIt will REPLACE your current progress on this device (" +
          cards +
          " cards in the file). This cannot be undone.\n\nTip: use Backup first if you want to keep what you have now."
      )
    )
      return;
    BACKUP_KEYS.forEach((k) => {
      if (k in parsed.data) localStorage.setItem(k, parsed.data[k]);
    });
    alert("Progress restored. The page will reload now.");
    location.reload();
  };
  reader.readAsText(file);
}
document.getElementById("exportBtn").addEventListener("click", exportProgress);
document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importFile").click();
});
document.getElementById("importFile").addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) importProgress(f);
  e.target.value = ""; // allow re-picking the same file later
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
  const helpBtn2 = document.getElementById("helpBtn2");
  if (helpBtn2) helpBtn2.addEventListener("click", showWelcome);
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
