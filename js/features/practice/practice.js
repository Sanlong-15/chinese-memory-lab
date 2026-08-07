// features/practice/practice.js
// Multi-mode practice engine. Reuses the (now host-parameterized) daily-session
// renderers and adds new modes. Tracks response time + accuracy, gives immediate
// feedback, and reviews wrong answers before ending. No duplicated task logic.

// ---- New mode: Typing (type the pinyin) ----
function renderTypingTask(host, word, done) {
  host.innerHTML = `
    <div class="practice-q">
      <div class="type-zi hanzi">${escapeHTML(word.chinese)}</div>
      <p class="intro-text">Type the pinyin (tones optional).</p>
      <input class="type-input" id="typeInput" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="latin" placeholder="e.g. ni hao" aria-label="Type the pinyin">
      <button class="study-btn primary" id="typeCheck">Check</button>
      <div class="type-feedback" id="typeFeedback" aria-live="polite"></div>
    </div>`;
  const input = host.querySelector("#typeInput");
  const fb = host.querySelector("#typeFeedback");
  let answered = false;
  const check = () => {
    if (answered) return;
    answered = true;
    const ok = normPinyin(input.value) === normPinyin(word.pinyin);
    fb.innerHTML = ok
      ? `<span class="fb-ok">Correct — ${escapeHTML(word.pinyin)}</span>`
      : `<span class="fb-no">Answer: <strong>${escapeHTML(
          word.pinyin
        )}</strong> · ${escapeHTML(word.english)}</span>`;
    input.disabled = true;
    speak(word.chinese);
    setTimeout(() => done(ok), ok ? 800 : 1700);
  };
  host.querySelector("#typeCheck").addEventListener("click", check);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      check();
    }
  });
  input.focus();
}

// ---- New mode: Matching (character <-> meaning, or <-> pinyin) ----
function renderMatchTask(host, words, field, done) {
  const left = words.slice();
  const right = shuffleArray(words.slice());
  const label = field === "pinyin" ? "pinyin" : "meaning";
  host.innerHTML = `
    <div class="practice-q">
      <p class="intro-text">Match each character to its ${label}. Tap one, then its partner.</p>
      <div class="match-grid">
        <div class="match-col">${left
          .map(
            (w) =>
              `<button class="match-item hanzi" data-id="${w.id}">${escapeHTML(
                w.chinese
              )}</button>`
          )
          .join("")}</div>
        <div class="match-col">${right
          .map(
            (w) =>
              `<button class="match-item" data-id="${w.id}">${escapeHTML(
                w[field]
              )}</button>`
          )
          .join("")}</div>
      </div>
    </div>`;
  let selected = null,
    matched = 0,
    mistakes = 0;
  host.querySelectorAll(".match-item").forEach((it) => {
    it.addEventListener("click", () => {
      if (it.classList.contains("done")) return;
      if (!selected) {
        selected = it;
        it.classList.add("sel");
        return;
      }
      if (selected === it) {
        it.classList.remove("sel");
        selected = null;
        return;
      }
      const samePair = selected.dataset.id === it.dataset.id;
      const differentColumn = selected.parentElement !== it.parentElement;
      if (samePair && differentColumn) {
        selected.classList.remove("sel");
        selected.classList.add("done");
        it.classList.add("done");
        selected = null;
        matched++;
        if (matched === left.length) setTimeout(() => done(mistakes === 0), 450);
      } else {
        mistakes++;
        const bad = selected;
        it.classList.add("bad");
        bad.classList.add("bad");
        setTimeout(() => {
          it.classList.remove("bad", "sel");
          bad.classList.remove("bad", "sel");
        }, 450);
        selected = null;
      }
    });
  });
}

