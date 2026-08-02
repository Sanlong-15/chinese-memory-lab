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
function schedule(id, rating) {
  srs[id] = Logic.fsrsUpdate(getState(id), rating, Date.now());
  saveSrs(srs);
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
}
