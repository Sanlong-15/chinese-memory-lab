// features/course/course.js
// Guided course: map (per path) -> lesson player -> quiz -> mastery gate.
// Lessons are generated at runtime from the word list; only authored lessons
// live in data/course.js. Reuses DB, charStoryHTML, exampleBoxHTML, speak,
// sampleField, renderMCQ. Lesson mastery is stored separately; FSRS untouched.

const COURSE_KEY = "cml_course_v1";
let _coursePathId = null; // which path the map is showing
const _pathCache = {};

// Aggregate mastery across every path — used by the Progress (Track) screen.
function courseMasteryStats() {
  const prog = loadCourseProgress();
  let mastered = 0,
    total = 0;
  COURSE.paths.forEach((p) => {
    pathLessons(p).forEach((l) => {
      total++;
      if (prog[l.id] && prog[l.id].status === "mastered") mastered++;
    });
  });
  return { mastered, total };
}

// Small card shown on the Progress screen so the Course pillar feeds Track.
function renderCourseProgressCard() {
  const host = document.getElementById("courseProgressCard");
  if (!host || typeof COURSE === "undefined") return;
  const { mastered, total } = courseMasteryStats();
  const pct = total ? Math.round((mastered / total) * 100) : 0;
  host.innerHTML = `
    <div class="course-track">
      <div class="course-track-main">
        <div class="course-track-title">Course progress</div>
        <div class="course-track-sub">${mastered} of ${total} lessons mastered</div>
        <div class="course-track-bar"><div class="course-track-fill" style="width:${pct}%"></div></div>
      </div>
      <button class="study-btn" id="courseTrackGo">Open course</button>
    </div>`;
  const go = host.querySelector("#courseTrackGo");
  if (go)
    go.addEventListener("click", () => {
      if (typeof switchView === "function") switchView("courseView");
    });
}

// ---- Adaptive plan: what should the student do today? ----
// Composes REAL signals already tracked: course position, FSRS due load, the
// weakest measured skill, and whether a lesson is being struggled with. It never
// invents targets — items only appear when there is real data behind them.

// The next lesson to learn: first unlocked-but-unmastered lesson across paths.
function resumeLesson() {
  if (typeof COURSE === "undefined") return null;
  for (const p of COURSE.paths) {
    const r = pathLessons(p).find((l) => courseLessonStatus(p, l.id) === "available");
    if (r) return r;
  }
  return null;
}
// A lesson the learner attempted but didn't pass — its previous lesson is the
// prerequisite to revisit.
function strugglingLesson() {
  if (typeof COURSE === "undefined") return null;
  const prog = loadCourseProgress();
  for (const p of COURSE.paths) {
    const lessons = pathLessons(p);
    for (let i = 0; i < lessons.length; i++) {
      const st = prog[lessons[i].id];
      const thr = (lessons[i].mastery && lessons[i].mastery.threshold) || 0.8;
      if (st && st.status === "inProgress" && st.score > 0 && st.score < thr) {
        return { lesson: lessons[i], prev: i > 0 ? lessons[i - 1] : null };
      }
    }
  }
  return null;
}

const PLAN_SKILL = {
  tones: ["tone", "Tone practice", "🎵"],
  listening: ["listen", "Listening practice", "🎧"],
  typing: ["typing", "Pinyin practice", "⌨️"],
  sentences: ["order", "Sentence practice", "💬"],
  reading: ["recognize", "Vocabulary practice", "📖"],
};

