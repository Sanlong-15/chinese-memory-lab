# Architecture

Character Memory Lab is a static, no-build web app. No bundler, no framework.
Files are plain `<script>` tags loaded in order in `index.html` and share one
global scope. This keeps the app runnable by double-clicking `index.html`
(works on `file://`) and hostable on GitHub Pages with zero build step.

The code is organised by **layer** and **feature**, from most-pure to most-UI.

## Folder structure

```
js/
  data/        Raw content. No logic.
    words.js         the DB word list (const DB)
    examples.js      lazy-loaded example sentences (window.DB_EXAMPLES)
    structures.js    character-structure shapes (const STRUCTURES)
    grammar.js       grammar patterns (const GRAMMAR)

  domain/      Pure rules + storage. No DOM, no feature UI.
    logic.js         FSRS math, tone parsing, task selection (Logic.*), unit-tested
    srs.js           card-state storage + daily log (getState, schedule, loadDaily, ...)

  shared/      Cross-feature helpers.
    core.js          escapeHTML, renderGrid, search, audio/voice, lazy loader

  features/    One folder per user-facing feature.
    today/       session.js     the daily interleaved review session
    flashcards/  study.js       review + browse flashcards, dashboard, retention
    practice/    reference.js   sentences, tones, radicals, grammar views
    upload/      upload.js       PDF lesson import (not currently wired in index.html)

  app/         App shell + entry.
    detail.js        navigation (groups/subnav/switchView) + word detail overlay
    ui.js            theme, welcome dialog, keyboard shortcuts, backup/restore, writing
    main.js          init: wires everything together on load
```

## Load order (index.html)

data → domain → shared → app/detail → features → app/main.
The rule: a file's **top-level** code may only use lexical `const`/`let` defined
in an earlier file. Function calls between files resolve at runtime, so function
placement is flexible; only top-level init order matters.

`domain/srs.js` loads right after `domain/logic.js` because `schedule()` calls
`Logic.fsrsUpdate()`, and every feature reads state through `getState()`.

## Why this shape (and why not more)

The goal was Clean-Architecture *principles* (separate the domain from the UI,
group by feature, cut duplication) without the ceremony that would hurt a
solo, no-build project. Full entities/use-cases/adapters layering was
deliberately avoided as over-engineering here.

## Known duplication still to remove (next pass, needs browser check)

These are real but touch click-handlers, so they should be changed with a live
browser open to confirm behaviour is identical:

1. **Filter-chip wiring** is copy-pasted ~6 times (study, sent, listen, tone,
   writing, rad). Extract one `shared/filterChips.js` helper.
2. **MCQ correct/wrong handling** exists in 3 places (session `renderMCQ`, plus
   the listen/tone option handlers). Extract one `shared/mcq.js`.
3. **`.sent-opt` vs `.listen-opt`** CSS is near-identical. Merge.

## Further splitting still possible (optional)

`practice/reference.js` bundles four views (sentences, tones, radicals,
grammar) and `app/ui.js` bundles several concerns (theme, welcome, shortcuts,
backup, writing). They can each be split into one file per concern later;
they were relocated whole in this pass to keep the change behaviour-safe.
