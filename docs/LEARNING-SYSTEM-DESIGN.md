# Learning System Design — Evidence-Based Redesign

Perspective: cognitive scientist + Chinese-language pedagogy.
Goal: maximum durable learning per minute, beginner → HSK 4.
Constraint: learning efficiency only, not interface.

---

## 0. The one core loop

Every principle below serves a single loop:

**Encode richly → retrieve effortfully → space the retrieval → correct errors immediately.**

If a design decision does not strengthen one of those four moves, it is
decoration. Efficiency comes from doing only these four, well, and never letting
the learner *re-read* when they could *retrieve*.

A note on unit choice: the atom of learning is the **word**, not the isolated
character. Characters are decomposed to *encode* the word (see §7), but retrieval,
scheduling, and testing all happen at the word level, because that is the unit of
use.

---

## 1. Retrieval practice, active recall, and the testing effect

These three names describe one finding: **the act of pulling information from
memory strengthens it far more than re-studying it** (Roediger & Karpicke). A
test is not measurement; it *is* the learning event.

Apply:
- Never show meaning before the learner has tried to retrieve it. The default
  card is a question, not a fact.
- Weight *production* over *recognition*. Recognizing 你好 is easy and weak;
  producing 你好 from the meaning is hard and strong (the **generation effect**).
- A "reveal" should always follow an attempt, never replace it.

Pitfall: multiple-choice recognition feels like retrieval but is the weakest
form — the answer is in front of you. Use it for early/listening exposure, then
graduate the word to free production.

Efficiency rule: **every second the learner spends reading instead of retrieving
is close to wasted.**

## 2. Spaced repetition

Memory decays predictably (the forgetting curve); reviewing *just before*
predicted forgetting yields the most durable memory for the least effort (the
spacing effect). This is the single largest efficiency lever.

Apply:
- Schedule by a memory model (FSRS): track per-word **stability** (how long the
  memory lasts) and **difficulty**, and review at a target retention (~90%).
- 90% is the efficiency sweet spot. Higher (95%) = many more reviews for little
  gain; lower (80%) = cheap now, expensive relearning later.
- One schedule per word, fed by *every* task type (recognition, recall,
  listening, tone, sentence). Do not run parallel decks — that fragments the
  memory signal.

Pitfall: "review everything every day" (Duolingo-style) wastes time on words that
aren't fading and neglects the ones that are.

## 3. Interleaving

Mixing different items and item-types in one session beats blocking (all of one
kind, then all of the next). Interleaving forces the brain to *discriminate*
which retrieval strategy applies, which is exactly the skill needed in real use
(Rohrer). It feels harder and less fluent — and produces better retention. This
is a **desirable difficulty**.

Apply:
- One daily session mixes levels (HSK 1 words next to HSK 3), directions
  (recognition next to recall), and modalities (a tone task, then a sentence,
  then a listening item).
- Never "finish HSK 1" then move on. Old words keep returning, interleaved, until
  stable.

Pitfall: learners *prefer* blocking because it feels smoother. Smoothness is the
warning sign, not the goal.

## 4. Desirable difficulty (the organizing idea)

Interleaving, spacing to the edge of forgetting, and production over recognition
are all instances of one principle: **conditions that make practice feel harder
and slower usually make memory stronger and more flexible.** Design *toward*
appropriate struggle, away from fluent re-reading.

The knob: match difficulty to the word's maturity.
- New / young word → recognition, generous cues (encode first).
- Maturing word → recall/production, fewer cues.
- Solid word → production in context (sentence, listening), long spacing.

## 5. Immediate feedback and error-based learning

Feedback must be **immediate and corrective** — the memory of the error and its
fix must be co-active. Delayed feedback lets the wrong trace consolidate.
Critically, an error that is *corrected right away* produces **better** final
learning than avoiding errors altogether (the hypercorrection effect: confident
mistakes, once corrected, are especially well remembered).

Apply:
- On every answer: reveal correct/incorrect at once; on a miss, show the right
  answer and let it linger a beat longer than a hit.
- Treat a wrong answer as a scheduling signal ("Again"): stability resets, the
  word returns soon, and its encoding (the character story) is re-shown before
  the next attempt.
- **Leeches** (words missed repeatedly) get extra elaboration, not just more
  repetitions — repetition alone rarely fixes a bad encoding.

Pitfall: punishing errors (streak loss, shaming) suppresses the very error-making
that drives learning. Errors are the mechanism, not the failure.

## 6. Chunking

Working memory holds ~4 items; expertise is largely the ability to see one
**chunk** where a novice sees many parts. In Chinese, the wins are:
- **Sound-clue (phono-semantic) families:** ~80% of characters pair a meaning
  radical with a sound component. Learn the sound component once (青 → qīng) and
  a dozen characters become "one chunk + a radical" (清 请 情 晴 …). This is the
  highest-yield chunking in the language.
- **Meaning radicals:** grouping by radical lets a learner guess a character's
  domain before knowing it, and stores many characters under one hook.
- **Words as chunks:** a two-character word is one meaning unit, not two lookups.

Apply: introduce a new character *next to its family*, so the learner encodes a
pattern, not an isolated shape. Teach the sound component explicitly.

## 7. Character decomposition (elaborative encoding)

Decomposition is an **encoding** technique, not a retrieval one. Breaking a
character into real components and tying them to a short story creates multiple
retrieval routes (dual coding: verbal + visual). 好 = 女 (woman) + 子 (child) →
"a mother with her child = good" is remembered because it is *meaningful*, not
because it was repeated.

Apply:
- Every character gets an **honest** decomposition: real components + a clearly
  labeled memory hook. Never invent false etymology — a wrong story is a wrong
  memory that must later be unlearned.