function buildTodayPlan() {
  const plan = [];
  // 1. Reviews that are actually due (FSRS) come first.
  const cd = typeof countDaily === "function" ? countDaily() : { due: 0, fresh: 0 };
  if (cd.due > 0)
    plan.push({
      kind: "review",
      icon: "🔁",
      title: "Review due cards",
      detail: cd.due + (cd.due === 1 ? " card" : " cards"),
      count: cd.due,
      minPer: 0.15,
      action: "session",
    });
  // 2. Extra practice for the weakest measured skill (only if genuinely weak).
  const weak = typeof weakestSkill === "function" ? weakestSkill(8) : null;
  if (weak && PLAN_SKILL[weak]) {
    const acc = Math.round((skillAccuracy(weak) || 0) * 100);
    if (acc < 85) {
      const m = PLAN_SKILL[weak];
      plan.push({
        kind: "practice",
        icon: m[2],
        title: m[1],
        detail: acc + "% — your weakest skill",
        count: 5,
        minPer: 0.25,
        action: "practice",
        mode: m[0],
      });
    }
  }
  // 3. Learn the next lesson (never a mastered one).
  const next = resumeLesson();
  if (next)
    plan.push({
      kind: "learn",
      icon: "📚",
      title: "Learn Lesson " + next.index,
      detail: next.title + " · " + next.wordIds.length + " words",
      count: next.wordIds.length,
      minPer: 0.6,
      action: "lesson",
      lessonId: next.id,
    });
  // 4. If a lesson is being struggled with, revisit its prerequisite first.
  const stuck = strugglingLesson();
  if (stuck && stuck.prev)
    plan.push({
      kind: "revisit",
      icon: "↩️",
      title: "Revisit Lesson " + stuck.prev.index,
      detail: "strengthen the basics first",
      count: 1,
      minPer: 0.5,
      action: "lesson",
      lessonId: stuck.prev.id,
    });
  return plan;
}

function planEstRange(plan) {
  const mins = plan.reduce((s, p) => s + (p.count || 1) * (p.minPer || 0.2), 0);
  const lo = Math.max(2, Math.round(mins));
  return lo + "–" + (lo + 5);
}
function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
function planRetentionPct(now) {
  const words = (typeof DB !== "undefined" && DB.words) || [];
  let sum = 0;
  let n = 0;
  for (const w of words) {
    const st = getState(w.id);
    if (st.reps > 0) {
      sum += Logic.recallProb(st, now);
      n++;
    }
  }
  return n ? Math.round((sum / n) * 100) : null;
}
function planHsk1Pct() {
  const hs = ((typeof DB !== "undefined" && DB.words) || []).filter((w) => w.level === "HSK1");
  if (!hs.length) return 0;
  let learned = 0;
  hs.forEach((w) => {
    if (getState(w.id).reps > 0) learned++;
  });
  return Math.round((learned / hs.length) * 100);
}

// The Daily Mission dashboard on the Today start screen.
function renderDailyMission() {
  const host = document.getElementById("todayPlan");
  if (!host) return;
  const plan = buildTodayPlan();
  const now = Date.now();
  const rows = plan
    .map(
      (p, i) => `<button class="mission-row" data-i="${i}">
        <span class="mission-main"><span class="mission-title">${escapeHTML(p.title)}</span>
          <span class="mission-detail">${escapeHTML(p.detail)}</span></span>
        <span class="mission-arrow" aria-hidden="true">→</span>
      </button>`
    )
    .join("");
  const d = typeof loadDaily === "function" ? loadDaily() : {};
  const today = typeof dayStr === "function" ? dayStr(now) : "";
  const yday = typeof dayStr === "function" ? dayStr(now - DAY) : "";
  const streak = d.lastDay === today || d.lastDay === yday ? d.streak || 0 : 0;
  const ret = planRetentionPct(now);
  const hsk1 = planHsk1Pct();
  host.innerHTML = `<div class="mission">
      <div class="mission-greet">${greetingWord()}!</div>
      <div class="mission-h">Today's plan</div>
      <div class="mission-list">${
        rows || '<p class="mission-empty">You\'re all caught up. Explore new words in Learn.</p>'
      }</div>
      <div class="mission-time">Estimated time · ${planEstRange(plan)} min</div>
      <div class="mission-progress">
        <span class="mp-item">${streak}-day streak</span>
        ${ret != null ? `<span class="mp-item">${ret}% retention</span>` : ""}
        <span class="mp-item">HSK 1: ${hsk1}%</span>
      </div>
    </div>`;
  host.querySelectorAll(".mission-row[data-i]").forEach((b) =>
    b.addEventListener("click", () => {
      const p = plan[+b.dataset.i];
      if (!p) return;
      if (p.action === "practice" && typeof launchPractice === "function") {
        launchPractice(p.mode);
      } else if (p.action === "lesson" && typeof openLesson === "function") {
        if (typeof switchView === "function") switchView("courseView");
        openLesson(p.lessonId);
      } else if (p.action === "session" && typeof startDailySession === "function") {
        startDailySession();
      }
    })
  );
}