// ---- New mode: Sentence Ordering ----
function renderOrderTask(host, word, done) {
  const target = (word.ex_cn || "").replace(/[。！？，、,.!?]/g, "");
  const tokens = Array.from(target);
  if (tokens.length < 3 || tokens.length > 10) {
    // sentence too short/long to order — fall back to recognition
    return renderPracticeQuestion(host, { mode: "recognize", word }, done);
  }
  const bank = shuffleArray(tokens.map((c, i) => ({ c, i })));
  host.innerHTML = `
    <div class="practice-q">
      <p class="intro-text">Tap the words in order to build: <strong>“${escapeHTML(
        word.ex_en || word.english
      )}”</strong></p>
      <div class="order-answer" id="orderAnswer" aria-label="Your sentence"></div>
      <div class="order-bank" id="orderBank">${bank
        .map(
          (t) =>
            `<button class="order-tile hanzi" data-i="${t.i}">${escapeHTML(t.c)}</button>`
        )
        .join("")}</div>
      <button class="study-btn primary" id="orderCheck">Check</button>
      <div class="type-feedback" id="orderFb" aria-live="polite"></div>
    </div>`;
  const ans = host.querySelector("#orderAnswer");
  const fb = host.querySelector("#orderFb");
  let answered = false;
  host.querySelectorAll("#orderBank .order-tile").forEach((t) => {
    t.addEventListener("click", () => {
      if (answered || t.classList.contains("used")) return;
      t.classList.add("used");
      const a = document.createElement("button");
      a.className = "order-tile hanzi in-answer";
      a.textContent = t.textContent;
      a.addEventListener("click", () => {
        if (answered) return;
        a.remove();
        t.classList.remove("used");
      });
      ans.appendChild(a);
    });
  });
  host.querySelector("#orderCheck").addEventListener("click", () => {
    if (answered) return;
    answered = true;
    const built = Array.from(ans.querySelectorAll(".order-tile"))
      .map((x) => x.textContent)
      .join("");
    const ok = built === target;
    fb.innerHTML = ok
      ? `<span class="fb-ok">Correct!</span>`
      : `<span class="fb-no">Answer: ${escapeHTML(word.ex_cn)}</span>`;
    speak(word.ex_cn);
    setTimeout(() => done(ok), ok ? 900 : 1900);
  });
}

// ---- New mode: Speaking (best-effort). Not graded — the browser can't judge
// Mandarin tones reliably, so it gives feedback but never blocks mastery. ----
function renderSpeakTask(host, word, done) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  host.innerHTML = `
    <div class="practice-q" style="text-align:center">
      <div class="type-zi hanzi">${escapeHTML(word.chinese)}</div>
      <div class="lesson-py">${escapeHTML(word.pinyin)}</div>
      <p class="intro-text">Say it out loud.</p>
      <button class="play-btn" id="speakHear" type="button" aria-label="Hear it">
        <svg class="play-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        <span class="play-lbl">Hear</span>
      </button>
      <button class="study-btn primary" id="speakBtn">🎤 Tap and speak</button>
      <div class="type-feedback" id="speakFb" aria-live="polite"></div>
    </div>`;
  host.querySelector("#speakHear").addEventListener("click", () => speak(word.chinese));
  const fb = host.querySelector("#speakFb");
  const btn = host.querySelector("#speakBtn");
  if (!SR) {
    fb.innerHTML =
      '<span class="fb-no">Speaking check needs Chrome and a microphone. Tap to continue.</span>';
    btn.textContent = "Continue";
    btn.addEventListener("click", () => done(true));
    return;
  }
  let answered = false;
  const finishSpeak = (heard, note) => {
    if (answered) return;
    answered = true;
    fb.innerHTML = heard
      ? '<span class="fb-ok">Heard it 👍</span>'
      : `<span class="fb-no">${note || "Keep practising."}</span>`;
    setTimeout(() => done(true), 1200); // never penalise — practice, not a gate
  };
  btn.addEventListener("click", () => {
    if (answered) return;
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    fb.textContent = "Listening…";
    rec.onresult = (e) => {
      let hit = false,
        first = "";
      const alts = e.results[0];
      for (let i = 0; i < alts.length; i++) {
        const t = alts[i].transcript.replace(/\s/g, "");
        if (!first) first = t;
        if (t.includes(word.chinese)) hit = true;
      }
      finishSpeak(hit, `Heard: “${escapeHTML(first)}”. Aim for ${escapeHTML(word.chinese)}.`);
    };
    rec.onerror = () => finishSpeak(false, "Couldn't hear clearly.");
    rec.onend = () => finishSpeak(false, "No speech detected.");
    try {
      rec.start();
    } catch (e) {
      done(true);
    }
  });
}

