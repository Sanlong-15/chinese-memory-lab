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
        "Learn and master these words: " +
        chunk
          .slice(0, 6)
          .map((w) => w.english)
          .join(", ") +
        (chunk.length > 6 ? " …" : "") +
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
    : `<div class="course-complete">🎉 You've mastered every lesson in ${escapeHTML(
        path.title
      )}.</div>`;

  const nodes = lessons
    .map((L) => {
      const status = courseLessonStatus(path, L.id);
      const score = prog[L.id] && prog[L.id].score;
      const badge =
        status === "mastered"
          ? '<span class="course-mark ok">✓</span>'
          : status === "locked"
            ? '<span class="course-mark lock">🔒</span>'
            : '<span class="course-mark go">▸</span>';
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
function openLesson(lessonId) {
  const host = document.getElementById("courseView");
  const L = lessonById(lessonId);
  if (!host || !L) return;
  const words = L.wordIds.map(cWord).filter(Boolean);

  const wordCards = words
    .map((w) => {
      const chars = [...new Set(w.chars || [...w.chinese])];
      const stories = chars
        .map((ch) => (DB.charInfo[ch] ? charStoryHTML(ch) : ""))
        .join("");
      return `<div class="lesson-word">
        <div class="lesson-word-head">
          <span class="lesson-zi hanzi">${escapeHTML(w.chinese)}</span>
          <button class="speak-btn" data-speak="${escapeHTML(
            w.chinese
          )}" title="Play pronunciation">🔊</button>
        </div>
        <div class="lesson-py">${escapeHTML(w.pinyin)}</div>
        <div class="lesson-en">${escapeHTML(w.english)}${
          w.khmer ? ` · ${escapeHTML(w.khmer)}` : ""
        }</div>
        ${
          w.breakdown && w.breakdown !== "-"
            ? `<div class="lesson-breakdown"><strong>Parts:</strong> ${escapeHTML(
                w.breakdown
              )}</div>`
            : ""
        }
        ${stories}
        ${w.ex_cn ? exampleBoxHTML({ level: null, cn: w.ex_cn, py: w.ex_py, en: w.ex_en }) : ""}
      </div>`;
    })
    .join("");

  const mistakes = (L.commonMistakes || [])
    .map((m) => `<li>${escapeHTML(m)}</li>`)
    .join("");

  host.innerHTML = `
    <button class="course-back" id="courseBack">← Course</button>
    <h2 class="section-title">Lesson ${L.index} · ${escapeHTML(L.title)}</h2>
    <div class="lesson-objective"><strong>Goal:</strong> ${escapeHTML(
      L.objective
    )}</div>
    ${
      L.toneNote
        ? `<div class="lesson-note"><strong>Tones:</strong> ${escapeHTML(
            L.toneNote
          )}</div>`
        : ""
    }
    <h3 class="lesson-step-title">Meet the words</h3>
    <div class="lesson-words">${wordCards}</div>
    ${
      mistakes
        ? `<div class="lesson-mistakes"><h3 class="lesson-step-title">Common mistakes</h3><ul>${mistakes}</ul></div>`
        : ""
    }
    <button class="study-btn primary lesson-start-quiz" id="startQuiz">Start the quiz</button>`;

  host.querySelector("#courseBack").addEventListener("click", renderCourse);
  host
    .querySelectorAll(".speak-btn")
    .forEach((b) => b.addEventListener("click", () => speak(b.dataset.speak)));
  host
    .querySelector("#startQuiz")
    .addEventListener("click", () => startQuiz(lessonId));
  if (words[0]) speak(words[0].chinese); // Hear-first
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

  const lessons = pathLessons(path);
  const idx = lessons.findIndex((l) => l.id === lessonId);
  const next = lessons[idx + 1];
  host.innerHTML = `
    <h2 class="section-title">${passed ? "Lesson mastered 🎉" : "Almost there"}</h2>
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