function loadCourseProgress() {
  try {
    return JSON.parse(localStorage.getItem(COURSE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveCourseProgress(p) {
  try {
    localStorage.setItem(COURSE_KEY, JSON.stringify(p));
  } catch (e) {
    /* private mode */
  }
}
function cWord(id) {
  return (DB.words || []).find((w) => w.id === id);
}

// Phase 3: derive real lesson content from the data instead of hand-authoring.

// A tone note built from the lesson's actual tones (via the tested toneSeq).
// Tone 3 (the low dip) is the beginner's hardest, so it is called out by name.
const TONE_NAME = { 1: "1 (high, flat)", 2: "2 (rising)", 3: "3 (dip)", 4: "4 (falling)" };
function autoToneNote(words) {
  const tone3 = [];
  const present = new Set();
  words.forEach((w) => {
    const seq = Logic.toneSeq(w.pinyin);
    seq.forEach((t) => present.add(t));
    if (seq.includes(3)) tone3.push(w.chinese);
  });
  if (tone3.length) {
    return (
      "Tone 3 is the tricky one — a low dip. Practise it in: " +
      tone3.slice(0, 4).join("、") +
      ". When two tone-3 syllables meet, the first becomes tone 2."
    );
  }
  const list = [...present]
    .sort()
    .map((t) => TONE_NAME[t] || t)
    .join(", ");
  return "Copy each word's tone exactly — the tone is part of the word. Tones here: " + list + ".";
}

// Auto common-mistakes: words in the same lesson that sound the same except for
// tone (a minimal pair) are the classic confusion. normPinyin strips the tones.
function autoConfusables(words) {
  const out = [];
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const a = words[i],
        b = words[j];
      if (normPinyin(a.pinyin) === normPinyin(b.pinyin) && a.pinyin !== b.pinyin) {
        out.push(
          a.chinese + " (" + a.pinyin + ") vs " + b.chinese + " (" + b.pinyin +
            ") — same sounds, different tone. Keep them apart."
        );
      }
    }
  }
  return out.slice(0, 3);
}

// Build the full ordered lesson list for a path: authored lessons first, then
// generated lessons chunking the level's remaining words. Cached per path.
function pathLessons(path) {
  if (_pathCache[path.id]) return _pathCache[path.id];
  const authored = Object.entries(COURSE.authored || {})
    .filter(([, l]) => l.path === path.id)
    .map(([id, l]) => Object.assign({ id }, l))
    .sort((a, b) => a.index - b.index);

  const used = new Set();
  authored.forEach((l) => l.wordIds.forEach((id) => used.add(id)));

  const remaining = (DB.words || []).filter(
    (w) => w.level === path.level && !used.has(w.id)
  );
  const size = path.lessonSize || 8;
  const gen = [];
  let idx = authored.length;
  for (let i = 0; i < remaining.length; i += size) {
    idx++;
    const chunk = remaining.slice(i, i + size);
    gen.push({
      id: path.id + "-g" + String(idx).padStart(2, "0"),
      path: path.id,
      index: idx,
      title: chunk[0].chinese + " … " + chunk[chunk.length - 1].chinese,
      objective:
        "By the end you'll recognise, hear, and type " +
        chunk.length +
        " new words — starting with " +
        chunk
          .slice(0, 4)
          .map((w) => w.english)
          .join(", ") +
        (chunk.length > 4 ? "…" : "") +
        ".",
      wordIds: chunk.map((w) => w.id),
      toneNote: autoToneNote(chunk),
      commonMistakes: autoConfusables(chunk),
      mastery: { threshold: 0.8 },
    });
  }
  const all = authored.concat(gen);
  _pathCache[path.id] = all;
  return all;
}

function lessonById(id) {
  for (const p of COURSE.paths) {
    const L = pathLessons(p).find((l) => l.id === id);
    if (L) return L;
  }
  return null;
}

// Status: mastered | available | locked (previous lesson not yet mastered).
function courseLessonStatus(path, lessonId) {
  const prog = loadCourseProgress();
  if (prog[lessonId] && prog[lessonId].status === "mastered") return "mastered";
  const lessons = pathLessons(path);
  const i = lessons.findIndex((l) => l.id === lessonId);
  if (i <= 0) return "available"; // first lesson always open
  const prev = lessons[i - 1];
  const prevMastered = prog[prev.id] && prog[prev.id].status === "mastered";
  return prevMastered ? "available" : "locked";
}

// ---- Course map (one path at a time) ----
function renderCourse() {
  const host = document.getElementById("courseView");
  if (!host || typeof COURSE === "undefined") return;
  if (!_coursePathId) _coursePathId = COURSE.paths[0].id;
  const path = COURSE.paths.find((p) => p.id === _coursePathId) || COURSE.paths[0];
  const prog = loadCourseProgress();
  const lessons = pathLessons(path);
  const masteredCount = lessons.filter(
    (l) => prog[l.id] && prog[l.id].status === "mastered"
  ).length;

  const tabs = COURSE.paths
    .map(
      (p) =>
        `<button class="course-tab${p.id === path.id ? " active" : ""}" data-path="${p.id}">${escapeHTML(
          p.title
        )}</button>`
    )
    .join("");

  // Resume: the first lesson that is unlocked but not yet mastered.
  const resume = lessons.find(
    (l) => courseLessonStatus(path, l.id) === "available"
  );
  const banner = resume
    ? `<button class="course-continue" data-lesson="${escapeHTML(resume.id)}">
        <span class="cc-label">${masteredCount ? "Continue" : "Start"}</span>
        <span class="cc-lesson">Lesson ${resume.index} · ${escapeHTML(
          resume.title
        )}</span>
        <span class="cc-arrow" aria-hidden="true">→</span>
      </button>`
    : `<div class="course-complete">You've mastered every lesson in ${escapeHTML(
        path.title
      )}.</div>`;

  const nodes = lessons
    .map((L) => {
      const status = courseLessonStatus(path, L.id);
      const score = prog[L.id] && prog[L.id].score;
      const badge =
        status === "mastered"
          ? '<span class="course-mark ok">' + ICON.check + "</span>"
          : status === "locked"
            ? '<span class="course-mark lock">' + ICON.lock + "</span>"
            : '<span class="course-mark go">' + ICON.chevron + "</span>";
      const sub =
        status === "mastered" && score != null
          ? `mastered · ${Math.round(score * 100)}%`
          : status === "locked"
            ? "locked"
            : `${L.wordIds.length} words`;
      return `<button class="course-node ${status}" data-lesson="${escapeHTML(
        L.id
      )}" ${status === "locked" ? "disabled" : ""}>
        ${badge}
        <span class="course-node-main">
          <span class="course-node-title">Lesson ${L.index} · ${escapeHTML(
            L.title
          )}</span>
          <span class="course-node-sub">${sub}</span>
        </span>
      </button>`;
    })
    .join('<div class="course-link-line"></div>');

  host.innerHTML = `
    <h2 class="section-title">Course</h2>
    <p class="intro-text">A guided path. Meet each lesson's words, then pass the mastery check to unlock the next one. Your free practice tabs stay available any time.</p>
    <div class="course-tabs" role="tablist">${tabs}</div>
    <p class="course-path-progress">${masteredCount} / ${lessons.length} lessons mastered</p>
    ${banner}
    <div class="course-path-nodes">${nodes}</div>`;

  const cont = host.querySelector(".course-continue");
  if (cont)
    cont.addEventListener("click", () => openLesson(cont.dataset.lesson));
  host.querySelectorAll(".course-tab").forEach((b) =>
    b.addEventListener("click", () => {
      _coursePathId = b.dataset.path;
      renderCourse();
    })
  );
  host.querySelectorAll(".course-node:not(.locked)").forEach((b) =>
    b.addEventListener("click", () => openLesson(b.dataset.lesson))
  );
}

// ---- Lesson player: learn phase ----
// ---- Guided lesson flow ----
// One focused item at a time with progressive disclosure. The learner hears and
// tries to recall each word BEFORE revealing it (retrieval practice), then a
// grammar step, then the practice quiz (recognition/recall/production) and the
// mastery check. Reuses charStoryHTML, exampleBoxHTML, runPractice — no new
// engine and no duplicated task logic.
let _flow = null;

// --- reusable content section builders (also used by the grammar step) ---
function grammarSectionHTML(L) {
  if (!L.grammar) return "";
  return `<div class="lesson-grammar">
      <h3 class="lesson-step-title">Grammar · ${escapeHTML(L.grammar.point)}</h3>
      <div class="lesson-pattern">${escapeHTML(L.grammar.pattern)}</div>
      ${(L.grammar.examples || [])
        .map(
          (ex) => `<div class="lesson-gex">
            <div class="gex-cn hanzi">${escapeHTML(ex.cn)}
              <button class="speak-btn small" data-speak="${escapeHTML(
                ex.cn
              )}" title="Play sentence">${SPEAK_ICON}</button></div>
            <div class="gex-py">${escapeHTML(ex.py)}</div>
            <div class="gex-en">${escapeHTML(ex.en)}${
              ex.note ? ` <span class="gex-note">· ${escapeHTML(ex.note)}</span>` : ""
            }</div>
          </div>`
        )
        .join("")}
      ${
        L.grammar.note
          ? `<div class="lesson-note"><strong>Note:</strong> ${escapeHTML(
              L.grammar.note
            )}</div>`
          : ""
      }
    </div>`;
}