// ---- Build a queue from words. `only` limits to a single mode (for the
// standalone practice picker); null builds the full mixed lesson queue. ----
function buildPracticeQueue(words, only) {
  if (only) {
    const q = [];
    if (only === "typing" || only === "speak") {
      words.forEach((w) => q.push({ mode: only, word: w }));
    } else if (only === "charmatch" || only === "pinyinmatch") {
      const field = only === "charmatch" ? "english" : "pinyin";
      const pool = shuffleArray(words.slice());
      for (let i = 0; i < pool.length; i += 4) {
        const g = pool.slice(i, i + 4);
        if (g.length >= 2) q.push({ mode: "match", words: g, field });
      }
    }
    return q;
  }
  const perWord = [
    { mode: "recognize", ok: () => true },
    { mode: "typing", ok: () => true },
    { mode: "listen", ok: () => true },
    { mode: "tone", ok: (w) => Logic.toneSeq(w.pinyin).length > 0 },
    { mode: "cloze", ok: (w) => w.ex_cn && w.ex_cn.includes(w.chinese) },
  ];
  const q = [];
  words.forEach((w, i) => {
    const start = i % perWord.length;
    let picked = "recognize";
    for (let k = 0; k < perWord.length; k++) {
      const m = perWord[(start + k) % perWord.length];
      if (m.ok(w)) {
        picked = m.mode;
        break;
      }
    }
    q.push({ mode: picked, word: w });
  });
  if (words.length >= 4)
    q.push({ mode: "match", words: shuffleArray(words.slice()).slice(0, 4), field: "english" });
  if (words.length >= 6)
    q.push({ mode: "match", words: shuffleArray(words.slice()).slice(0, 4), field: "pinyin" });
  // one sentence-ordering question if a word has a short-enough example
  const orderable = words.find((w) => {
    const r = (w.ex_cn || "").replace(/[。！？，、,.!?]/g, "");
    return r.length >= 3 && r.length <= 10 && r.includes(w.chinese);
  });
  if (orderable) q.push({ mode: "order", word: orderable });
  // one speaking prompt (best-effort, never gates mastery)
  q.push({ mode: "speak", word: words[0] });
  return q;
}

function renderPracticeQuestion(host, item, done) {
  const w = item.word;
  switch (item.mode) {
    case "typing":
      return renderTypingTask(host, w, done);
    case "listen":
      return renderListenTask(w, (r) => done(r === "good"), host);
    case "tone":
      return renderToneTask(w, (r) => done(r === "good"), host);
    case "cloze":
      return renderSentenceTask(w, (r) => done(r === "good"), host);
    case "match":
      return renderMatchTask(host, item.words, item.field, done);
    case "order":
      return renderOrderTask(host, w, done);
    case "speak":
      return renderSpeakTask(host, w, done);
    case "recognize":
    default:
      return renderMCQ(
        host,
        `<p class="intro-text">Which word means <strong>“${escapeHTML(
          w.english
        )}”</strong>?</p>`,
        sampleField(w, "chinese", 4),
        w.chinese,
        true,
        (r) => done(r === "good")
      );
  }
}

// ---- The engine ----
function runPractice(host, words, opts) {
  opts = opts || {};
  const queue = buildPracticeQueue(words, opts.only);
  let i = 0,
    correct = 0;
  const times = [];
  const wrong = [];
  let reviewing = false,
    reviewQueue = [],
    ri = 0;

  // keyboard shortcuts: 1–4 pick a multiple-choice option
  const keyHandler = (e) => {
    if (["1", "2", "3", "4"].includes(e.key)) {
      const opt = host.querySelectorAll(".sent-opt:not([disabled])")[+e.key - 1];
      if (opt) opt.click();
    }
  };
  document.addEventListener("keydown", keyHandler);
  const finish = (summary) => {
    document.removeEventListener("keydown", keyHandler);
    if (opts.onDone) opts.onDone(summary);
  };

  const next = () => {
    const item = reviewing ? reviewQueue[ri] : queue[i];
    if (!item) {
      if (!reviewing && wrong.length) {
        reviewing = true;
        reviewQueue = wrong.slice();
        ri = 0;
        host.innerHTML = `<div class="practice-review-intro">
          <h3 class="lesson-step-title">Review what you missed</h3>
          <p class="intro-text">${wrong.length} to go over before you finish.</p>
          <button class="study-btn primary" id="startReview">Review now</button></div>`;
        host.querySelector("#startReview").addEventListener("click", next);
        return;
      }
      const total = queue.length;
      const avgSec = times.length
        ? Math.round((times.reduce((a, b) => a + b, 0) / times.length / 100)) / 10
        : 0;
      return finish({
        total,
        correct,
        accuracy: total ? correct / total : 0,
        avgSec,
        wrongCount: wrong.length,
      });
    }
    const t0 = Date.now();
    renderPracticeQuestion(host, item, (ok) => {
      recordSkill(item.mode, ok); // per-skill performance
      if (!reviewing) {
        times.push(Date.now() - t0);
        if (ok) correct++;
        else wrong.push(item);
        i++;
      } else {
        ri++;
      }
      next();
    });
    const n = reviewing ? ri + 1 : i + 1;
    const of = reviewing ? reviewQueue.length : queue.length;
    host.insertAdjacentHTML(
      "afterbegin",
      `<p class="progress-note practice-progress">${
        reviewing ? "Review" : "Practice"
      } · ${n} / ${of}</p>`
    );
  };
  next();
}

