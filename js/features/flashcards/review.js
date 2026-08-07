// features/flashcards/review.js
// Review analytics for the Progress screen: due-horizon buckets, recently
// forgotten, mastered, a study heatmap, and confused-character sets. Reads the
// enriched SRS record (srs.js); reuses getState / dedupeByChinese / loadHeat.

// ---- Learning summary (computed metrics, all honest / no fabricated data) ----
function computeLearningStats(now) {
  const words = dedupeByChinese(DB.words);
  let learned = 0,
    mastered = 0,
    totalReps = 0,
    msSum = 0,
    good = 0,
    ratings = 0;
  const chars = new Set();
  const byLevel = {};
  const dueByDay = new Array(7).fill(0);
  words.forEach((w) => {
    const st = getState(w.id);
    const lv = w.level;
    byLevel[lv] = byLevel[lv] || { learned: 0, mastered: 0, total: 0 };
    byLevel[lv].total++;
    if (!(st.reps > 0)) return;
    learned++;
    byLevel[lv].learned++;
    totalReps += st.reps;
    (w.chars || [...w.chinese]).forEach((c) => chars.add(c));
    if (st.avgMs) msSum += st.avgMs * st.reps;
    (st.hist || []).forEach((h) => {
      ratings++;
      if (h.r !== "again") good++;
    });
    if ((st.interval || 0) >= 21) {
      mastered++;
      byLevel[lv].mastered++;
    }
    const due = st.due || 0;
    if (due <= now) dueByDay[0]++;
    else if (due <= now + 7 * DAY) {
      const idx = Math.floor((due - now) / DAY);
      if (idx >= 0 && idx < 7) dueByDay[idx]++;
    }
  });
  // estimated HSK: highest level where 50%+ of words are mastered
  let estHSK = 0;
  for (const lv of ["HSK1", "HSK2", "HSK3", "HSK4"]) {
    const b = byLevel[lv];
    if (b && b.total && b.mastered / b.total >= 0.5) estHSK = +lv.slice(3);
    else break;
  }
  // strongest area: studied level with the highest mastery ratio
  let strong = null;
  for (const lv in byLevel) {
    const b = byLevel[lv];
    if (b.learned > 0) {
      const r = b.mastered / b.total;
      if (!strong || r > strong.r) strong = { lv, r };
    }
  }
  const heat = loadHeat();
  let recent = 0;
  for (let i = 0; i < 14; i++) recent += heat[dayStr(now - i * DAY)] || 0;
  return {
    learned,
    total: words.length,
    mastered,
    chars: chars.size,
    studyMinutes: Math.round(msSum / 60000),
    accuracy: ratings ? good / ratings : null,
    totalReps,
    estHSK,
    strong,
    dueByDay,
    perDay: recent / 14,
    byLevel,
  };
}

function _lsCard(value, label, explain) {
  return `<div class="ls-card"><div class="ls-val">${value}</div><div class="ls-lbl">${label}</div><div class="ls-exp">${explain}</div></div>`;
}

function renderLearningSummary() {
  const host = document.getElementById("learningSummary");
  if (!host || typeof DB === "undefined") return;
  const s = computeLearningStats(Date.now());
  const acc = s.accuracy != null ? Math.round(s.accuracy * 100) + "%" : "—";
  const strong = s.strong
    ? s.strong.lv + " (" + Math.round(s.strong.r * 100) + "%)"
    : "—";
  const cards = [
    _lsCard(s.learned + "/" + s.total, "Vocabulary learned", "Words reviewed at least once."),
    _lsCard(s.chars, "Characters learned", "Distinct characters in words you've studied."),
    _lsCard(s.mastered, "Mastered", "Words with a 21+ day interval — in long-term memory."),
    _lsCard(acc, "Accuracy", "Share of recent reviews you got right (not 'Again')."),
    _lsCard("~" + s.studyMinutes + "m", "Study time", "Rough total, estimated from response times."),
    _lsCard(s.estHSK ? "HSK " + s.estHSK : "—", "Estimated HSK", "Highest level where you've mastered over half the words."),
    _lsCard(strong, "Strongest area", "The level with your biggest mastered share."),
  ];
  const maxDue = Math.max(1, ...s.dueByDay);
  const bars = s.dueByDay
    .map(
      (n, i) =>
        `<div class="fc-col"><div class="fc-bar" style="height:${Math.round(
          (n / maxDue) * 100
        )}%" title="${n} due"></div><div class="fc-day">${i === 0 ? "Today" : "+" + i}</div></div>`
    )
    .join("");
  const forecast =
    s.perDay > 0
      ? `You review about <strong>${Math.round(s.perDay)}</strong> cards a day (last 2 weeks).`
      : `Do a few reviews to start your forecast.`;
  host.innerHTML = `
    <h3 class="rev-h">Learning summary</h3>
    <div class="ls-grid">${cards.join("")}</div>
    <h3 class="rev-h">Predicted review load <span class="rev-h-sub">(next 7 days)</span></h3>
    <div class="forecast">${bars}</div>
    <p class="ls-forecast">${forecast}</p>
    <button class="study-btn" id="lsExport">Export analytics (CSV)</button>`;
  const ex = host.querySelector("#lsExport");
  if (ex) ex.addEventListener("click", exportAnalyticsCSV);
}

