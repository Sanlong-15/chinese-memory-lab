# Implementation Plan — Unified Daily Session

Status: PLAN (awaiting Koko's okay before any code)
Feature: one "Start today" flow that interleaves recognition, recall, listening,
tone, and sentence tasks into a single FSRS-driven session.
Source of truth for current code: js/study.js, js/reference.js, js/core.js.

---

## 1. Problem

Today the learning modes live in separate tabs (Study, Sentences, Listen, Tones).
The learner has to *decide* what to practice and how much. That decision is
friction, and it means one word is only ever drilled one way per tab. Good tools,
no guidance.

## 2. What "done" looks like

A learner opens the app, presses one button, and gets a single session that:
- pulls the words due today from the FSRS scheduler,
- shows each due word as a **varied task** (recognition, recall, listening, tone,
  or a cloze sentence), interleaved, not blocked by type,
- gives immediate feedback,
- feeds every answer back into the *same* FSRS card state,
- introduces the day's new words (with their story) mixed in,
- ends with a clear summary and stops (finishable contract).

Done = the four existing practice modes can all be reached through this one flow,
they share one schedule, and a session can be completed start to finish.

## 3. Scope

**In scope (MVP):**
- A session controller that builds one interleaved queue and dispatches each item
  to the right task renderer.
- Reuse of existing render logic (flashcard, listen MCQ, tone MCQ, sentence cloze)
  wrapped behind a common interface.
- One rating path into `schedule(id, rating)` for every task type.
- New-word gating by due load (from the PRD daily-system rules).
- Session summary screen.

**Out of scope (later):**
- Two separate card states per direction (see Decision D1).
- Typed/handwritten production.
- FSRS weight personalization.
- Removing the old standalone tabs (keep them; the session is additive).

## 4. Key design decision (needs your okay)

**D1 — One card per word, varied task (RECOMMENDED) vs two cards per direction.**

- Option A (recommended, MVP): keep the current single card state per word. The
  session *chooses how to show it* each time (recognition / recall / listen /
  tone / sentence) based on the word and its state. Every attempt rates the same
  card. Pros: no load increase, reuses current model, ships fast. Cons: a word's
  two directions aren't tracked separately.
- Option B: separate FSRS cards for recognition and recall. Stronger memory, but
  ~doubles daily reviews and needs a bigger data-model change.

Plan below assumes **Option A**. Confirm before I build.

## 5. Architecture

New file: `js/session.js` (loads after study.js/reference.js, before main.js).
It owns the session; it calls existing renderers, it does not duplicate them.

```
session.js
  buildDailyQueue()        -> [ {word, task} , ... ]   (interleaved, FSRS-ordered)
  startSession()           -> reset counters, render first item
  renderItem(item)         -> dispatch by task type to a renderer
  submitAnswer(id, rating) -> schedule(id, rating); recordStudyDay(); next()
  renderSummary()          -> reviewed N, accuracy, streak, next due
```

Task types (MVP): `recognize`, `recall`, `listen`, `tone`, `sentence`.

Each task renderer must expose the same tiny contract so the controller stays
dumb:

```
taskRenderers[type] = {
  canUse(word)   -> bool     // e.g. tone needs tone marks; sentence needs an example
  render(word, onResult)     // draw the task; call onResult(rating) when answered
}
```

We wrap the *existing* logic:
- `recognize` / `recall` → the existing flashcard flip + Again/Hard/Good/Easy
  (paintFlashcard already supports both directions).
- `listen` → existing listen MCQ (buildListenPool/renderListen logic), mapped so a
  correct answer = "good", wrong = "again".
- `tone` → existing tone MCQ, same mapping.
- `sentence` → existing cloze (buildSentPool/renderSentence), same mapping.
  Requires examples (lazy-loaded) — call `ensureExamples` before including
  sentence tasks.

## 6. Task selection logic (per word)

For each due word, pick a task type to keep it varied and honest:

1. If the word is **new** → always `recognize` first (show the story, then a first
   rating). Never quiz a word the learner hasn't seen.
2. If the word is **young** (low stability) → prefer `recognize`, sometimes
   `listen`.
3. If the word is **maturing** → rotate toward harder tasks: `recall`, `tone`,
   `sentence` — production and listening, not just recognition.
4. Skip a task type if `canUse(word)` is false (no tone marks, no example yet).
5. Avoid showing the same word the same way two sessions in a row (store last
   task per word in the SRS state, small addition).

This is the interleaving + increasing-difficulty logic; it's a pure function, so
it's unit-testable.

## 7. Session lifecycle and rules

- Build queue = due cards (capped at daily goal) + up to N new words, where N is
  reduced if due load is high (PRD rule). Shuffle within FSRS priority so types
  interleave.
- Render one item at a time. On answer: `schedule()`, update counters, advance.
- "Again" re-inserts the word later in the same session (as it does now).
- End when the goal's due items are cleared → summary → optional "learn 5 more".
- All existing keyboard shortcuts (space flip, 1–4 rate) keep working in the
  recognition/recall tasks.

## 8. Data changes

Minimal. In the per-card SRS state (`cml_srs_v1`) add two optional fields:
- `lastTask` (string) — to avoid repeating the same task type.
- nothing else; S/D/reps/lapses already exist.

Backward-compatible: missing fields default cleanly (same pattern as the FSRS
migration we already did). The data validation test gets one new check.

## 9. UI (minimal, not the focus)

- One new "Today" view with the primary CTA and, during a session, a single
  task card area that the renderers draw into.
- Reuse existing card/option styles. No visual redesign in this feature.
- The old tabs stay for free practice and browsing.

## 10. Build steps (phased, each independently shippable & testable)

1. **Scaffolding:** create `js/session.js` + the `taskRenderers` registry with a
   no-op stub for each type. Wire the "Today" CTA to `startSession()`. Verify it
   loads and errors cleanly with an empty queue.
2. **Recognition/recall task:** wrap the existing flashcard so a rating calls
   `submitAnswer`. Session works with only these two task types end to end.
3. **Queue + selection:** implement `buildDailyQueue()` and `pickTask(word)` as
   pure functions; unit-test them (interleaving, new-first, canUse skipping,
   no-repeat). No UI needed to test.
4. **Listen + tone tasks:** wrap existing MCQ logic; map correct/incorrect →
   good/again into `schedule`.
5. **Sentence task:** wrap cloze; gate behind `ensureExamples`.
6. **New-word gating + summary screen.**
7. **Polish:** keyboard, "learn more," empty/all-caught-up state.

Each step: `node --check`, headless smoke, and (for steps 3, 6) new Vitest units
on the pure logic.

## 11. Testing

- Unit (Vitest, pure logic): queue interleaving, task selection rules, load-gating
  of new words, correct→rating mapping.
- Headless smoke: build a session from real data.js, walk N items, assert every
  answer reaches `schedule` and the queue empties.
- Manual (you, live): finish one real session on phone + laptop.

## 12. Risks and mitigations

- **Regression risk** to the working modes → build session.js as a *new* layer
  that calls existing functions; don't rewrite the modes. Old tabs keep working.
- **Sentence/tone availability** → `canUse` guards skip words that can't support
  a task; session never shows a broken card.
- **Load feel** → cap the session at the daily goal so it stays finishable.
- **Scope creep** → Option A only; no two-card model, no typed input in MVP.

## 13. Open questions for you

1. D1: confirm Option A (one card, varied task) for MVP? (Recommended.)
2. Daily goal default — keep 20 reviews / 5–10 new, or different?
3. Should the old separate tabs stay visible, or move under "free practice" once
   the session exists? (Recommended: keep them for now.)
</content>
