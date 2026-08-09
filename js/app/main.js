// init — app entry point

// Cheap setup that must run at startup (theme, dialogs, wiring, in-memory index).
initTheme();
initWelcome();
updateVoiceUI();
buildCharIndex();
wireWordGrid(); // one delegated listener for the Words grid
initRadicalFilter(); // wires the radical filter chips (render is lazy)
initSentences(); // wires controls; sentence pool builds on first open
initListen();
initTone();
initDashboard();

// Heavy views render their DOM the first time they are opened, not now.
// (Today is the only visible view at startup, so nothing below runs yet.)
LAZY_VIEWS.wordsView = renderGrid; // ~1,331 cards
LAZY_VIEWS.patternsView = renderPatterns; // sound families + radicals
LAZY_VIEWS.structuresView = renderStructures;
LAZY_VIEWS.grammarView = renderGrammar;
LAZY_VIEWS.writingView = renderWritingWord; // HanziWriter instances
LAZY_VIEWS.studyView = () => setStudyMode("review"); // builds review queue + card

// deep-link: open the tab named in the URL hash, and react to hash changes
function applyHash() {
  const h = location.hash.slice(1);
  if (h && HASH_VIEW[h]) switchView(HASH_VIEW[h]);
}
window.addEventListener("hashchange", applyHash);
applyHash();

// sticky nav: add a shadow once the header scrolls under the nav bar
(function stickyNav() {
  const nav = document.getElementById("navbar");
  if (!nav) return;
  const onScroll = () => nav.classList.toggle("stuck", window.scrollY > 4);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

// Offline indicator: the app works offline (PWA), so tell the user rather than
// leaving them guessing. Progress is stored locally, so nothing is lost.
(function offlineIndicator() {
  const bar = document.getElementById("offlineBar");
  if (!bar) return;
  const update = () => {
    bar.hidden = navigator.onLine;
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
})();

// PWA: register the service worker for offline support.
// Skipped on file:// (service workers need http/https).
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(
      () => (typeof Log !== "undefined" ? Log.info("service worker ready") : 0),
      (err) =>
        typeof Log !== "undefined" ? Log.warn("service worker failed", err) : 0
    );
  });
}
