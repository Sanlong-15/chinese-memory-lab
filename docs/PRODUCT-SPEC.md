# Chinese Memory Lab — Product Specification

Status: Draft v1 · Owner: Koko · Audience: engineering, design, self
Type: Product Requirements Document (PRD)
Scope: Beginner → HSK 4. Single-learner web app, later multi-user.

---

## 1. One-liner

Chinese Memory Lab helps a self-studying learner reach HSK 4 in the least study
time possible, by scheduling the right review at the right moment and training
recognition, recall, listening, and production of every word.

## 2. Problem and core value proposition

**Problem.** Most learners forget words faster than they add them. Free apps
(Duolingo) are fun but shallow; strong tools (Anki, Hack Chinese, Skritter,
Pleco) are powerful but fragmented — one app for scheduling, one for stroke
order, one for a dictionary. A beginner wastes time deciding *what* to study and
loses words they "learned" last week.

**Core value proposition.** One calm place that decides what you review each day
and proves you actually remember it. Every word is broken into an honest
character story, drilled in four directions (see it → mean it, mean it →
produce it, hear it, tone it), and scheduled by a memory model so you spend your
minutes only where forgetting is about to happen.

**Positioning line:** "Learn Chinese and *remember* it — one honest review at a
time."

**Why we win (differentiators):**

1. Memory-model scheduling (FSRS) instead of fixed intervals — fewer reviews for
   the same retention.
2. Honest character decomposition for every character (real components + a
   labeled mnemonic, never invented etymology).
3. One tool covering recognition, production, listening, tone, grammar, and
   stroke practice — no app-switching.
4. Zero-friction: works in a browser, no account required to start, progress is
   portable (export/import).

## 3. Target users (personas)

**P1 — "The Committed Self-Studier" (primary).**
Year-2 student, studies Chinese alongside coursework. Motivated but time-poor and
inconsistent. Wants: a clear "do this now," proof of progress, and to stop
forgetting. Fears: wasted time, losing streak, being overwhelmed. Success = can
sit a mock HSK section and pass.

**P2 — "The Returning Learner."**
Studied Chinese before, forgot most of it. Needs placement (skip what they know)
and fast re-activation of dormant memory. Values speed and not being treated as
a total beginner.

**P3 — "The Classroom Supplement."**
Follows a textbook (Boya, HSK, GCP) in a course. Wants the app to mirror their
lesson order and drill exactly this week's list. Values custom lessons (upload)
and per-lesson practice.

Non-target for v1: heritage speakers, advanced (HSK 5–6) learners, children.

## 4. Learning journey (beginner → HSK 4)

Framed as stages, each with an entry state, the system's job, and an exit gate.

| Stage | Learner state | System's job | Exit gate |
|---|---|---|---|
| 0. Onboard | New, unsure | Quick placement + set daily goal + first win | First review session finished |
| 1. Foundation (HSK 1) | ~150 words | Build core recognition + the 100 highest-frequency characters' stories | 90% retention on HSK 1 due cards |
| 2. Build (HSK 2–3) | 150→900 words | Add production (recall) + sentences + tones; interleave old and new | Can produce, not just recognize, HSK 1–2 |
| 3. Consolidate (HSK 4) | 900→1,200 words | Heavy interleaving, listening, grammar patterns, context sentences | Mock HSK 4 vocabulary pass |
| 4. Maintain | Post-HSK 4 | Pure spaced review, low daily load, retention guard | Stable 90%+ with < 15 min/day |

The journey is **not linear tabs** — it is a daily queue that always mixes stages
(interleaving). The learner never "finishes HSK 1" and moves on; HSK 1 words keep
returning until stable.

## 5. Feature roadmap (Now / Next / Later)

**Now (built or in progress).**
- FSRS scheduler with per-card stability/difficulty and target retention.
- Recognition + recall (production) directions in Study Mode.
- Character stories for 100% of characters; sentences; listening; tone drills;
  grammar patterns; stroke-order writing.
- Daily dashboard (streak, goal, due/new/learned counts).
- Progress backup/import; tone-insensitive search; lazy-loaded data.

**Next (highest learning ROI).**
1. **Placement test** — 5-minute adaptive quiz that seeds SRS state so returning
   learners skip known words (serves P2, P3).
