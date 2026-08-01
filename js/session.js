// session.js — Unified Daily Session.
//
// A thin controller ON TOP of the existing modes. Builds one interleaved queue
// of due + new words and dispatches each to a task renderer inside the "Today"
// view. Recognition, recall, listening, tone, and sentence tasks all feed the
// same FSRS card state. Task selection lives in Logic.pickTaskFromState (pure,
// unit-tested).
//
// Reuses globals: filteredWords, getState, schedule, saveSrs, srs,
// recordStudyDay, shuffleArray, randTonePattern, toneSeq, NEW_PER_SESSION,
// speak, escapeHTML, renderDashboard, DB, Logic.

const DAILY_GOAL = 20; // target reviews per session (PRD default)
const NEW_PER_DAY = 12; // hard cap on brand-new words introduced per calendar day

// How many new words were already introduced today (across sessions).
function newIntroducedToday() {
  const d = loadDaily();
  const today = dayStr(Date.now());
  return d.newDay === today ? d.newToday || 0 : 0;
}
function recordNewIntroduced() {
  const d = loadDaily();
  const today = dayStr(Date.now());
  if (d.newDay !== today) {
    d.newDay = today;
    d.newToday = 0;
  }
  d.newToday = (d.newToday || 0) + 1;
  saveDaily(d);
}

// --- small view helpers --------------------------------------------
function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

// Build n answer options: the correct value + (n-1) distractors sampled from
// other words' same field. Shuffled.
function sampleField(word, field, n) {
  const correct = word[field];
  const opts = [correct];
  const pool = DB.words || [];
  let guard = 0;
  while (opts.length < n && guard++ < 800) {
    const cand = pool[Math.floor(Math.random() * pool.length)][field];
    if (cand && !opts.includes(cand)) opts.push(cand);
  }
  shuffleArray(opts);
  return opts;
}

// Generic multiple-choice with immediate feedback: mark correct/wrong, then
// advance. Wrong answers linger a little longer (error-based learning).
function renderMCQ(host, promptHTML, options, correct, isHanzi, onResult) {
  const optsHTML = options
    .map(
      (o) =>
        `<button class="sent-opt${isHanzi ? " hanzi" : ""}" data-v="${escapeHTML(
          o
        )}">${escapeHTML(o)}</button>`
    )
    .join("");
  host.innerHTML = `<div class="session-task">${promptHTML}<div class="sent-options">${optsHTML}</div></div>`;
  let answered = false;
  host.querySelectorAll(".sent-opt").forEach((b) => {
    b.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const ok = b.dataset.v === correct;
      host.querySelectorAll(".sent-opt").forEach((x) => {
        if (x.dataset.v === correct) x.classList.add("correct");
        else if (x === b) x.classList.add("wrong");
        x.disabled = true;
      });
      setTimeout(() => onResult(ok ? "good" : "again"), ok ? 700 : 1500);
    });
  });
}

// --- flashcard renderer (recognition + recall) ---------------------
function renderFlashTask(word, dir, onResult) {
  const host = document.getElementById("todayCard");
  if (!host) return;
  const recall = dir === "recall";
  const front = recall ? escapeHTML(word.english) : word.chinese;
  const hint = recall
    ? "Say the characters, then tap to check"
    : "Tap to reveal pinyin & meaning";
  host.innerHTML = `
    <div class="flashcard" role="button" tabindex="0" aria-label="Flashcard, tap to reveal">
      <div class="zi ${recall ? "recall-prompt" : ""}">${front}</div>
      <div class="prompt-hint hint">${hint}</div>
      <div class="revealed">
        ${recall ? `<div class="zi ans">${word.chinese}</div>` : ""}
        <div class="py">${escapeHTML(word.pinyin)}</div>
        ${recall ? "" : `<div class="en">${escapeHTML(word.english)}</div>`}
        <div class="kh">${escapeHTML(word.khmer || "")}</div>
      </div>
    </div>
    <div class="rating-row" id="todayRating">
      <button class="rate-btn again" data-r="again"><span class="rlabel">Again</span></button>
      <button class="rate-btn hard" data-r="hard"><span class="rlabel">Hard</span></button>
      <button class="rate-btn good" data-r="good"><span class="rlabel">Good</span></button>
      <button class="rate-btn easy" data-r="easy"><span class="rlabel">Easy</span></button>
    </div>`;
  const card = host.querySelector(".flashcard");
  const rating = host.querySelector("#todayRating");
  const flip = () => {
    if (card.classList.contains("flipped")) return;
    card.classList.add("flipped");
    rating.classList.add("show");
    speak(word.chinese);
  };
  card.addEventListener("click", flip);
  card.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      flip();
    }
  });
  rating.querySelectorAll(".rate-btn").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      onResult(b.dataset.r);
    });
  });
}

// --- listening: hear the word, choose the meaning ------------------
function renderListenTask(word, onResult) {
  const host = document.getElementById("todayCard");
  if (!host) return;
  speak(word.chinese);
  const opts = sampleField(word, "english", 4);
  const prompt =
    `<p class="intro-text">Listen and choose the meaning.</p>` +
    `<button class="study-btn" id="replayBtn" type="button">Play again</button>`;
  renderMCQ(host, prompt, opts, word.english, false, onResult);
  const rb = host.querySelector("#replayBtn");
  if (rb)
    rb.addEventListener("click", (e) => {
      e.stopPropagation();
      speak(word.chinese);
    });
}

