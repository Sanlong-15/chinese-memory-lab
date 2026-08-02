// shared/observability.js
// A tiny structured logger + global error handling. No dependencies.
// Loaded first so it can catch failures anywhere in the app.

const LOG_LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

// Verbose logging only when the developer asks for it (?debug in the URL, or
// localStorage cml_debug=1). Production default: warnings and errors only.
function _minLevel() {
  try {
    if (location.search.indexOf("debug") !== -1) return LOG_LEVELS.debug;
    if (localStorage.getItem("cml_debug") === "1") return LOG_LEVELS.debug;
  } catch (e) {
    /* ignore */
  }
  return LOG_LEVELS.warn;
}
const _MIN = _minLevel();

function _emit(level, args) {
  if (LOG_LEVELS[level] < _MIN) return;
  const fn = level === "error" ? "error" : level === "warn" ? "warn" : "log";
  try {
    console[fn]("[CML]", ...args);
  } catch (e) {
    /* console missing */
  }
}

// Structured logger used across the app instead of bare console.*.
const Log = {
  debug: (...a) => _emit("debug", a),
  info: (...a) => _emit("info", a),
  warn: (...a) => _emit("warn", a),
  error: (...a) => _emit("error", a),
};

// ---- Global error handling ----
// Vanilla JS has no React-style error boundaries. The equivalent is catching
// uncaught errors and rejected promises at the window level, logging them, and
// showing a non-blocking fallback so a single failure never leaves a blank page.
let _errorShown = false;
function _showErrorFallback() {
  if (_errorShown || !document.body) return;
  _errorShown = true;
  const bar = document.createElement("div");
  bar.id = "cml-error-bar";
  bar.setAttribute("role", "alert");
  bar.innerHTML =
    "<span>Something went wrong, but your progress is safe.</span>" +
    '<button type="button" id="cml-error-reload">Reload</button>' +
    '<button type="button" id="cml-error-dismiss" aria-label="Dismiss">×</button>';
  document.body.appendChild(bar);
  const reload = document.getElementById("cml-error-reload");
  const dismiss = document.getElementById("cml-error-dismiss");
  if (reload) reload.addEventListener("click", () => location.reload());
  if (dismiss)
    dismiss.addEventListener("click", () => {
      bar.remove();
      _errorShown = false;
    });
}

function _reportException(desc) {
  // If analytics is enabled, record it as a GA4 exception event.
  if (typeof window.gtag === "function") {
    window.gtag("event", "exception", { description: desc, fatal: false });
  }
}

window.addEventListener("error", (e) => {
  const where = e.filename ? e.filename + ":" + e.lineno : "";
  Log.error("uncaught:", e.message, where);
  _reportException("error: " + e.message);
  _showErrorFallback();
});

window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason && (e.reason.message || e.reason);
  Log.error("unhandled rejection:", reason);
  _reportException("promise: " + reason);
  _showErrorFallback();
});
