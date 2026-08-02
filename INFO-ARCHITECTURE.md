# Information Architecture — Navigation Redesign

Goal: reorganize the app's areas into a professional navigation structure —
Duolingo's focused primary nav + Notion's organized library.

Areas to place: Dashboard, Learn, Review, Flashcards, Practice, Writing,
Listening, Speaking, Grammar, Characters, Vocabulary, Sentences, Analytics,
Settings.

---

## 1. The core problem with a flat menu

Those 14 items are not peers. They mix three different *kinds* of thing:

- **Meta / status:** Dashboard, Analytics, Settings
- **Content (things to browse and read):** Characters, Vocabulary, Grammar,
  Sentences
- **Activities (things to do):** Review, Flashcards, Practice, Writing,
  Listening, Speaking

And several overlap: "Review" vs "Flashcards" vs "Practice" are all card
drilling; "Sentences" is both content (read) and an activity (cloze drill). A
flat 14-tab bar forces the user to resolve those overlaps every time.

The current app already shows the symptom — 9 top tabs that wrap awkwardly.

## 2. Principles

1. **Group by intent, not by feature.** Five clear destinations, not fourteen.
2. **≤ 5 primary destinations** (Duolingo). Everything else nests.
3. **One primary action per screen** ("Start today's review").
4. **Content vs activity split** (the key decision, see §4).
5. **Progressive disclosure** — the daily driver is one tap; reference is nested.
6. **Global search** as an escape hatch (Notion ⌘K) so depth never traps you.

## 3. The five primary destinations

| # | Destination | Intent | Icon |
|---|---|---|---|
| 1 | **Today** (Home) | "What do I do now?" | house |
| 2 | **Learn** (Library) | "Study / look something up" | book |
| 3 | **Practice** | "Drill a specific skill" | target |
| 4 | **Progress** | "How am I doing?" | chart |
| 5 | **You** | "Settings, data, account" | gear |

## 4. The key decision: content vs activity

The overlaps are resolved by one rule:

- **Learn** holds *content you browse and read* — the word, the character story,
  the grammar rule, an example bank. Passive/reference.
- **Practice** holds *activities that test you* — flashcards, cloze, listening,
  writing. Active/graded.
- **Today** holds the *scheduled* activity — spaced Review, chosen for you.

So "Sentences" appears in **Learn** (read example sentences) and its *drill* lives
in **Practice** (sentence cloze). "Review" is scheduled practice → **Today**;
"Flashcards" is free practice → **Practice**. This is exactly Duolingo's split
between the guided daily path and free "Practice hub."

## 5. Full mapping (every one of the 14 items placed)

| Requested area | Lives under | As |
|---|---|---|
| Dashboard | **Today** | the home screen itself |
| Review | **Today** | "Start today's review" — the daily session |
| Learn | **Learn** | the section itself |
| Vocabulary | Learn | word list, by level |
| Characters | Learn | character stories + decomposition + structures |
| Grammar | Learn | grammar patterns |
| Sentences | Learn (read) / Practice (drill) | example bank / cloze task |
| Practice | **Practice** | the hub itself |
| Flashcards | Practice | free SRS study (recognition/recall) |
| Writing | Practice | stroke-order practice |
| Listening | Practice | listening drill |
| Speaking | Practice | pronunciation drill *(not built yet — see §9)* |
| Analytics | **Progress** | retention, streak, coverage, weak items |
| Settings | **You** | theme, audio voice, daily goal, backup/restore |

Also placed (existing app content): Pattern Families / Radicals and Character
Structures → **Learn › Characters**; Tones → **Practice**.

## 6. The IA tree

```
Chinese Memory Lab
│
├─ Today  (Home / Dashboard)
│   ├─ Streak · goal ring · retention gauge · watch-list
│   └─ ▶ Start today's review   → the daily Session (spaced, interleaved)
│
├─ Learn  (Library — Notion-style nested tree)
│   ├─ Vocabulary          (word list by level: HSK 1–4, Boya, GCP)
│   ├─ Characters          (stories · decomposition · structures)
│   ├─ Radicals & Families (meaning radicals · sound-clue families)
│   ├─ Grammar             (patterns)
│   └─ Sentences           (example bank / reading)
│
├─ Practice  (Drill hub — Duolingo-style grid of modes)
│   ├─ Flashcards   (free SRS: recognition ↔ recall)
│   ├─ Listening
│   ├─ Speaking     [planned]
│   ├─ Tones
│   ├─ Sentences    (cloze)
│   └─ Writing      (stroke order)
│
├─ Progress  (Analytics)
│   ├─ Retention (30-day recall %) · mastery levels
│   ├─ Coverage by level · streak history
│   └─ Weak items / leeches
│
└─ You  (Settings)
    ├─ Preferences  (day/night · audio voice · daily goal)
    ├─ Data         (backup / restore · import a lesson)
    └─ About / Help
```

## 7. Navigation mechanics (Duolingo × Notion)

**Mobile — Duolingo model.** A fixed **bottom tab bar** with the five icons:
Today · Learn · Practice · Progress · You. Today is the default landing. It shows
one big CTA ("Start today's review") and the dashboard; everything else is a tap
away. No wrapping tab row.

**Desktop — Notion model.** A **left sidebar** with the five sections. **Learn**
expands into a collapsible nested tree (Vocabulary ▸ Characters ▸ Grammar ▸ …),
exactly like Notion's page tree. A slim **top bar** carries global search,
streak, and the theme toggle.

**Global search (⌘K / tap search).** One box searches across words, characters,
grammar, and sentences (already tone-insensitive) — a Notion-style command menu
so deep content is always one query away.

**Primary action, always visible.** From anywhere, a persistent "Review" affordance
returns the user to the daily session — the one thing that should never be more
than a tap away.

## 8. Migration from the current 9-tab layout

| Today's tab | Moves to |
|---|---|
| Word List | Learn › Vocabulary |
| Pattern Families | Learn › Radicals & Families |
| Structures | Learn › Characters |
| Grammar | Learn › Grammar |
| Sentences | Learn › Sentences (read) + Practice › Sentences (drill) |
| Listen | Practice › Listening |
| Tones | Practice › Tones |
| Study Mode | Practice › Flashcards (free) + Today (scheduled) |
| Writing | Practice › Writing |
| Today (new) | Today |

Net: 9 flat tabs → 5 intent-based destinations, no feature lost.

## 9. Honest notes

- **Speaking is not built.** There is no pronunciation-scoring feature yet. It
  belongs in **Practice**; until it exists, either omit it or show it as a
  clearly-labeled "planned" tile — don't ship a dead menu item.
- **"Learn" vs "Practice" is a real user-education point.** Some learners won't
  intuit that Learn = read, Practice = drill. A one-line subtitle on each
  destination ("Learn — study and look things up" / "Practice — drill a skill")
  removes the ambiguity.
- **Don't duplicate the engine.** Flashcards (Practice) and Today's Review are
  the *same* SRS underneath — one card state, two entry points (free vs.
  scheduled). Keep it one engine, or the two will drift.
- This is an **IA/navigation** redesign, not a visual redesign; it reuses the
  existing screens, just regrouped.
</content>