// --- tone: see the word, choose its tone pattern -------------------
function renderToneTask(word, onResult) {
  const host = document.getElementById("todayCard");
  if (!host) return;
  const seq = toneSeq(word.pinyin);
  const correct = seq.join("-");
  const set = new Set([correct]);
  let guard = 0;
  while (set.size < 4 && guard++ < 60) {
    set.add(randTonePattern(seq.length)); // already "3-1-2" formatted
  }
  const opts = [...set];
  shuffleArray(opts);
  speak(word.chinese);
  const prompt =
    `<div class="tone-zi">${word.chinese}</div>` +
    `<div class="py">${escapeHTML(word.pinyin)}</div>` +
    `<p class="intro-text">What are the tones?</p>`;
  renderMCQ(host, prompt, opts, correct, false, onResult);
}

// --- sentence cloze: fill the blank with the right word ------------
function renderSentenceTask(word, onResult) {
  const host = document.getElementById("todayCard");
  if (!host) return;
  const ex = word.ex_cn || "";
  if (!ex.includes(word.chinese)) {
    renderFlashTask(word, "recognize", onResult); // safe fallback
    return;
  }
  const blanked = ex.split(word.chinese).join("____");
  const opts = sampleField(word, "chinese", 4);
  const prompt =
    `<div class="sent-cn hanzi">${escapeHTML(blanked)}</div>` +
    `<div class="sent-en">${escapeHTML(word.ex_en || word.english)}</div>` +
    `<p class="intro-text">Choose the missing word.</p>`;
  renderMCQ(host, prompt, opts, word.chinese, true, onResult);
}

// --- task registry -------------------------------------------------
const taskRenderers = {
  recognize: { canUse: () => true, render: (w, cb) => renderFlashTask(w, "recognize", cb) },
  recall: { canUse: () => true, render: (w, cb) => renderFlashTask(w, "recall", cb) },
  listen: { canUse: () => true, render: renderListenTask },
  tone: {
    canUse: (w) => toneSeq(w.pinyin || "").length > 0,
    render: renderToneTask,
  },
  sentence: {
    canUse: (w) => !!(w.ex_cn && w.ex_cn.includes(w.chinese)),
    render: renderSentenceTask,
  },
};

// --- task selection (pure logic in Logic.pickTaskFromState) --------
function eligibleTasks(word) {
  const out = ["recognize", "recall", "listen"];
  if (taskRenderers.tone.canUse(word)) out.push("tone");
  if (taskRenderers.sentence.canUse(word)) out.push("sentence");
  return out;
}
function pickTask(word) {
  return Logic.pickTaskFromState(getState(word.id), eligibleTasks(word), Math.random);
}

// --- counts + queue ------------------------------------------------
function countDaily() {
  const now = Date.now();
  let due = 0;
  let fresh = 0;
  for (const w of filteredWords()) {
    const st = getState(w.id);
    if (st.state === "new" || !st.reps) fresh++;
    else if (st.due <= now) due++;
  }
  return { due, fresh };
}

function buildDailyQueue(opts) {
  opts = opts || {};
  const goal = opts.goal || DAILY_GOAL;
  const newCap = opts.newCap != null ? opts.newCap : NEW_PER_SESSION;
  const now = Date.now();
  const due = [];
  const fresh = [];
  for (const w of filteredWords()) {
    const st = getState(w.id);
    if (st.state === "new" || !st.reps) fresh.push(w);
    else if (st.due <= now) due.push(w);
  }
  shuffleArray(due);
  shuffleArray(fresh);
  const dueTake = due.slice(0, goal);
  const room = Math.max(0, goal - dueTake.length); // fewer new when many are due
  const dailyLeft = Math.max(0, NEW_PER_DAY - newIntroducedToday()); // per-day cap
  const newTake = fresh.slice(0, Math.min(newCap, room, dailyLeft));
  const items = dueTake
    .map((w) => ({ word: w, task: pickTask(w) }))
    .concat(newTake.map((w) => ({ word: w, task: "recognize" })));
  shuffleArray(items); // interleave
  return items;
}

// --- session lifecycle ---------------------------------------------
let SESSION = null;

function updateTodayStart() {
  const line = document.getElementById("todaySummaryLine");
  if (!line) return;
  const { due, fresh } = countDaily();
  const newShown = Math.min(fresh, NEW_PER_DAY - newIntroducedToday());
  line.textContent =
    due + newShown === 0
      ? "Nothing due right now — you're all caught up. Learn new words in the tabs, or come back later."
      : `${due} due · ${newShown} new — about ${Math.max(1, Math.round((due + newShown) * 0.15))} min.`;
}

