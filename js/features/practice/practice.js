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

// ---- Build a mixed queue from a lesson's words ----
function buildPracticeQueue(words) {
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
  const queue = buildPracticeQueue(words);
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