2. **Unified daily session** — one "Start today" flow that interleaves recognition,
   recall, listening, tone, and a sentence, instead of separate tabs.
3. **Typed/handwritten production** — type the pinyin or draw the character, with
   immediate correctness feedback (error-based learning).
4. **Retention dashboard** — show true retention % and predicted workload, not
   just streak.

**Later.**
- Optional accounts + cross-device sync.
- Native recorded audio.
- Adaptive difficulty of distractors in multiple-choice.
- Weak-item "focus mode" and per-radical mastery view.
- Spaced review of grammar patterns and character components, not just words.

## 6. Core user flow

Primary loop (the 90% path):

```
Open app
  → Dashboard shows: "X due, Y new. ~Z min. [Start today's review]"
  → Session:
       card 1 (recognition)  → rate → feedback
       card 2 (recall/produce) → check → feedback
       card 3 (listening)     → choose → feedback
       card 4 (new word) → sees story → first rating
       ... interleaved, FSRS-ordered ...
  → Session summary: reviewed N, retention %, streak +1, next due tomorrow
  → Optional: "Learn 5 more" or "Practice sentences"
```

Secondary flows: Browse/look up a word; Add a lesson (upload PDF); Practice a
single mode; Export progress.

## 7. Information architecture and navigation

Group by intent, not by content type.

- **Today** (home): dashboard + the one CTA. Default screen.
- **Learn**: Word list, Character stories/structures, Grammar, Radicals.
- **Practice**: Study (SRS), Sentences, Listen, Tones, Writing.
- **Progress**: retention, streak, coverage, weak items, export/import.

Mobile: bottom bar with Today / Learn / Practice / Progress. The current 9-tab
row collapses into these four groups. Deep links (`#study`, `#today`) already
supported.

Principle: a new user should never face a decision harder than "press Start."

## 8. Dashboard ("Today") specification

Purpose: answer three questions in 3 seconds — *What do I do now? How much? Am I
on track?*

Components:

1. **Primary CTA card** — "Start today's review · 24 due · 5 new · ~11 min."
   One button. Disabled state never used; if nothing due, shows "All caught up —
   learn 5 new?"
2. **Streak + goal ring** — days in a row, today's goal progress (e.g. 11/20
   cards). Honest: streak counts a day only if the goal is met.
3. **Retention gauge** — rolling 30-day recall % (target line at 90%). This is
   the real health metric.
4. **Coverage bars** — % of each level with a story / marked known (HSK 1 … 4,
   Boya, GCP).
5. **Watch-list** — up to 5 "leech" words (many lapses) with a one-tap "focus"
   action.

Refuses to show vanity numbers alone (total words seen) without the retention
context.

## 9. Daily learning system

Goal: a fixed, finishable daily contract that adapts load to the learner.

Rules:
- Daily goal = target number of *reviews* (default 20), not new words. New words
  are capped separately (default 5–10/day) to prevent overload.
- **New words are gated by due load**: if too many reviews are due, introduce
  fewer or zero new words that day (protects retention over growth).
- One session interleaves: due reviews (recognition + recall + listen + tone,
  mixed) and the day's new words (shown with their story first, then a first
  rating).
- Session ends when the due queue for the goal is cleared; "learn more" is
  opt-in, never forced.
- Missed a day: no punishment spike. Due cards simply accumulate; the system
  smooths the catch-up over 2–3 days instead of dumping everything at once.

## 10. Review system (the engine)

Model: **FSRS-style** — each card tracks Stability (S) and Difficulty (D);
intervals are set to hit a target retention (default 90%).

- Four ratings: Again / Hard / Good / Easy → update S and D; interval = f(S).
- **Every mode feeds one card state.** A word rated in the recognition card,
  answered in a listening question, or produced in recall all update the *same*
  schedule. No siloed decks.
- **Directions as first-class:** recognition (中→meaning) and recall (meaning→中)
  are both scheduled; recall is weighted because production is harder and stronger.
- **Leech handling:** a word with N lapses gets flagged, surfaced on the
  watch-list, and its story re-shown before the next attempt.
- **Retention target is tunable:** raise it (95%) for exam crunch = more reviews;
  lower it (85%) for maintenance = fewer.
