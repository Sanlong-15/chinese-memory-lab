# Character Memory Lab — Roadmap v2

Updated after building Phase 1 and most of Phase 2.

## The honest truth first

The app is now feature-rich — more complete than most paid apps for your
level. **More features will not help much now.** Two things matter more than
any new build:

1. **Study every day.** The dashboard measures the habit; it can't create it.
2. **Grammar.** The one real gap. You have words and sentences but nothing
   teaches the glue between them.

If you only do one thing: open Study Mode daily and keep the streak alive.

## Already built (done)

- 1,331 words, full cards (pinyin, English, Khmer, breakdown, 5 examples)
- Pattern families: sound-clue + meaning radicals (47 radicals)
- Character structures (汉字结构) — the shapes
- Study Mode with spaced repetition + daily dashboard (streak, goal, stats)
- Sentence practice (fill the blank)
- Listening practice (hear it, pick the meaning)
- Character detail page + related words (the character web)
- Writing practice (stroke order)

## What actually matters next

### 1. Grammar patterns  ⭐ the real gap
- **What:** a "Grammar" tab. Short, simple lessons on the key HSK 3–4 patterns:
  了 (change / done), 把 (do something to a thing), 被 (passive),
  是…的 (emphasis), 比 (comparison), 得 (how well), 一…就… , 因为…所以… .
  Each pattern: one plain-English rule + 3–4 example sentences pulled from
  your own words.
- **Why:** this is what moves you from recognizing words to *making sentences*.
  No other feature covers it.
- **Cost:** medium. I write the grammar content; the app just displays it.

### 2. Tone practice
- **What:** hear a word, pick its tone pattern (e.g. 4th-3rd).
- **Why:** wrong tones are the top reason people misunderstand you.
- **Cost:** medium.

### 3. Connect the modes to spaced repetition (efficiency)
- **What:** when you miss a word in Sentences or Listen, it comes back sooner
  in Study Mode.
- **Why:** right now the three modes are separate. Linking them means every
  mode feeds one memory system. Big efficiency multiplier.
- **Cost:** medium.

### 4. Smarter "All" study
- **What:** when studying "All", show each word once even if it appears in
  several lessons (会话, 提前, 其实 are now in multiple tracks).
- **Why:** stop reviewing the same word 3 times.
- **Cost:** low.

## Quality and hygiene (not features, but important)

- **Deploy checklist.** Your live site was behind — missing Sentences and
  Listen. Always push together: index.html, js/app.js, js/data.js,
  js/structures.js, css/style.css. Then reload the live site once.
- **.gitignore.** Stop pushing scratch/backup files (_batch*, _source_*,
  *.backup-*) to GitHub. They clutter a public repo.
- **Khmer verification.** All Khmer is my best effort, never checked by a
  native speaker. Verify before you memorize — it matters more as words get
  abstract.
- **Fix flagged entries.** 一定 listed as "fair" (should be "certainly");
  辞 given as standalone (natural word is 辞职). Check against your books.

## What no app can do

To actually **speak**, you must speak — shadow the audio out loud, or talk
with a person. The app builds input. Output is on you.

## Suggested order

1. Grammar patterns  ← build this next
2. Tone practice
3. Connect modes to SRS + dedupe "All"
4. Cleanup: .gitignore, deploy checklist, Khmer check