function collocSectionHTML(L) {
  if (!L.collocations || !L.collocations.length) return "";
  return `<div class="lesson-colloc">
      <h3 class="lesson-step-title">Useful chunks</h3>
      <ul class="colloc-list">
        ${L.collocations
          .map(
            (c) => `<li>
              <span class="colloc-chunk hanzi">${escapeHTML(c.chunk)}</span>
              <button class="speak-btn small" data-speak="${escapeHTML(
                c.chunk
              )}" title="Play">${SPEAK_ICON}</button>
              <span class="colloc-py">${escapeHTML(c.py)}</span>
              <span class="colloc-en">${escapeHTML(c.en)}</span>
            </li>`
          )
          .join("")}
      </ul>
    </div>`;
}

function mistakesSectionHTML(L) {
  if (!L.commonMistakes || !L.commonMistakes.length) return "";
  const items = L.commonMistakes.map((m) => `<li>${escapeHTML(m)}</li>`).join("");
  return `<div class="lesson-mistakes"><h3 class="lesson-step-title">Common mistakes</h3><ul>${items}</ul></div>`;
}

function openLesson(lessonId) {
  const host = document.getElementById("courseView");
  const L = lessonById(lessonId);
  if (!host || !L) return;
  // character stories are a lazy chunk — load them before rendering the words
  if (typeof charInfoLoaded !== "undefined" && !charInfoLoaded) {
    ensureCharInfo(() => openLesson(lessonId));
    return;
  }
  const words = L.wordIds.map(cWord).filter(Boolean);
  const steps = [{ type: "intro" }];
  words.forEach((w) => steps.push({ type: "word", word: w }));
  if (L.grammar || (L.collocations && L.collocations.length) || (L.commonMistakes && L.commonMistakes.length)) {
    steps.push({ type: "grammar" });
  }
  if (L.dialogue && L.dialogue.lines && L.dialogue.lines.length) {
    steps.push({ type: "dialogue" });
  }
  _flow = { id: lessonId, L, words, steps, i: 0, revealed: false };
  renderFlowStep();
}

