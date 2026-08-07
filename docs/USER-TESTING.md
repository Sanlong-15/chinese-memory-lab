# User Testing Kit — Phase 3

This is a moderated usability test you run with real learners. The goal is to
find where people get stuck and confused, not to hear "it's nice." Five people
is enough to surface ~80% of usability problems.

## Who to recruit

3–5 people who want to learn Chinese and have **never seen this app**. A mix:
one total beginner, one who's used Duolingo/Anki, one on a phone only. Don't use
people who already know how it works — you learn nothing from them.

## Setup (per session, ~25 min)

- Send them the live link: https://sanlong-15.github.io/chinese-memory-lab/
- Have them share their screen (phone or laptop) on a call, or sit beside them.
- **Golden rule: don't help and don't explain.** When they pause, ask "what are
  you thinking?" and wait. Their confusion is the data.
- Ask them to **think aloud** — say what they see, expect, and try.

## Task scenarios

Give one task at a time, in their words, without hints. Note where they hesitate,
click the wrong thing, or give up.

| # | Task (say this) | Success looks like | Watch for |
| --- | --- | --- | --- |
| 1 | "Start learning — do whatever the app suggests first." | They tap Start today's review and rate a card | Do they understand Again/Hard/Good/Easy? |
| 2 | "Find the guided course and finish the first lesson." | Learn → Course → Lesson 1 → pass the quiz | Do they find Course? Does the quiz feel fair? |
| 3 | "Look up the word 你 and explore related words." | Search or grid → open 你 → tap a related word | Is search obvious? Do they keep exploring? |
| 4 | "Practise only your typing, on HSK 1 words." | Practice → Practice → Typing + HSK 1 | Do they find the standalone practice picker? |
| 5 | "Check how you're doing." | Progress → reads streak/skills/retention | Do the numbers make sense to them? |
| 6 | "Change the voice used to read Chinese." | You → Audio → pick a voice | Does the dropdown behave? |

## After each task

- "On a scale of 1–5, how easy was that?" (1 = very hard)
- "What did you expect to happen that didn't?"

## After the whole session (SUS-style, 1–5 each)

1. I'd use this regularly to learn Chinese.
2. It was easy to find what I needed.
3. It felt consistent across screens.
4. I felt in control (never lost).
5. I trusted the information it showed me.

## Log every issue like this

| Screen | What happened | Severity | Frequency (of 5) |
| --- | --- | --- | --- |
| e.g. Course | Couldn't find the Course tab | High | 3 |

**Severity:** Blocker (couldn't complete) · High (completed but frustrated) ·
Medium (hesitated) · Low (cosmetic).

## Turn findings into fixes

Bring me the table. Prioritise by **Severity × Frequency**: anything a Blocker
or hit by 3+ people gets fixed first. This is how UX actually moves toward a 10 —
real confusion, found and removed. I'll implement each fix.
