# Guided Course System — Design

Status: **Phase 1 implemented (v=48).** A structured, mastery-gated course layered
**additively** on top of the existing app (the free-explore views stay — nothing
working is removed). Shipped: `data/course.js` (HSK1 path, lesson 1 authored +
2 real scaffolds) and `features/course/course.js` (map, lesson player, quiz,
mastery gate, unlock). Wired under Learn → Course. Phases 2–4 (generator,
authoring, full path) remain.

## Principles

- **Additive.** New "Course" mode alongside Today / Learn / Practice / Progress /
  You. Free browsing and FSRS review remain untouched.
- **Reuse first.** 10 of the 17 lesson components already exist as data or
  features and are pulled at runtime by word id. Only objectives, tone notes,
  common mistakes, quizzes, and mastery are new.
- **Active recall.** Exercises and quizzes reuse the existing task renderers
  (recognize / recall / listen / tone / sentence), never passive reading.

### What already exists (reused, not rebuilt)

| Lesson component | Source in current app |
| --- | --- |
| Vocabulary | `DB.words` (by id) |
| Character breakdown | `word.breakdown`, `charInfo.parts` |
| Stroke order | HanziWriter (writing view) |
| Pinyin | `word.pinyin` |
| Native pronunciation | `speak()` (TTS) |
| Meaning | `word.english` + `word.khmer` |
| Memory story | `charInfo.story` (1,100 entries) |
| Radicals | `charInfo` + radical families (reference.js) |
| Example sentences | `word.ex_cn` / `word.examples` (all 1,377 have one) |
| Grammar explanation | `GRAMMAR` (12 patterns) |

### What is new (authored or generated)