// Progress dots reflect the learning steps (words + grammar), not the intro.
function flowDotsHTML() {
  const learn = _flow.steps.filter((s) => s.type !== "intro");
  const before = _flow.steps.slice(0, _flow.i).filter((s) => s.type !== "intro").length;
  return (
    '<div class="lf-dots" aria-label="Lesson progress">' +
    learn
      .map(
        (s, k) =>
          `<span class="lf-dot${k < before ? " done" : k === before ? " now" : ""}"></span>`
      )
      .join("") +
    "</div>"
  );
}

function flowChrome(bodyHTML, actionsHTML) {
  const L = _flow.L;
  return `
    <div class="lesson-flow">
      <div class="lf-top">
        <button class="course-back" id="courseBack">← Course</button>
        <div class="lf-meta">Lesson ${L.index} · ${escapeHTML(L.title)}</div>
        ${flowDotsHTML()}
      </div>
      <div class="lf-body">${bodyHTML}</div>
      <div class="lf-actions">${actionsHTML}</div>
    </div>`;
}

function wordStepHTML(w, revealed) {
  if (!revealed) {
    return `<div class="lf-word">
      <div class="lf-zi hanzi">${escapeHTML(w.chinese)}</div>
      <button class="speak-btn" data-speak="${escapeHTML(
        w.chinese
      )}" title="Play pronunciation">${SPEAK_ICON}</button>
      <p class="lf-recall">Listen. Can you recall the pinyin and meaning?</p>
    </div>`;
  }
  const chars = [...new Set(w.chars || [...w.chinese])];
  const stories = chars.map((ch) => (DB.charInfo[ch] ? charStoryHTML(ch) : "")).join("");
  return `<div class="lf-word revealed">
    <div class="lf-zi hanzi">${escapeHTML(w.chinese)}</div>
    <button class="speak-btn" data-speak="${escapeHTML(
      w.chinese
    )}" title="Play pronunciation">${SPEAK_ICON}</button>
    <div class="lf-py">${escapeHTML(w.pinyin)}</div>
    <div class="lf-en">${escapeHTML(w.english)}${
      w.khmer ? ` · ${escapeHTML(w.khmer)}` : ""
    }</div>
    ${
      w.breakdown && w.breakdown !== "-"
        ? `<div class="lesson-breakdown"><strong>Parts:</strong> ${escapeHTML(w.breakdown)}</div>`
        : ""
    }
    ${stories}
    ${w.ex_cn ? exampleBoxHTML({ level: null, cn: w.ex_cn, py: w.ex_py, en: w.ex_en }) : ""}
  </div>`;
}

