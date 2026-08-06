// sw.js — service worker for offline support.
//
// Strategy:
//   - Precache the app shell + core assets on install.
//   - HTML navigations: network-first, so a new deploy is picked up and users
//     are never stale-locked on a broken build; fall back to cache offline.
//   - Same-origin assets (JS/CSS/data/icons): cache-first, then network, and
//     runtime-cache what we fetch (so the lazy examples + data get cached too).
//   - Cross-origin (fonts, HanziWriter, Wikimedia): cache if present, else network.
//
// Bump CACHE on every release so old caches are cleaned up on activate.

const CACHE = "cml-v53";
const V = "?v=53";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css" + V,
  "./js/shared/observability.js" + V,
  "./js/data/words.js" + V,
  "./js/data/structures.js" + V,
  "./js/data/grammar.js" + V,
  "./js/data/course.js" + V,
  "./js/domain/logic.js" + V,
  "./js/domain/srs.js" + V,
  "./js/shared/core.js" + V,
  "./js/app/detail.js" + V,
  "./js/features/practice/reference.js" + V,
  "./js/features/flashcards/study.js" + V,
  "./js/app/ui.js" + V,
  "./js/features/today/session.js" + V,
  "./js/features/practice/practice.js" + V,
  "./js/features/course/course.js" + V,
  "./js/app/analytics.js" + V,
  "./js/app/main.js" + V,
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Cross-origin assets worth caching for offline (best-effort).
const EXTRA = [
  "https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => {
        // Best-effort per item: cache each URL on its own so a single failure
        // (e.g. a missed version bump) can't abort the whole install and leave
        // the user with no offline cache at all.
        const jobs = CORE.concat(EXTRA).map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {})
        );
        return Promise.all(jobs);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // HTML navigations: network-first.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Same-origin assets: cache-first, then network (and cache what we fetch).
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Cross-origin: cache if we have it, else network.
  event.respondWith(caches.match(req).then((c) => c || fetch(req)));
});