- Later: fit FSRS weights to the learner's own review history (needs a review log).

## 11. Gamification (motivation without junk)

Principle: reward the behavior that causes learning (consistent retrieval), never
raw volume. No pay-to-win, no dark patterns.

- **Streak** — days the daily goal was met. Streak *freeze* token (earn 1 per 7
  clean days) so one missed day doesn't wipe momentum. Reduces streak anxiety.
- **Mastery levels per word** — New → Learning → Young → Mature → Solid, based on
  stability, shown as a small ring. Progress you can see, tied to real memory.
- **Weekly "retention kept"** — celebrate that you *held* 90%+, not that you added
  words. Makes remembering the goal.
- **Milestones** — first 100 mature words, first level fully "solid," 30-day streak.
- Explicitly **no leaderboards, no lives/hearts, no streak-shaming** in v1
  (single-learner; competitive pressure is a P2/P3 later question).

## 12. Progress tracking

Three layers, each answering a different question:

1. **Am I healthy?** Rolling retention %, due-load trend, leech count.
2. **How far am I?** Coverage per level (recognized vs. mature), total mature
   words, characters with stories seen.
3. **What's weak?** Per-radical / per-tone / per-word-type accuracy so the learner
   sees *what kind* of thing they miss (e.g. 3rd-tone confusions, phono-semantic
   sound guesses).

All derived from the SRS log + daily log already stored locally. Exportable.

## 13. Motivation system

Behavioral design, mapped to why people quit (forgetting, overwhelm, no visible
progress, broken streak):

- **Fast first win** — onboarding ends with a completed mini-session, not a tour.
- **Finishable daily contract** — a clear end ("done for today"), so effort feels
  bounded, not infinite.
- **Progress you can feel** — mastery rings and retention gauge move every session.
- **Forgiveness** — streak freezes and smoothed catch-up remove the "I broke it,
  why bother" cliff.
- **Reason to return** — optional daily reminder / scheduled brief: "24 words are
  fading — 10 minutes keeps them."
- **Meaning over metrics** — surface *what you can now do* ("you can read 300
  HSK-1 words on sight"), not just counts.

## 14. Success metrics (KPIs)

North star: **words held at maturity** (stability > ~21 days) — the true measure
of durable learning.

Supporting:
- D1/D7/D30 retention of the *habit* (did the learner return and finish a session).
- Rolling recall accuracy on due cards (target ≥ 90%).
- New-words-per-week vs. mature-words-per-week (growth vs. durability balance).
- Time-to-HSK-N vocabulary mastery (words mature in that band).
- Median daily session length (target ≤ 15 min; efficiency, not more time).

## 15. Non-goals (v1)

- Not a chat tutor or grammar course replacement.
- Not full HSK 5–6 (later).
- Not a social/competitive product (no leaderboards yet).
- Not a backend-heavy platform — stays a static, portable web app until sync is
  actually needed.
- Not native-app — responsive web is the platform.

## 16. Risks and open questions

- **Content accuracy** — sentences and Khmer are AI-generated; a human check is
  still pending. Risk to trust. (Mitigation: review sheet, spot-checks.)
- **Single-device progress** — until sync ships, learners on two devices diverge;
  export/import is the stopgap.
- **Motivation for a solo product** — without social pressure, will streak +
  retention be enough? Needs real usage data.
- **FSRS defaults vs. personal weights** — good enough now; personalization needs
  a stored review log.
- Open: should recognition and recall be one card or two? (Two = stronger, but
  doubles review load — needs a load test with real data.)

---

## Appendix — the evidence-based principles this design serves

- **Active recall / retrieval practice** — every card asks you to produce the
  answer before revealing it; recall direction forces production.
- **Spaced repetition** — FSRS schedules by predicted forgetting.
- **Interleaving** — the daily session mixes levels, directions, and modes rather
  than blocking one type.
- **Chunking** — words grouped by shared sound-component and radical families.
- **Character decomposition / memory palace** — honest component breakdown plus a
  mnemonic hook per character.
- **Context + sentence learning** — cloze sentences train words as used, not
  isolated.
- **Immediate feedback / error-based learning** — instant correct/incorrect, with
  leeches re-taught from their story.
</content>