function startDailySession(opts) {
  SESSION = { queue: buildDailyQueue(opts), reviewed: 0, hits: 0 };
  SESSION.total = SESSION.queue.length;
  hide("todayStart");
  if (!SESSION.queue.length) {
    // caught-up empty state (step 7)
    hide("todaySession");
    showCaughtUp();
    return 0;
  }
  hide("todayDone");
  show("todaySession");
  renderCurrentTask();
  return SESSION.queue.length;
}

function showCaughtUp() {
  show("todayDone");
  const title = document.getElementById("todayDoneTitle");
  const line = document.getElementById("todayDoneLine");
  const stats = document.getElementById("todayDoneStats");
  if (title) title.textContent = "All caught up";
  if (line)
    line.textContent =
      "Nothing is due right now. Come back later, or learn new words in the other tabs.";
  if (stats) stats.textContent = "";
  hide("todayMoreBtn");
}

function renderCurrentTask() {
  if (!SESSION) return;
  if (!SESSION.queue.length) {
    endSession();
    return;
  }
  const prog = document.getElementById("todayProgress");
  if (prog) prog.textContent = SESSION.queue.length + " left in this session";
  const item = SESSION.queue[0];
  const r = taskRenderers[item.task] || taskRenderers.recognize;
  r.render(item.word, (rating) => submitSessionAnswer(item, rating));
}

function submitSessionAnswer(item, rating) {
  const wasNew = !(getState(item.word.id).reps || 0); // detect first-ever review
  schedule(item.word.id, rating);
  // remember how we showed it, so pickTask can vary next time
  const st = getState(item.word.id);
  st.lastTask = item.task;
  if (typeof saveSrs === "function") saveSrs(srs);
  recordStudyDay();
  if (wasNew) recordNewIntroduced(); // count toward the per-day new cap
  SESSION.reviewed++;
  if (rating !== "again") SESSION.hits++;
  SESSION.queue.shift();
  if (rating === "again") {
    const pos = Math.min(4, SESSION.queue.length);
    SESSION.queue.splice(pos, 0, item); // see it again this session
  }
  renderCurrentTask();
}

function endSession() {
  hide("todaySession");
  show("todayDone");
  const title = document.getElementById("todayDoneTitle");
  const line = document.getElementById("todayDoneLine");
  const stats = document.getElementById("todayDoneStats");
  const reviewed = SESSION ? SESSION.reviewed : 0;
  const acc = reviewed ? Math.round((SESSION.hits / reviewed) * 100) : 0;
  const streak = (loadDaily().streak) || 0;
  if (title) title.textContent = "Done for today";
  if (line)
    line.textContent =
      "Nice work — come back tomorrow, or keep practicing in the other tabs.";
  if (stats)
    stats.textContent =
      reviewed +
      " reviewed · " +
      acc +
      "% recalled · streak " +
      streak +
      (streak === 1 ? " day" : " days");
  // offer to keep going if there is still work left (goal capped this session)
  const { due, fresh } = countDaily();
  const more = due + Math.min(fresh, NEW_PER_DAY - newIntroducedToday()) > 0;
  const moreBtn = document.getElementById("todayMoreBtn");
  if (moreBtn) moreBtn.classList.toggle("hidden", !more);
  if (typeof renderDashboard === "function") renderDashboard();
}

// --- keyboard shortcuts inside a running session (step 7) ----------
// Flashcard: Space/Enter flips, 1-4 rate. MCQ: 1-4 pick option, Space replays.
document.addEventListener("keydown", (e) => {
  const sess = document.getElementById("todaySession");
  if (!sess || sess.classList.contains("hidden")) return;
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea") return;
  const host = document.getElementById("todayCard");
  if (!host) return;
  const card = host.querySelector(".flashcard");
  if (card) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!card.classList.contains("flipped")) card.click();
      return;
    }
    if (card.classList.contains("flipped") && ["1", "2", "3", "4"].includes(e.key)) {
      const map = { 1: "again", 2: "hard", 3: "good", 4: "easy" };
      const b = host.querySelector(".rate-btn." + map[e.key]);
      if (b) b.click();
    }
    return;
  }
  const opts = host.querySelectorAll(".sent-opt");
  if (opts.length) {
    if (["1", "2", "3", "4"].includes(e.key)) {
      e.preventDefault();
      const b = opts[parseInt(e.key, 10) - 1];
      if (b) b.click();
      return;
    }
    if (e.key === " ") {
      const rb = host.querySelector("#replayBtn");
      if (rb) {
        e.preventDefault();
        rb.click();
      }
    }
  }
});

// --- wiring (elements exist; scripts load at end of body) ----------
(function wireToday() {
  const startBtn = document.getElementById("todayStartBtn");
  if (startBtn) startBtn.addEventListener("click", () => startDailySession());
  const moreBtn = document.getElementById("todayMoreBtn");
  if (moreBtn) moreBtn.addEventListener("click", () => startDailySession());
  const againBtn = document.getElementById("todayAgainBtn");
  if (againBtn)
    againBtn.addEventListener("click", () => {
      hide("todayDone");
      show("todayStart");
      updateTodayStart();
    });
  const todayTab = document.querySelector('[data-view="todayView"]');
  if (todayTab) todayTab.addEventListener("click", updateTodayStart);
  updateTodayStart(); // seed the count on load
})();