- Show the story at first encounter and again when the word becomes a leech.
- Distinguish sound components (help pronunciation) from meaning components (help
  meaning) so the hook points the right way.

Pitfall: over-elaborate stories cost more to encode than they save. Keep hooks
short; the point is *meaning*, not entertainment.

## 8. Memory palace (method of loci) — honest scope

The method of loci is extremely powerful for **ordered lists** (a fixed sequence
placed along a familiar route). For a large, non-sequential vocabulary it is *not*
the most efficient tool — building and maintaining hundreds of loci costs more
than the mnemonic-plus-spacing approach, and vocabulary isn't inherently ordered.

Where it genuinely helps, use it narrowly:
- Fixed sequences: tones (1–2–3–4), stroke order, radical-position rules, the
  days/months, measure-word sets.
- A per-radical "room": a mental location that anchors a radical and the family
  of characters that share it (this merges loci with chunking, which is where it
  pays off).

Honest verdict: for word learning, **character decomposition + spacing beats a
full memory palace.** Reserve loci for ordered material and radical anchoring.

## 9. Context learning and sentence learning

**Encoding specificity:** memory is cued best by contexts resembling those at
encoding. A word learned only in isolation is retrievable only in isolation.
Words met and tested *inside sentences* transfer to real comprehension and
production. Sentences also supply grammar, collocation, and disambiguation of
polysemy for free (**dual coding** again: the word rides on a scene).

Apply:
- After a word is recognized in isolation, graduate it to **cloze** (fill the
  blank in a real sentence) and to **listening** (hear it in a spoken sentence).
- Teach grammar patterns as reusable frames ("把 … 了", "越 … 越 …") so words
  become productive, not just recognizable.
- Keep sentences at or just below the learner's level (i+1): comprehensible,
  slightly stretching.

Pitfall: sentences that are too hard turn retrieval into decoding and kill the
spacing benefit. Gate sentence tasks to words the learner already recognizes.

## 10. The word's lifecycle (the synthesis)

One word moves through increasing difficulty as its stability grows. This is
where all the principles combine into a schedule:

| Stage | State | Task (retrieval mode) | Principles active |
|---|---|---|---|
| Encounter | new | See character story + decomposition; recognition | decomposition, chunking, dual coding |
| Young | reps 1–2 | Recognition; occasional listening | retrieval, immediate feedback |
| Maturing | reps 3–5 | **Recall/production**; tone; first cloze | generation effect, desirable difficulty |
| Solid | reps 6+ | Production in context (sentence, listening) | context/encoding specificity |
| Maintain | high stability | Long-spaced production, mixed | spacing, interleaving |

Every stage: interleaved with other words, scheduled by FSRS, corrected on the
spot. A miss at any stage drops the word back and re-shows its encoding.

## 11. Optimal flow, beginner → HSK 4

Stages are defined by *what to introduce and how to test*, not by tabs. The daily
session always interleaves across stages.

**Stage A — Foundation (HSK 1, ~150 words, top ~150 characters).**
- Introduce ≤ ~8–12 new words/day (protect encoding quality and next-day load).
- Front-load the **100 most frequent characters** and their decompositions —
  they recombine into most later words (highest ROI in the language).
- Tasks: mostly recognition + listening; begin recall once a word has 2–3 clean
  reps. Introduce tones as an explicit ordered skill early.
- Chunk from day one: teach a few sound-components (马→mā/mǎ; 青→qīng) so the
  learner sees families forming.

**Stage B — Build (HSK 2–3, to ~900 words).**
- Shift the mix toward **production**: recall becomes the default for maturing
  words; add cloze sentences.
- Interleave HSK 1 (now in production) with HSK 2–3 (in recognition).
- Grammar patterns enter here — words must become *usable*, not just known.
- Keep new-word intake gated by due load: if reviews pile up, add fewer new
  words. Retention beats growth.

**Stage C — Consolidate (HSK 4, to ~1,200 words).**
- Production-heavy and context-heavy: sentence cloze and listening dominate for
  mature words; recall for maturing; recognition only for the newest.
- Maximum interleaving across all four HSK bands.
- Leech focus: the words that resist get extra elaboration and tighter spacing.

**Stage D — Maintain.**
- Pure spaced production, low daily load, mixed bands. The goal shifts from
  adding to *holding* ≥ 90% with minimal time.

**Daily session composition (any stage):** due reviews first (capped to a
finishable goal ~20), then a gated handful of new words, all interleaved by
maturity so task types alternate. New words always begin with their story
(encode), then enter retrieval next session.

## 12. Efficiency levers (do) and traps (avoid)

Do:
- Retrieve, don't re-read. Convert every "study" moment into a test.
- Space to ~90% retention with a memory model.
- Interleave levels, directions, and modalities.
- Encode once, richly (honest decomposition), then rely on spacing.
- Correct errors instantly; re-teach leeches from their encoding.

Avoid:
- Blocked, massed practice (feels productive, isn't).
- Recognition-only study (recognizable ≠ usable).
- Reviewing non-fading words daily (wastes the scarce resource: attention).
- New words uncapped (encoding debt → tomorrow's overload).
- Fake etymology / over-long mnemonics (a wrong or costly encoding is negative
  value).

## 13. Honest caveats

- Effect sizes are real but vary by learner and material; treat the numbers
  (90% retention, ≤12 new/day) as tuned defaults, not laws — measure and adjust.
- Memory palace is oversold for vocabulary; it earns its place only for ordered
  material and radical anchoring (§8).
- Mnemonics accelerate *encoding* but do not replace spaced *retrieval*; a great
  story still needs to be tested over time.
- The biggest real-world variable is **consistency**. The most efficient system
  is the one the learner actually returns to daily; a slightly weaker method used
  every day beats a perfect method used twice a week.
</content>
