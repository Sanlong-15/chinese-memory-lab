# Frontend Performance Audit

Method: static analysis of the repo (file sizes, gzip, render paths, load
order, fonts, listeners). Field Core Web Vitals need a Lighthouse run on the
deployed URL — the numbers below are **expectations**, not measured field data.

## Headline finding

The app does too much work **at load** for views the user cannot see yet.
`main.js` eagerly renders every view on startup, even though only "Today" is
visible. The word grid alone injects all 1,331 cards (~8,000 DOM nodes) and
attaches ~2,662 event listeners — into a hidden view. This is the single
biggest cost, and it hurts INP, total blocking time, and memory.

## Findings by category

**JavaScript / Bundle size.** Startup JS is ~216 KB gzipped, and `words.js`
(the DB) is 183 KB of that (85%). It loads synchronously before `main.js`.
`examples.js` (279 KB gz) is already lazy-loaded — good. The 12 small feature
files are fine (4–6 KB gz each); HTTP/2 on GitHub Pages multiplexes them.

**Rendering (biggest issue).** `main.js` calls `renderGrid`, `renderPatterns`,
`renderStructures`, `renderGrammar`, `initSentences`, `initListen`, `initTone`,
`initDashboard`, `setStudyMode`, `renderWritingWord` — all at load. That builds
DOM for ~6 hidden views. `renderGrid` maps all 1,331 words to HTML and then
loops to attach 2 listeners per card.

**Memory.** Those ~8,000+ grid nodes and ~2,662 listeners are retained for the
whole session, whether or not the user opens Words.

**Images.** Already good. The only remote image (Wikimedia stroke order) is in
the detail overlay and already uses `loading="lazy"`. No change needed.

**Fonts.** Noto Serif SC loads 4 weights (400;600;700;900) but the CSS uses
only 400, 700, 900 — **weight 600 is unused** and is the most expensive kind of
weight to ship (a CJK font). `display=swap` is set (good for LCP, small CLS
risk). `preconnect` is present (good).

**Loading.** Scripts sit at the end of `<body>` (good) but are not `defer`red,
so they download and execute in strict series. `defer` lets the browser parse
HTML and download all scripts in parallel, then run them in order.

**Lazy loading.** `examples.js` and stroke images are lazy — good. The gap is
that *view rendering* is not lazy (see Rendering).

**Caching.** Every asset has a `?v=N` cache-buster and GitHub Pages serves
static files cacheable. This is fine; no change needed.

**Animations.** All transitions use `transform`/`opacity` (GPU-friendly) and are
gated behind `prefers-reduced-motion`. The retention gauge repaints only on the
Progress view. No change needed.

**Accessibility.** Solid already: ARIA labels/roles on cards, visible focus
rings, dialog focus trap, reduced-motion. Optional add: a "skip to content"
link and an `aria-live` note when a view loads.

**Core Web Vitals.** LCP is floored by parsing `words.js` and the first render
of Today. INP and TBT suffer mainly from the eager render. CLS is low but the
font swap can nudge it.

## What NOT to change (already good)

Images (lazy), animations (GPU + reduced-motion), caching (`?v=` busting),
`examples.js` lazy load, CSP, base accessibility. A good audit leaves these
alone.

## Prioritised optimisations

1. **Lazy-render views (highest impact).** Render only "Today" at load; render
   each other view the first time it is opened (hook into `switchView`). Cuts
   startup DOM from ~9,000 nodes to a few hundred and ~2,700 listeners to dozens.
   Risk: moderate — must ensure each view renders on first open and re-renders
   where it already does (e.g. filters). Verify in a browser.

2. **Event delegation on card lists.** One listener on `#wordGrid` (and the
   other card containers) instead of 2 per card. Removes thousands of listeners.
   Low risk.

3. **`defer` on all script tags.** HTML parses immediately; scripts download in
   parallel and still run in order. Low risk, small win. (Do NOT reorder.)

4. **Drop unused font weight.** Remove `600` from Noto Serif SC in the Google
   Fonts URL (keep 400;700;900). Smaller font payload. Low risk.

5. **(Optional) Windowise the Words grid.** Even when Words opens, 1,331 cards is
   heavy. Render a capped batch with "show more", or render only the current
   filter. Medium effort; do only if Words feels janky on the phone.

6. **(Optional, later) Chunk `words.js`.** 183 KB gz synchronous is the LCP
   floor. Could split per level and load on demand, but "Today" needs the full
   set to schedule, so this is higher-risk and lower-priority. Note only.

## Before / after expectations

Estimates from static analysis. Verify with Lighthouse (mobile) on the deploy.

| Metric | Before | After (items 1–4) |
| --- | --- | --- |
| DOM nodes at load | ~9,000 | ~300–500 |
| Event listeners at load | ~2,700 | ~40–60 |
| Main-thread render work at load (TBT proxy) | high (all views built) | low (Today only) |
| INP on early taps | contended by eager work | snappier |
| LCP | fonts + words.js + big first render | modestly better (fewer nodes, 1 fewer font weight) |
| CLS | low, small font-swap nudge | same or slightly better |
| JS heap / retained DOM | thousands of nodes held | only the opened views held |
| Startup JS transfer | 216 KB gz | 216 KB gz (unchanged unless item 6) |
| Font transfer | 4 CJK weights | 3 CJK weights |

The honest summary: items 1–2 are the real wins (INP, TBT, memory). Items 3–4
are cheap polish. LCP and total transfer barely move unless we chunk `words.js`
(item 6), which is the risky one.
