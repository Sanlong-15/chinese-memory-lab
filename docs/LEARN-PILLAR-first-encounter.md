# Pillar 1 · Learn — First-encounter "Meet the word"

Status: **planned, not implemented.** A focused, single-pillar improvement that
strengthens the front of the learning funnel: **Hear → Recognize → Understand**,
before a new word is ever drilled.

## 1. Current implementation

When a brand-new word enters the daily session it is rendered by
`renderFlashTask(word, "recognize", …)` (`js/features/today/session.js`).
`Logic.pickTaskFromState` returns `"recognize"` for any word with no reps.
So the first time a learner meets a word: the **character shows first** with
"Tap to reveal", **audio plays only after the flip**, and the learner then
**rates** the word (feeding FSRS). A sound-family hint shows for new words, but
there is no deliberate first-exposure step.

## 2. Weakness

The funnel starts at **Recognize (a test)** instead of **Hear (exposure)**. On a
word never seen before, the app asks the learner to recognise it, plays the
sound only after the flip, and records a rating on something just met.

## 3. Why it matters

You cannot recognise what you have never encountered. Test-enhanced learning and
the generation effect require **prior encoding** — retrieval practice only helps
after a memory trace exists. Consequences today:

- The first FSRS rating on a new word is noise (rating a word you just met).
- Learners meet each word "backwards": tested before exposed.

This is the biggest gap versus the Hear → Understand philosophy.

## 4. The improvement

A one-time **"Meet the word"** first-encounter card, shown once before a word is
drilled, walking the first three stages of the philosophy:

- **Hear** — audio auto-plays on show, with a large replay button.
- **Recognize** — the character large + pinyin.
- **Understand** — English + Khmer meaning, the character breakdown/story,
  one example sentence, and the existing sound-family hint.
- One action: **"Got it — start practicing."** The word then enters normal FSRS
  drilling (recognize / recall / listen / tone / sentence) on later encounters.

## 5. UI/UX plan

- Reuse the `.flashcard` surface and the Warm Stone tokens — no new visual
  language.
- Mobile-first single column. Big 44px+ round play button (reuse the Listening
  screen's `.play-btn`). Meaning and story stacked below.
- Subtle fade-in only, gated by `prefers-reduced-motion`.
- Accessibility: `aria-live` announces the word; the card is a labelled region,
  **not** a button (there is nothing to flip). Play button is keyboard-focusable.
- It should read as a calm lesson, not a test.

## 6. Technical plan (with architecture decisions)

- **Add one task type `introduce`** to the existing `taskRenderers` registry in
  `session.js`. *Decision:* that registry is the established extension point;
  no new subsystem, follows current architecture.
- **In `buildDailyQueue`,** when a word is brand-new, prepend an `introduce`
  task before its first `recognize`. *Decision:* the queue is the single place
  task order is decided — keeps the logic in one spot, no duplication.
- **In `submitSessionAnswer`,** treat `introduce` like the existing tone-primer:
  advance only, no rating. *Decision:* a first exposure must not feed FSRS a
  meaningless grade; the scheduler math in `js/domain/logic.js` stays untouched.
- **Reuse** `speak`, `soundFamilyHint`, `charInfo`, the example fields, and
  existing CSS. Honors reuse / no-duplication / lightweight rules.
- **Track "introduced"** via the per-day counter already used for the new-word
  cap — no new storage.

Estimated size: a few dozen lines. One new renderer, one queue tweak. Zero
changes to data, the scheduler, or other pillars.

## 7–10. Implement / Test / Review / Next (when approved)

- **Implement:** the `introduce` renderer + queue prepend + submit special-case.
- **Test (headless harness):** the queue places `introduce` before the first
  drill for a new word; `introduce` advances without grading; every existing
  task type still renders; app still boots with 1,377 words.
- **Review:** live-eyeball checklist — start a session with new words, confirm
  the Meet-the-word card plays audio, shows story + example, and that pressing
  "Got it" moves into normal drilling.
- **Next phase suggestion:** Pillar 2 · Practice — a production/typing recall
  step (type the pinyin or pick the characters) to push words from Remember into
  **Use**.

## Rules honored

Never removes working functionality (adds a step before it); reuses components;
follows the architecture; no duplicate logic; lightweight; mobile-first; WCAG;
subtle animation; performance preserved; improves learning effectiveness; one
pillar only.