// ---- Standalone Practice picker (Practice tab) ----
// Reuses runPractice + all the mode renderers; just a new entry point.
let _pickMode = "mixed";
let _pickLevel = "HSK1";
const PICK_MODES = [
  ["mixed", "Mixed"],
  ["typing", "Typing"],
  ["charmatch", "Character match"],
  ["pinyinmatch", "Pinyin match"],
  ["speak", "Speaking"],
];

function coursePracticeLevels() {
  const set = [];
  (DB.words || []).forEach((w) => {
    if (set.indexOf(w.level) === -1) set.push(w.level);
  });
  return set;
}

function renderPracticePicker() {
  const host = document.getElementById("practiceView");
  if (!host) return;
  const levels = coursePracticeLevels();
  if (levels.indexOf(_pickLevel) === -1) _pickLevel = levels[0];
  host.innerHTML = `
    <h2 class="section-title">Practice</h2>
    <p class="intro-text">Pick a mode and a level, then drill. Each round is up to 12 random words with instant feedback and a review of your misses.</p>
    <div class="pick-group"><span class="pick-label">Mode</span>
      <div class="pick-row">${PICK_MODES.map(
        (m) =>
          `<button class="pick-chip${m[0] === _pickMode ? " active" : ""}" data-mode="${m[0]}">${m[1]}</button>`
      ).join("")}</div>
    </div>
    <div class="pick-group"><span class="pick-label">Level</span>
      <div class="pick-row">${levels
        .map(
          (l) =>
            `<button class="pick-chip${l === _pickLevel ? " active" : ""}" data-plevel="${l}">${escapeHTML(
              l
            )}</button>`
        )
        .join("")}</div>
    </div>
    <button class="study-btn primary" id="pickStart">Start practice</button>`;
  host
    .querySelectorAll(".pick-chip[data-mode]")
    .forEach((b) =>
      b.addEventListener("click", () => {
        _pickMode = b.dataset.mode;
        renderPracticePicker();
      })
    );
  host
    .querySelectorAll(".pick-chip[data-plevel]")
    .forEach((b) =>
      b.addEventListener("click", () => {
        _pickLevel = b.dataset.plevel;
        renderPracticePicker();
      })
    );
  host.querySelector("#pickStart").addEventListener("click", startStandalonePractice);
}

function startStandalonePractice() {
  const host = document.getElementById("practiceView");
  const pool = (DB.words || []).filter((w) => w.level === _pickLevel);
  const words = shuffleArray(pool.slice()).slice(0, 12);
  if (!words.length) return;
  host.innerHTML = `
    <button class="course-back" id="practiceBack">← Practice modes</button>
    <div id="practiceRunHost"></div>`;
  host.querySelector("#practiceBack").addEventListener("click", renderPracticePicker);
  runPractice(document.getElementById("practiceRunHost"), words, {
    only: _pickMode === "mixed" ? null : _pickMode,
    onDone: (r) => {
      const runHost = document.getElementById("practiceRunHost");
      runHost.innerHTML = `
        <div class="course-result pass">
          <div class="course-score">${Math.round(r.accuracy * 100)}%</div>
          <p>${r.correct}/${r.total} correct · ${r.avgSec}s avg${
            r.wrongCount ? ` · ${r.wrongCount} reviewed` : ""
          }</p>
        </div>
        <div class="course-result-actions">
          <button class="study-btn primary" id="practiceAgain">Practice again</button>
          <button class="study-btn" id="practiceHome">Change mode</button>
        </div>`;
      runHost
        .querySelector("#practiceAgain")
        .addEventListener("click", startStandalonePractice);
      runHost
        .querySelector("#practiceHome")
        .addEventListener("click", renderPracticePicker);
    },
  });
}