Learning objective · tone explanation (auto-derivable from the words' tones) ·
common mistakes · mini exercises (from task renderers) · lesson quiz · mastery
check + unlock logic.

## 1. UX wireframe

**Course map (the path).** Vertical path of lesson nodes per level; locked nodes
are dimmed with a lock icon.

```
   Course                                   [Beginner ▸ HSK1 ▸ HSK2 ▸ HSK3 ▸ HSK4]

   ●  L1  Greetings            ✓ mastered
   │
   ●  L2  Numbers              ◐ in progress  (6/10)
   │
   ○  L3  Family               🔒 locked
   │
   ○  L4  Food                 🔒 locked
```

**Lesson player (scrollable, active-recall steps).**

```
  ← Course            HSK1 · Lesson 2 · Numbers          ● ● �○ ○  (progress)

  ┌───────────────────────────────────────────────┐
  │ OBJECTIVE                                       │
  │ Count 1–10 and say how many things you have.    │
  └───────────────────────────────────────────────┘

  STEP 1 · Meet the words   (Hear → Recognize → Understand)
  ┌───────────────────────────────────────────────┐
  │           三                                    │
  │        sān   (tone 1 — high, flat)   ▶ play     │
  │        three · បី                               │
  │   Story: three lines stacked = the number 3.    │
  │   Radical/parts: 三 = one + one + one           │
  │   [ stroke-order mini ]                          │
  └───────────────────────────────────────────────┘
        ‹ prev   1 / 10   next ›

  STEP 2 · Grammar note        (from GRAMMAR)
  STEP 3 · Common mistakes     "三 sān vs 山 shān — watch the tone"
  STEP 4 · Mini exercises      (recall / listen / tone — reused tasks)
  STEP 5 · Lesson quiz         (10 active-recall items)
  ┌───────────────────────────────────────────────┐
  │ MASTERY CHECK   You scored 9/10 (90%)  ✓        │
  │ Lesson 3 unlocked →                             │
  └───────────────────────────────────────────────┘
```

## 2. Component architecture (fits the vanilla, no-build layers)

```
js/
  data/
    course.js            NEW — COURSE: paths + lesson metadata (ids, objective,
                         wordIds, grammarKey, commonMistakes, mastery)
  features/
    course/
      course.js          NEW — course map render, lesson player, quiz, mastery,
                         unlock logic, progress storage
  (reused as-is)
    features/today/session.js   task renderers (renderFlashTask, renderMCQ,
                                renderListenTask, renderToneTask, sentence)
    shared/core.js              charStoryHTML, exampleBoxHTML, speak
    app/detail.js               switchView, LAZY_VIEWS, nav groups
    data/grammar.js             GRAMMAR
```

- New nav destination "Course" registered like the others (a group or a sub-view
  under Learn), rendered lazily via `LAZY_VIEWS` on first open. *Decision:* uses
  the established nav + lazy-render extension points — no new subsystem.
- The lesson player calls the **existing** task renderers for exercises and the
  quiz. *Decision:* one implementation of active-recall tasks, no duplication.
- Progress is one localStorage key; the FSRS scheduler is untouched. *Decision:*
  the course tracks *lesson mastery*; FSRS keeps tracking *long-term retention*.
  They are separate concerns and must not be entangled.

## 3. Data model

```js
// js/data/course.js
const COURSE = {
  paths: [
    { id: "beginner", title: "Beginner", lessons: ["beg-01", "beg-02"] },
    { id: "hsk1", title: "HSK 1", lessons: ["hsk1-01", "hsk1-02", /* ... */] },
    { id: "hsk2", title: "HSK 2", lessons: [/* ... */] },
    // hsk3, hsk4
  ],
  lessons: {
    "hsk1-02": {
      id: "hsk1-02",
      path: "hsk1",
      index: 2,
      title: "Numbers",
      objective: "Count 1–10 and say how many things you have.",
      wordIds: [12, 13, 14 /* ... reuse existing DB word ids */],
      toneNote: "auto|authored: focus on tone 1 vs tone 4 here",
      grammarKey: "了",                 // optional link into GRAMMAR
      commonMistakes: [
        "三 sān (three) vs 山 shān (mountain) — same shape family, different tone.",
      ],
      // quiz: omitted -> generated from wordIds; or authored item list
      mastery: { threshold: 0.9, tasks: ["recall", "listen", "tone"] },
    },
  },
};
```

```js
// progress — localStorage key "cml_course_v1"
{
  "hsk1-01": { status: "mastered", score: 0.95, masteredAt: 1720000000000 },
  "hsk1-02": { status: "inProgress", score: 0.6 },
  "hsk1-03": { status: "locked" }
}
```

Rules: lesson **N unlocks when N-1 is `mastered`**; the first lesson of a path is
always unlocked; mastery = quiz score ≥ `threshold`. Everything else in a lesson
(breakdown, story, radicals, stroke order, examples, pronunciation) is **derived
at render time from `wordIds` → `DB`** — no duplicated content.

## 4. Implementation plan (phased)

**Phase 1 — Engine + one real lesson (MVP, ~safe to build & verify).**
Build `features/course/course.js` + `data/course.js` with the HSK1 path scaffold
and **one fully authored lesson** (HSK1 · L1). Course map, lesson player pulling
all components from existing data, exercises + quiz via reused task renderers,
mastery gate unlocking L2. Proves the whole architecture end to end.

**Phase 2 — Lesson generator.** A build-time script chunks each level's words
into lessons of ~8–10, auto-derives tone notes, and wires stories/examples/
grammar by id. Turns ~100 lessons into generated scaffolds needing only light
authoring.

**Phase 3 — Authoring pass.** Objectives + common mistakes per lesson (the human
part), reviewed by the "Chinese teacher / HSK curriculum" hats.

**Phase 4 — Full path + polish.** Gating across Beginner→HSK4, progress on the
Track pillar, accessibility + mobile pass, docs.

## Rules honored

Additive (nothing removed) · reuses data and task renderers · follows the
architecture · no duplicate logic · lightweight (one data file + one feature
file) · mobile-first scroll player · WCAG (labelled steps, focus, aria-live) ·
subtle motion · FSRS untouched · active recall throughout · one pillar (Learn).

## Honest scope note

The engine and one lesson are a focused, verifiable build. The **full** HSK1–4
course is a multi-phase effort dominated by content authoring (100+ lessons),
not engineering. Recommend building Phase 1 as a vertical slice first, verifying
it live, then deciding how far to take Phases 2–4.
