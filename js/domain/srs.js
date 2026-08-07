// domain/srs.js
// Spaced-repetition DATA layer: storage + card state + daily log.
// No DOM, no feature UI. The FSRS math lives in domain/logic.js (Logic.*).
// Every feature (flashcards, today session, listen, tone) reads/writes here.

const DAY = 86400000;
const SRS_KEY = "cml_srs_v1";
const DAILY_KEY = "cml_daily_v1";

// ---- Card-state storage ----
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

// Read a card's stored state (with migration from the old SM-2-lite shape).
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

// Apply a rating: run the tested FSRS math, then persist.
// `ms` (optional) = the response time for this review, so we can track speed.
function schedule(id, rating, ms) {
  const prev = getState(id);
  const next = Logic.fsrsUpdate(prev, rating, Date.now());
  // ---- enriched review record (extra fields FSRS itself doesn't need) ----
  // Rolling average response time (exponential, favouring recent reviews).
  if (typeof ms === "number" && ms > 0) {
    next.avgMs = prev.avgMs ? Math.round(prev.avgMs * 0.7 + ms * 0.3) : ms;
  } else {
    next.avgMs = prev.avgMs;
  }
  // Short review history: last 8 ratings with timestamps (for "recently forgotten").
  const hist = (prev.hist || []).slice(-7);
  hist.push({ r: rating, t: Date.now() });
  next.hist = hist;
  // When the card was last forgotten (an "again").
  next.lastLapse = rating === "again" ? Date.now() : prev.lastLapse;
  srs[id] = next;
  saveSrs(srs);
}

// ---- Per-skill performance (reading / listening / tones / sentences / typing) ----
// Every answer is logged by the skill it exercises, so the app can show real
// per-skill scores and adaptively drill the learner's weakest skill.
const SKILL_KEY = "cml_skills_v1";
// Map a task/mode name to a learning skill. null = not scored (speak/writing).
function skillOf(task) {
  switch (task) {
    case "recognize":
    case "recall":
    case "match":
      return "reading";
    case "listen":
      return "listening";
    case "tone":
      return "tones";
    case "sentence":
    case "cloze":
    case "order":
      return "sentences";
    case "typing":
      return "typing";
    default:
      return null;
  }
}
function loadSkills() {
  try {
    return JSON.parse(localStorage.getItem(SKILL_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function recordSkill(task, correct) {
  const skill = skillOf(task);
  if (!skill) return;
  const s = loadSkills();
  s[skill] = s[skill] || { n: 0, correct: 0 };
  s[skill].n++;
  if (correct) s[skill].correct++;
  try {
    localStorage.setItem(SKILL_KEY, JSON.stringify(s));
  } catch (e) {
    /* private mode */
  }
}
function skillAccuracy(skill) {
  const s = loadSkills()[skill];
  return s && s.n ? s.correct / s.n : null;
}
// The skill with the lowest accuracy among those with enough attempts.
function weakestSkill(minAttempts) {
  const s = loadSkills();
  let worst = null;
  for (const k in s) {
    if (s[k].n >= (minAttempts || 8)) {
      const acc = s[k].correct / s[k].n;
      if (!worst || acc < worst.acc) worst = { skill: k, acc };
    }
  }
  return worst ? worst.skill : null;
}

// ---- Study heatmap: reviews per day (starts logging from now on) ----
const HEAT_KEY = "cml_heat_v1";
function loadHeat() {
  try {
    return JSON.parse(localStorage.getItem(HEAT_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function bumpHeat() {
  const h = loadHeat();
  const d = dayStr(Date.now());
  h[d] = (h[d] || 0) + 1;
  try {
    localStorage.setItem(HEAT_KEY, JSON.stringify(h));
  } catch (e) {
    /* private mode */
  }
}

// ---- Daily log (streak, today's count, goal) ----
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
  bumpHeat();
}
