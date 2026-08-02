// init
initTheme();
initWelcome();
updateVoiceUI();
buildCharIndex();
renderGrid();
renderPatterns();
initRadicalFilter();
renderStructures();
renderGrammar();
initSentences();
initListen();
initTone();
initDashboard();
setStudyMode("review");
renderWritingWord();

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
