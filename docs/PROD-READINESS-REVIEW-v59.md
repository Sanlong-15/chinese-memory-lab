# Production Readiness Review — v59

Senior-engineer pass over the whole app as it stands at cache version 59.
Genuine issues only (cosmetic nitpicks omitted). Each issue: severity, why it
matters, recommended solution, effort, expected impact.

## Context that shapes this review

The app grew from a focused FSRS flashcard tool into a broad platform — a
133-lesson course, an 11-mode practice engine, review analytics, a knowledge
base, and a learning dashboard — across roughly 15 releases (v45→v59). Almost
none of that has been exercised on a real device or browser. A real visual bug
(the voice dropdown clipped by a card) already reached the user despite every
headless test passing. That gap dominates this review.

---

## Issues

### 1. Nothing verified on a real device since ~v44 — BLOCKER
- **Why it matters:** Headless tests prove the code *runs*; they cannot prove UIs
  *work*. Gestures, stroke-order animation, mic permissions, the course/practice
  flows, the dashboard numbers, and mobile layout are all unverified. The voice
  bug proves this class of failure is real and invisible to the current tests.
- **Solution:** One manual QA pass on the deployed URL across a small matrix
  (the user's iPhone + desktop Chrome and Safari), using a per-feature checklist:
  daily review, one course lesson end-to-end, each practice mode, Progress
  numbers, a word page (bookmark, stroke order, recently-viewed), offline reload.
- **Effort:** 1–2 hours. **Impact:** Unblocks "production"; catches the exact bugs
  the automated suite can't.

### 2. Automated test coverage is a small fraction of the surface — HIGH
- **Why it matters:** Only `logic.js` and `data.js` are tested. The course engine,
  practice queue/modes, SRS enrichment, review analytics, and knowledge-base
  filters have zero committed tests — only throwaway smoke scripts. The `typeClass`
  crash was a data regression the tests didn't catch.
- **Solution:** Commit the headless smoke harness as a test. Add unit tests for
  the pure functions added since v43: `toneGlyphs`, `recallProb`,
  `buildPracticeQueue`, `computeLearningStats`, `courseLessonStatus`,
  `pathLessons`, `autoConfusables`. Add one Playwright smoke (open a lesson, pass
  its quiz, confirm the next unlocks).
- **Effort:** 1–2 days. **Impact:** Stops silent regressions; raises engineering
  credibility for interviews.

### 3. Manual version-bumping across ~21 places per release — HIGH
- **Why it matters:** Every release the `?v=` string is hand-edited in ~19 spots
  in `index.html` plus `core.js` and `sw.js`. Miss one and users get a stale or
  broken mix, or the service worker caches a broken build.
- **Solution:** A tiny Node release script that stamps a single version
  everywhere (or content-hashed filenames).
- **Effort:** 2–3 hours. **Impact:** Removes a whole class of deploy incidents.

### 4. iOS input zoom + sub-44px tap targets — MEDIUM
- **Why it matters:** `#searchBox` is 14px, so iOS Safari zooms on focus; filter
  chips (`9px 14px` ≈ 34px) and the group nav (`8px 16px` ≈ 34px) are under the
  44px minimum (WCAG 2.5.5). The app is mobile-first and the user is on an iPhone.
- **Solution:** Search field to 16px; chips/nav `min-height:44px`.
- **Effort:** 30 min. **Impact:** Real mobile feel + accessibility compliance.

### 5. `words.js` is 197 KB gzipped and loads synchronously — MEDIUM
- **Why it matters:** It's the LCP floor — it blocks the first paint of the daily
  session, worst on mobile. It grew as lessons/words were added.
- **Solution:** Split per level and load the active level on demand, or defer
  non-Today data. (Higher risk; deferred previously for that reason.)
- **Effort:** ~1 day. **Impact:** Faster first load.

### 6. Documentation drift — MEDIUM
- **Why it matters:** `README.md` and `ARCHITECTURE.md` don't mention the course,
  practice engine, review analytics, or knowledge base — i.e., most of the app.
  For a portfolio, docs that don't match the code undercut credibility.
- **Solution:** Update the README feature list and the ARCHITECTURE module map;
  link the existing design docs (COURSE-SYSTEM, LEARN-PILLAR).
- **Effort:** 1–2 hours. **Impact:** Portfolio credibility.

### 7. Breadth outpaces depth and verification — MEDIUM (learning quality)
- **Why it matters:** 133 lessons exist, but most are auto-generated with generic
  objectives and tone notes; per-skill scores aren't tracked; grammar isn't
  reviewed as cards; speaking is ungraded. Strong core, uneven depth — risks
  looking broad-but-thin.
- **Solution:** Don't add breadth. Author a handful of flagship lessons well, and
  clearly label generated lessons as auto-built.
- **Effort:** Ongoing content. **Impact:** Higher, more honest learning quality.

### 8. Three near-identical dropdown/popover implementations — LOW-MED
- **Why it matters:** The Flashcards level menu, the Words "More filters" menu,
  and the voice picker each implement their own open/close/outside-click popover.
  Maintainability drag.
- **Solution:** One reusable popover helper.
- **Effort:** 3–4 hours. **Impact:** Maintainability (little user-facing impact).

### 9. Words grid still not windowed — LOW-MED
- **Why it matters:** Opening Words injects all 1,331 cards, each `tabindex=0` — a
  heavy DOM and a punishing tab order for keyboard/screen-reader users. Lazy-render
  fixed startup, not the open cost.
- **Solution:** Windowize, or cap with "show more".
- **Effort:** ~half day. **Impact:** Accessibility + memory on that view.

### 10. HanziWriter instances in the detail overlay aren't disposed — LOW
- **Why it matters:** Each word opened creates stroke-order writers that aren't
  destroyed on close — minor heap growth over a long session.
- **Solution:** Track and destroy them in `closeDetail`, or accept as negligible.
- **Effort:** ~1 hour. **Impact:** Minor memory.

---

## What is genuinely solid (not inflating)

FSRS domain layer with unit tests · clean layered architecture (domain / data /
shared / features / app) · PWA with offline + a resilient service worker · WCAG
AA contrast (fixed in v44) · GPU-friendly animations gated by reduced-motion ·
tight CSP · escaped grid rendering · global error handling + a leveled logger ·
the enriched SRS record (response time, history, lapses) · and an honest refusal
to fabricate frequency/synonym/skill data.

---

## Scores (0–10, production-readiness lens)

| Dimension | Score | One-line reason |
| --- | --- | --- |
| Learning effectiveness | 8.0 | Real science + broad modes; auto-content shallow, per-skill gaps |
| UI | 7.5 | Cohesive Warm Stone theme; one known bug, polish unverified |
| UX | 7.0 | Powerful but broad; flows unverified on device |
| Engineering | 6.5 | Clean architecture + domain tests; dragged by thin coverage, manual versioning, unverified surface |
| Accessibility | 7.0 | AA contrast, focus rings, ARIA, reduced-motion, keyboard-operable tiles; tap targets, iOS zoom, 1,331 tabbable cards open |
| Portfolio | 8.5 | Impressive breadth + FSRS + PWA + docs; the standout strength |
| **Overall** | **7.2** | Strong app, held back from "production-ready" mainly by verification + testing gaps |

## The one recommendation that matters most

Stop adding features. In priority order: (1) verify live on device, (2) commit
real tests for the new surface, (3) automate the version bump. Those three move
the Overall and Engineering scores more than any new feature would — and they're
what a senior interviewer will actually probe.
