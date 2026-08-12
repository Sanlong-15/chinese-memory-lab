let currentStudyLevel = "ALL";
let studyMode = "review"; // "review" (SRS due queue) or "browse" (free flip)
let studyDir = "recognize"; // "recognize" (中→meaning) or "recall" (meaning→中)

// browse-mode state
let studyList = (DB.words || []).slice();
let studyIndex = 0;

// review-mode state
let reviewQueue = [];
const NEW_PER_SESSION = 15;
// SRS storage, card state, and the daily log live in domain/srs.js
// (DAY, getState, schedule, loadDaily, dayStr, recordStudyDay, ...).

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
  // Browse is for reading, so show the pinyin on the front too (before flip).
  const fp = document.getElementById("fc-front-py");
  if (fp) fp.textContent = w.pinyin;
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
  // review is a recall test — never reveal pinyin on the front
  const fp = document.getElementById("fc-front-py");
  if (fp) fp.textContent = "";
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
// The daily-log storage (DAILY_KEY, dayStr, loadDaily, recordStudyDay, ...)
// lives in domain/srs.js. This is just the rendering.
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

  renderRetention(distinct, now);
  if (typeof renderCourseProgressCard === "function") renderCourseProgressCard();
  if (typeof renderLearningSummary === "function") renderLearningSummary();
  if (typeof renderLearningInsights === "function") renderLearningInsights();
  if (typeof renderSkillScores === "function") renderSkillScores();
  if (typeof renderReviewAnalytics === "function") renderReviewAnalytics();
}

// Average predicted retention + a short "words to watch" list.
function renderRetention(distinct, now) {
  const gauge = document.getElementById("retGauge");
  const numEl = document.getElementById("retNum");
  if (!gauge || !numEl) return;

  let sum = 0,
    n = 0;
  const weak = [];
  for (const w of distinct) {
    const st = getState(w.id);
    if (!(st.reps > 0) || !st.S) continue;
    sum += Logic.recallProb(st, now);
    n++;
    // "weak" = hard cards or ones you've forgotten before
    if ((st.D || 0) >= 7 || (st.lapses || 0) >= 1) {
      weak.push({ w, D: st.D || 0, lapses: st.lapses || 0 });
    }
  }

  const pct = n ? Math.round((sum / n) * 100) : 0;
  numEl.textContent = n ? pct + "%" : "–";
  gauge.style.setProperty("--pct", n ? pct : 0);

  const desc = document.getElementById("retDesc");
  if (desc && n) {
    desc.textContent =
      pct >= 90
        ? "Strong. You're holding your words well — keep the daily habit."
        : pct >= 75
          ? "Good. A few words are slipping; today's review will catch them."
          : "Some words are fading. A review session now will pull this back up.";
  }

  // top weak words: hardest first, then most-forgotten
  weak.sort((a, b) => b.D - a.D || b.lapses - a.lapses);
  const top = weak.slice(0, 8);
  const panel = document.getElementById("weakPanel");
  const list = document.getElementById("weakList");
  if (!panel || !list) return;
  if (!top.length) {
    panel.hidden = true;
    list.innerHTML = "";
    return;
  }
  panel.hidden = false;
  list.innerHTML = top
    .map(
      (it) =>
        `<button class="weak-item" data-speak="${escapeHTML(it.w.chinese)}">` +
        `<span class="weak-zi hanzi">${escapeHTML(it.w.chinese)}</span>` +
        `<span class="weak-py">${escapeHTML(it.w.pinyin || "")}</span>` +
        `<span class="weak-en">${escapeHTML(it.w.english || "")}</span>` +
        `</button>`
    )
    .join("");
  list.querySelectorAll(".weak-item").forEach((b) => {
    b.addEventListener("click", () => speak(b.dataset.speak));
  });
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
// Filter menu: collapsed trigger + popover holding the level chips
(function wireStudyFilter() {
  const trigger = document.getElementById("studyFilterTrigger");
  const pop = document.getElementById("studyFilterPop");
  const lbl = document.getElementById("studyFilterLbl");
  const menu = document.getElementById("studyFilterMenu");
  if (!trigger || !pop) return;
  const closeMenu = () => {
    pop.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  };
  const openMenu = () => {
    pop.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  };
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    pop.hidden ? openMenu() : closeMenu();
  });
  document.addEventListener("click", (e) => {
    if (!pop.hidden && !menu.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !pop.hidden) closeMenu();
  });
  document.querySelectorAll(".study-filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".study-filter-chip")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentStudyLevel = btn.dataset.level;
      lbl.textContent = btn.dataset.level === "ALL" ? "All levels" : btn.textContent;
      closeMenu();
      refreshStudy();
    });
  });
})();

document.getElementById("mode-review").addEventListener("click", () => setStudyMode("review"));
document.getElementById("mode-browse").addEventListener("click", () => setStudyMode("browse"));
document.getElementById("dir-recognize").addEventListener("click", () => setStudyDir("recognize"));
document.getElementById("dir-recall").addEventListener("click", () => setStudyDir("recall"));
