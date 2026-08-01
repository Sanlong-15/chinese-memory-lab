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
