// features/flashcards/review.js
// Review analytics for the Progress screen: due-horizon buckets, recently
// forgotten, mastered, a study heatmap, and confused-character sets. Reads the
// enriched SRS record (srs.js); reuses getState / dedupeByChinese / loadHeat.

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
