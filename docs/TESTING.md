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

The scheduler is the riskiest code, so it lives in `domain/logic.js` as pure
functions with no DOM and is tested in isolation:

- `logic.test.js` — FSRS update, interval growth, tone parsing, task selection.
- `data.test.js` — the word DB and examples load and have the expected shape.

Run: `npm test` (vitest). These gate every push and PR via GitHub Actions.

### 2. Headless load smoke

Because the app is classic scripts sharing global scope, a Node `vm` harness
concatenates every file in load order with DOM/`localStorage`/`speechSynthesis`
stubs, boots the app, and asserts: the data loads (1,331 words), the SRS
functions resolve, and every lazy view renders on `switchView` without throwing.
This catches load-order regressions and broken references after refactors — the
failure modes that unit tests miss.

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