// Conversation step: word → phrase → sentence → dialogue. A calm, readable
// exchange (not chat bubbles) with speaker labels, per-line audio, and one
// comprehension check. The dialogue reuses words the learner already knows.
function dialogueStepHTML(L) {
  const d = L.dialogue;
  const lines = d.lines
    .map(
      (ln) => `<div class="dlg-line dlg-${ln.sp === "A" ? "a" : "b"}">
        <span class="dlg-sp" aria-hidden="true">${escapeHTML(ln.sp)}</span>
        <div class="dlg-bubble">
          <div class="dlg-cn hanzi">${escapeHTML(ln.cn)}
            <button class="speak-btn small" data-speak="${escapeHTML(
              ln.cn
            )}" title="Play line">${SPEAK_ICON}</button></div>
          <div class="dlg-py">${escapeHTML(ln.py)}</div>
          <div class="dlg-en">${escapeHTML(ln.en)}</div>
        </div>
      </div>`
    )
    .join("");
  const c = d.comprehension;
  let comp = "";
  if (c && c.options && c.options.length) {
    const opts = shuffleArray(c.options.slice())
      .map(
        (o) =>
          `<button class="sent-opt hanzi dlg-opt" data-v="${escapeHTML(o)}">${escapeHTML(o)}</button>`
      )
      .join("");
    comp = `<div class="dlg-comp">
        <p class="intro-text">${escapeHTML(c.q)}</p>
        <div class="sent-options">${opts}</div>
        <div class="mcq-explain" id="dlgFb" aria-live="polite"></div>
      </div>`;
  }
  return `<div class="lf-dialogue">
      <div class="dlg-situation">${escapeHTML(d.situation)}</div>
      <div class="dlg-lines">${lines}</div>
      ${comp}
      <p class="dlg-yourturn">Your turn: tap a line to hear it, then read it aloud before you continue.</p>
    </div>`;
}

