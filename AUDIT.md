# Chinese Memory Lab — Professional Audit

Reviewed as a product team (PM, UX, architecture, frontend, language teacher,
learning scientist, QA). Goal: portfolio-quality tool competitive with Hack
Chinese, Skritter, Pleco, Duolingo on learning quality, with a clean UI.

Priorities (highest to lowest): learning effectiveness, UX, performance,
scalability, maintainability, accessibility, visual polish.

## Codebase snapshot (facts)

- index.html 305 lines · css 640 · **app.js 1,624 lines (monolith, 66 global
  functions)** · data.js **1.5 MB** · structures 113 · grammar 172 · upload 332
- 1,331 word entries (**1,275 distinct**), **6,655 example sentences**
- charInfo (memory stories) cover **445 of 1,077** unique characters
- **No package.json, no build, no tests, no CI**
- Accessibility: 1 aria attribute total, 0 alt attributes

## Strengths (keep these)

- Broad, coherent content: 1,275 words, grammar patterns, radicals, structures,
  a character web — wider than most free tools.
- Multiple practice modes now feed one SRS memory system.
- Zero dependencies — loads anywhere, no build needed to run.
- Clean single-accent theme with a real day/night mode.

## Findings, by priority

### 1. Learning effectiveness (highest)

**1.1 The SRS scheduler is basic (SM-2-lite).**
Impact: the scheduler *is* the learning engine. Modern tools (Anki since 2023,
Hack Chinese) use FSRS, which models memory far better and cuts reviews ~20–30%
for the same retention. Ours uses fixed multipliers and no per-card memory
model. Why it matters: better scheduling = you remember more with less time —
the core promise of a spaced-repetition app.
Fix: move toward an FSRS-style model (stability + difficulty per card, target
retention). Medium effort, highest learning ROI.

**1.2 Practice is mostly recognition, not production.**
Impact: Study Mode shows the character and you recall the meaning; Sentences/
Listen/Tones are multiple-choice recognition. Research is clear that *active
production* (meaning → produce the word, and typing/writing) builds stronger,
more usable memory. Why it matters: you can recognize 你好 but still freeze when
you must produce it. Fix: add a recall direction (English → Chinese) and a
typed/handwritten production step in Study Mode.

**1.3 Audio is browser TTS.**
Impact: `speechSynthesis` quality varies by device; some phones have no Chinese
voice at all, so Listen and Tones can be robotic or silent. Skritter/Pleco use
recorded native audio. Why it matters: for listening and tone training, wrong
audio teaches wrong sounds. Fix: bundle native-recorded audio (or a fixed-
quality source) with a graceful "no voice" fallback and warning.

**1.4 Content quality is unverified.**
Impact: 6,655 example sentences and all Khmer are AI-generated and never checked;
632 characters have no memory story. Why it matters: a memorized wrong sentence
is worse than none. Fix: a native teacher verifies a sample; generate the
missing stories.

### 2. User experience

**2.1 No onboarding.** A new user lands on a 1,275-item list with 9 tabs and no
"start here." Fix: a first-run flow and one clear "Start today's review" CTA.

**2.2 Navigation overload.** 9 top tabs wrap awkwardly on mobile. Fix: group
into Learn / Practice / Browse, and a bottom nav bar on phones (mobile-first).

**2.3 Progress is trapped in one browser.** No account, no sync, no backup —
study on your phone and laptop and they never merge; clear the browser and it's
gone. This is a retention risk. Fix (later): optional account + sync, or at
least export/import of progress.

### 3. Performance

**3.1 1.5 MB data.js loaded eagerly and synchronously** before the app runs.
On a slow phone this blocks first paint. Fix: split data by level and lazy-load;
or fetch JSON async and cache in IndexedDB. Ship examples separately from the
core word list.

### 4. Scalability

**4.1 Content is hardcoded JS objects, edited by hand.** Fine at 1.3k words,
painful at 10k. Fix: a data pipeline (JSON per lesson) and, if it ever needs
accounts/sync, a small backend. Avoid building a backend now — overkill for a
solo learner (see Non-goals).

### 5. Maintainability

**5.1 app.js is a 1,624-line monolith** with 66 globals and shared mutable
state. Hard to test, easy to break. Fix: split into ES modules (srs, study,
sentences, listen, tone, grammar, structures, chardetail, dashboard, theme,
dom-utils) with a tiny Vite build.

**5.2 No tests, no linter, no CI.** All QA has been manual. Fix: Vitest unit
tests on the pure logic (scheduler, tone parser, dedupe), plus Prettier/ESLint.
This is what makes it *portfolio-credible*.

### 6. Accessibility

**6.1 Keyboard and screen-reader support is thin.** Flashcard flip and rating
are mouse-only; the detail overlay has no focus trap, `aria-modal`, or Esc;
1 aria attribute total; images lack alt; dark-mode badge contrast unverified.
Fix: keyboard shortcuts (space to flip, 1–4 to rate), modal a11y, alt text,
WCAG AA contrast pass, honor `prefers-reduced-motion`.

### 7. Visual polish

**7.1 A few badges use fixed colors** that don't theme in dark mode. Minor,
quick fix.

## Recommended sequence (phased, high ROI first)

- **Phase A — Learning core:** upgrade the SRS toward FSRS (1.1) + add a recall/
  production direction (1.2). Biggest effect on your actual Chinese.
- **Phase B — Professional backbone:** module refactor + Vite + Vitest tests +
  ESLint/Prettier (5.1, 5.2), and split/lazy-load data (3.1). This is what makes
  it read as senior-engineer work in a portfolio.
- **Phase C — UX + reach:** onboarding, grouped/bottom nav, keyboard + modal
  a11y (2.1, 2.2, 6.1).
- **Phase D — Audio + content quality:** native audio (1.3), Khmer verification,
  missing stories (1.4).

## Non-goals (avoid overengineering)

- No backend, accounts, or database yet — a solo learner doesn't need it, and it
  would slow everything down. Add only if you want multi-device sync later.
- No native mobile app — the responsive web app is the right platform.
- No heavy framework rewrite (React/Vue) unless the module refactor proves it's
  needed. Vanilla + modules is enough at this size.

## The one thing to do first

Phase A, item 1.1 — the SRS scheduler. It is your #1 priority (learning
effectiveness), it's where the paid competitors actually win, and it improves
every mode at once because they all feed the scheduler.