// Per-skill accuracy bars (fills the "per-skill" gap honestly — real answers).
function renderSkillScores() {
  const host = document.getElementById("skillScores");
  if (!host) return;
  const labels = [
    ["reading", "Reading"],
    ["listening", "Listening"],
    ["tones", "Tones"],
    ["sentences", "Sentences"],
    ["typing", "Typing"],
  ];
  const weak = weakestSkill(8);
  const rows = labels
    .map(([k, label]) => {
      const acc = skillAccuracy(k);
      if (acc == null) return "";
      const pct = Math.round(acc * 100);
      return `<div class="skill-row">
        <span class="skill-lbl">${label}${
          k === weak ? ' <span class="skill-weak">weakest</span>' : ""
        }</span>
        <div class="skill-bar"><div class="skill-fill" style="width:${pct}%"></div></div>
        <span class="skill-pct">${pct}%</span></div>`;
    })
    .filter(Boolean)
    .join("");
  host.innerHTML = rows
    ? `<h3 class="rev-h">Skill scores</h3>
       <p class="weak-sub">Accuracy per skill, from your own answers. Your daily review drills the weakest skill more often.</p>${rows}`
    : "";
}

function exportAnalyticsCSV() {
  const s = computeLearningStats(Date.now());
  const rows = [
    ["metric", "value"],
    ["vocabulary_learned", s.learned],
    ["vocabulary_total", s.total],
    ["characters_learned", s.chars],
    ["mastered", s.mastered],
    ["accuracy_pct", s.accuracy != null ? Math.round(s.accuracy * 100) : ""],
    ["study_minutes_est", s.studyMinutes],
    ["estimated_hsk", s.estHSK || ""],
    ["reviews_total", s.totalReps],
    ["reviews_per_day_recent", Math.round(s.perDay * 10) / 10],
    [],
    ["level", "total", "learned", "mastered"],
  ];
  for (const lv in s.byLevel) {
    const b = s.byLevel[lv];
    rows.push([lv, b.total, b.learned, b.mastered]);
  }
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cml-analytics-" + dayStr(Date.now()) + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function renderReviewAnalytics() {
  const host = document.getElementById("reviewAnalytics");
  if (!host || typeof DB === "undefined") return;
  const now = Date.now();
  const words = dedupeByChinese(DB.words);

  let overdue = 0,
    dueToday = 0,
    week = 0,
    month = 0,
    mastered = 0;
  const forgotten = [];
  const masteredList = [];
  const studiedChars = new Set();

  for (const w of words) {
    const st = getState(w.id);
    if (!(st.reps > 0)) continue;
    (w.chars || [...w.chinese]).forEach((c) => studiedChars.add(c));
    const due = st.due || 0;
    if (due <= now) {
      dueToday++;
      if (due <= now - DAY) overdue++;
    } else if (due <= now + 7 * DAY) week++;
    else if (due <= now + 30 * DAY) month++;
    const iv = st.interval || 0;
    if (iv >= 21) {
      mastered++;
      masteredList.push({ w, iv });
    }
    if (st.lastLapse && now - st.lastLapse <= 7 * DAY)
      forgotten.push({ w, t: st.lastLapse });
  }
  forgotten.sort((a, b) => b.t - a.t);
  masteredList.sort((a, b) => b.iv - a.iv);

  const buckets = [
    ["Overdue", overdue, "overdue"],
    ["Due today", dueToday, "due"],
    ["This week", week, "week"],
    ["This month", month, "month"],
    ["Mastered", mastered, "mastered"],
  ];
  const bucketHTML = buckets
    .map(
      (b) =>
        `<div class="rev-bucket rev-${b[2]}"><div class="rev-num">${b[1]}</div><div class="rev-lbl">${b[0]}</div></div>`
    )
    .join("");

  const suggestHTML =
    overdue > 0
      ? `<div class="rev-suggest">You have <strong>${overdue}</strong> overdue. <button class="study-btn primary" id="revDueBtn">Review now</button></div>`
      : "";

  const chip = (w) =>
    `<button class="weak-item" data-speak="${escapeHTML(w.chinese)}">` +
    `<span class="weak-zi hanzi">${escapeHTML(w.chinese)}</span>` +
    `<span class="weak-py">${escapeHTML(w.pinyin || "")}</span>` +
    `<span class="weak-en">${escapeHTML(w.english || "")}</span></button>`;

  const forgottenHTML = forgotten.length
    ? `<h3 class="rev-h">Recently forgotten</h3><div class="weak-list">${forgotten
        .slice(0, 8)
        .map((f) => chip(f.w))
        .join("")}</div>`
    : "";
  const masteredHTML = masteredList.length
    ? `<h3 class="rev-h">Mastered <span class="rev-h-sub">(${mastered})</span></h3><div class="weak-list">${masteredList
        .slice(0, 8)
        .map((m) => chip(m.w))
        .join("")}</div>`
    : "";

  // confused characters: phonetic families where 2+ members are studied
  const confused = [];
  (DB.patternGroups || []).forEach((g) => {
    const members = (g.members || []).map((m) => m[0]);
    const studied = members.filter((ch) => studiedChars.has(ch));
    if (studied.length >= 2)
      confused.push({ comp: g.sound_component || "", members, studied });
  });
  const confusedHTML = confused.length
    ? `<h3 class="rev-h">Easily confused</h3>
       <p class="weak-sub">Same sound piece, different characters — check the tone and the meaning part.</p>
       ${confused
         .slice(0, 4)
         .map(
           (c) =>
             `<div class="confuse-set"><span class="confuse-comp">${escapeHTML(
               c.comp
             )}</span><span class="confuse-chars hanzi">${c.members
               .map(
                 (ch) =>
                   `<span class="confuse-ch${
                     c.studied.includes(ch) ? " seen" : ""
                   }">${escapeHTML(ch)}</span>`
               )
               .join("")}</span></div>`
         )
         .join("")}`
    : "";

  // heatmap: reviews per day, last 13 weeks
  const heat = loadHeat();
  let cells = "";
  for (let i = 90; i >= 0; i--) {
    const d = dayStr(now - i * DAY);
    const c = heat[d] || 0;
    const lvl = c === 0 ? 0 : c < 4 ? 1 : c < 10 ? 2 : 3;
    cells += `<span class="heat-cell heat-${lvl}" title="${d}: ${c}"></span>`;
  }
  const heatHTML = `<h3 class="rev-h">Study heatmap <span class="rev-h-sub">(last 13 weeks)</span></h3><div class="heatmap">${cells}</div>`;

  host.innerHTML = `
    <h3 class="rev-h">Review queue</h3>
    <div class="rev-buckets">${bucketHTML}</div>
    ${suggestHTML}
    ${heatHTML}
    ${forgottenHTML}
    ${masteredHTML}
    ${confusedHTML}`;

  const dueBtn = host.querySelector("#revDueBtn");
  if (dueBtn)
    dueBtn.addEventListener("click", () => {
      if (typeof switchView === "function") switchView("todayView");
    });
  host.querySelectorAll(".weak-item").forEach((b) =>
    b.addEventListener("click", () => speak(b.dataset.speak))
  );
}