function renderFlowStep() {
  const host = document.getElementById("courseView");
  if (!host || !_flow) return;
  const step = _flow.steps[_flow.i];
  if (!step) return startQuiz(_flow.id); // learning done → practice

  let body = "";
  let actions = "";
  if (step.type === "intro") {
    const L = _flow.L;
    body = `<div class="lf-intro">
        <div class="lf-kicker">New lesson</div>
        <h2 class="lf-title">${escapeHTML(L.title)}</h2>
        <p class="lf-objective">${escapeHTML(L.objective)}</p>
        ${
          L.toneNote
            ? `<div class="lesson-note"><strong>Tones:</strong> ${escapeHTML(L.toneNote)}</div>`
            : ""
        }
        <p class="lf-hint">${_flow.words.length} words · hear each one, try to recall it, then reveal.</p>
      </div>`;
    actions = `<button class="study-btn primary" id="lfNext">Begin</button>`;
  } else if (step.type === "word") {
    body = wordStepHTML(step.word, _flow.revealed);
    actions = _flow.revealed
      ? `<button class="study-btn primary" id="lfNext">Continue</button>`
      : `<button class="study-btn primary" id="lfReveal">Reveal</button>`;
  } else if (step.type === "grammar") {
    body =
      grammarSectionHTML(_flow.L) + collocSectionHTML(_flow.L) + mistakesSectionHTML(_flow.L);
    actions = `<button class="study-btn primary" id="lfNext">${
      _flow.L.dialogue ? "Next: conversation" : "Start practice"
    }</button>`;
  } else if (step.type === "dialogue") {
    body = dialogueStepHTML(_flow.L);
    actions = `<button class="study-btn primary" id="lfNext">Start practice</button>`;
  }

  host.innerHTML = flowChrome(body, actions);

  host.querySelector("#courseBack").addEventListener("click", () => {
    _flow = null;
    renderCourse();
  });
  host
    .querySelectorAll(".speak-btn")
    .forEach((b) => b.addEventListener("click", () => speak(b.dataset.speak)));
  const reveal = host.querySelector("#lfReveal");
  if (reveal)
    reveal.addEventListener("click", () => {
      _flow.revealed = true;
      renderFlowStep();
    });
  const nextBtn = host.querySelector("#lfNext");
  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      _flow.i++;
      _flow.revealed = false;
      renderFlowStep();
    });

  // comprehension check on the dialogue step (records real performance)
  if (step.type === "dialogue") {
    const c = _flow.L.dialogue.comprehension;
    host.querySelectorAll(".dlg-opt").forEach((b) =>
      b.addEventListener("click", () => {
        if (b.disabled) return;
        const ok = b.dataset.v === c.answer;
        host.querySelectorAll(".dlg-opt").forEach((x) => {
          if (x.dataset.v === c.answer) x.classList.add("correct");
          else if (x === b) x.classList.add("wrong");
          x.disabled = true;
        });
        if (typeof playAnswerSound === "function") playAnswerSound(ok);
        if (typeof recordSkill === "function") recordSkill("recognize", ok);
        if (!ok && typeof recordMistake === "function") recordMistake("wrong-meaning");
        const fb = host.querySelector("#dlgFb");
        if (fb)
          fb.innerHTML = ok
            ? '<span class="fb-ans">Correct.</span>'
            : `<span class="fb-ans">Answer: ${escapeHTML(c.answer)}</span>`;
      })
    );
  }

  // hear-first: auto-play audio on word steps, the intro, and the first dialogue line
  if (step.type === "word") speak(step.word.chinese);
  else if (step.type === "intro" && _flow.words[0]) speak(_flow.words[0].chinese);
  else if (step.type === "dialogue" && _flow.L.dialogue.lines[0])
    speak(_flow.L.dialogue.lines[0].cn);
}

