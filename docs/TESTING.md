# Testing strategy

The goal is high confidence on the parts that are easy to get wrong (the
scheduler math and the data), fast feedback in CI, and honesty about what is
*not* automated and why.

## The pyramid, as it applies here

```
        manual / exploratory   ← DOM, gestures, audio, PWA install (by hand)
      ───────────────────────
        headless load smoke    ← whole app boots, no exceptions, views render
    ───────────────────────────
        unit tests (vitest)    ← pure FSRS logic + data integrity  (CI)
```

### 1. Unit tests — `tests/` (run in CI)

The pure logic is tested in isolation (no DOM):

- `logic.test.js` — FSRS update + interval growth, tone parsing, task selection,
  `toneGlyphs` (tone contour marks), `recallProb` (predicted retention).
- `data.test.js` — the word DB and examples load and have the expected shape.

### 2. Full-app smoke — `tests/smoke.test.js` (run in CI)

Because the app is classic scripts sharing global scope, this test concatenates
every file in load order into a Node `vm` context with DOM / `localStorage` /
`speechSynthesis` stubs, boots the app, and asserts across the whole surface:
the data loads (1,377 words), the SRS functions resolve, **every lazy view
renders** on `switchView` without throwing, `buildPracticeQueue` produces a mixed
multi-mode queue, the **course mastery gate** locks lesson 2 until lesson 1 is
mastered, and `computeLearningStats` returns a valid shape. This is the
regression net for the feature code that isn't a pure module — it would have
caught the `typeClass` data regression.

Run all: `npm test` (vitest). These gate every push and PR via GitHub Actions.

### 3. Manual / exploratory

DOM rendering, touch gestures, speech synthesis, handwriting recognition, and
the PWA install/offline flow are verified by hand on a real device (iPhone) and
the deployed URL. These are high-effort to automate for the value on a solo
project.

## What is deliberately NOT tested (and why)

- **No end-to-end / browser-automation suite (yet).** Playwright would be the
  next addition; for now the load-smoke plus manual passes cover the risk at a
  fraction of the maintenance cost. This is a conscious trade-off, not an
  oversight — see the roadmap.
- **No snapshot tests of rendered HTML.** The markup changes often during design
  iteration; snapshots would mostly generate churn.

## Quality gates in CI

`.github/workflows/test.yml` runs on every push and PR:

1. `npm run lint` — ESLint on the pure domain layer (`js/domain/*.js`) + tests.
2. `npm test` — vitest.

Formatting is enforced locally with `npm run format` (Prettier) and can be
verified with `npm run format:check`. A green CI check means the logic is sound.
CI does **not** build or deploy — GitHub Pages serves the static files directly.