// ---- Quiz phase: multi-mode practice engine (active recall) ----
function startQuiz(lessonId) {
  const host = document.getElementById("courseView");
  const L = lessonById(lessonId);
  const words = L.wordIds.map(cWord).filter(Boolean);
  host.innerHTML = `
    <button class="course-back" id="courseBack">← Course</button>
    <div id="practiceHost"></div>`;
  host.querySelector("#courseBack").addEventListener("click", renderCourse);
  runPractice(host.querySelector("#practiceHost"), words, {
    onDone: (r) => finishQuiz(lessonId, r.accuracy, r),
  });
}

// ---- Mastery check ----
function finishQuiz(lessonId, score, stats) {
  const host = document.getElementById("courseView");
  const L = lessonById(lessonId);
  const path = COURSE.paths.find((p) => p.id === L.path);
  const threshold = (L.mastery && L.mastery.threshold) || 0.8;
  const passed = score >= threshold;

  const prog = loadCourseProgress();
  const prev = prog[lessonId] || {};
  prog[lessonId] = {
    status: passed ? "mastered" : "inProgress",
    score: Math.max(score, prev.score || 0),
    masteredAt: passed ? Date.now() : prev.masteredAt || null,
  };
  saveCourseProgress(prog);

  // On mastery, enroll the lesson's words into the FSRS review engine so they
  // get scheduled future reviews. Idempotent — reuses the tested schedule().
  if (passed && typeof enrollLearned === "function") {
    L.wordIds.forEach((id) => enrollLearned(id, lessonId));
  }

  const lessons = pathLessons(path);
  const idx = lessons.findIndex((l) => l.id === lessonId);
  const next = lessons[idx + 1];
  host.innerHTML = `
    <h2 class="section-title">${passed ? "Lesson mastered" : "Almost there"}</h2>
    <div class="course-result ${passed ? "pass" : "fail"}">
      <div class="course-score">${Math.round(score * 100)}%</div>
      <p>${
        passed
          ? "You passed the mastery check."
          : `You need ${Math.round(threshold * 100)}% to unlock the next lesson. Review and try again.`
      }</p>
      ${
        stats
          ? `<p class="course-result-stats">${stats.correct}/${stats.total} correct · ${stats.avgSec}s avg${
              stats.wrongCount ? ` · ${stats.wrongCount} reviewed` : ""
            }</p>`
          : ""
      }
    </div>
    <div class="course-result-actions">
      ${
        passed && next
          ? `<button class="study-btn primary" id="courseNext">Next lesson →</button>`
          : ""
      }
      ${
        !passed
          ? `<button class="study-btn primary" id="courseRetry">Review the lesson</button>`
          : ""
      }
      <button class="study-btn" id="courseHome">Back to course</button>
    </div>`;
  const home = host.querySelector("#courseHome");
  if (home) home.addEventListener("click", renderCourse);
  const nx = host.querySelector("#courseNext");
  if (nx) nx.addEventListener("click", () => openLesson(next.id));
  const rt = host.querySelector("#courseRetry");
  if (rt) rt.addEventListener("click", () => openLesson(lessonId));
}
