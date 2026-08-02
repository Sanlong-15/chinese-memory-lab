# UX Redesign — Every Screen

Senior UX review of Chinese Memory Lab, grounded in the screens as they exist
today (Warm Stone theme, pill nav, flashcards, MCQ practice, dashboard, writing).
Method: Apple Human Interface Guidelines (clarity, deference, depth; Dynamic
Type; 44pt targets; reduce-motion) + Material Design 3 (type scale, tonal
surfaces, state layers, elevation, motion tokens, 48dp targets), **adapted** to
the app's calm, single-accent identity — not applied as bold Material color.

Honest framing first: the app's biggest UX wins are structural (the 5-destination
IA and the one-tap daily session), and those are largely done. This document is
about **craft** — hierarchy, rhythm, feedback, and accessibility polish. I resist
"redesign for its own sake": the Warm Stone aesthetic is an asset; the fixes
sharpen it, they don't replace it.

---

## Part 1 — Foundations (apply to every screen)

These solve the repeated issues once, so per-screen sections stay short.

### Type scale (HIG Dynamic Type × MD3 type scale)

Today the app mixes ad-hoc sizes. Define one scale and use only these:

| Role | Size / weight | Use |
|---|---|---|
| Display | 40–56 / 900 (Noto Serif) | the flashcard 汉字 only |
| Title-L | 22 / 700 (Zilla Slab) | screen titles |
| Title-M | 17 / 600 | card headers, section titles |
| Body | 15 / 400, line-height 1.5 | prose, definitions |
| Label | 13 / 600 | chips, buttons, tags |
| Caption | 11.5 / 500, +0.04em | metadata, counts |

Support **Dynamic Type**: use `rem`, respect the OS text-size setting, and let
lines wrap rather than truncate. Cap line length at ~65ch for intro prose (some
intros currently run full width and are hard to scan).

### Spacing (8pt grid)

Adopt a strict 4/8 scale: 4, 8, 12, 16, 24, 32, 48. Vertical rhythm in multiples
of 8. Current screens vary (6px, 10px, 14px ad-hoc). One scale = calmer pages.
Section gap 32; card padding 16–20; control gap 8–12.

### Color and dark mode (MD3 tonal surfaces)

- Keep the single terracotta accent (deference: color earns meaning by being
  rare). Reserve it for the primary action and active states only.
- Introduce **tonal surface steps** so cards read as layered, not flat-on-flat:
  page → surface-1 (card) → surface-2 (raised). You already have `--paper` /
  `--card`; add one more raised tone for popovers/flashcards.
- Dark mode: audit every hardcoded color for **APCA/WCAG contrast** (the rating
  buttons and some hints use fixed hex). Badges already moved to variables — do
  the same for `.rate-btn` colors, the `.subnav-btn`, and the jade/seal text on
  dark. Target ≥ 4.5:1 for text, ≥ 3:1 for large text and UI borders.
- Never signal state by color alone (add icon/weight/underline) — colour-blind
  safety.

### Motion (HIG reduce-motion × MD3 duration/easing tokens)

Define tokens: fast 120ms, base 200ms, slow 320ms; easing `cubic-bezier(.2,0,0,1)`
(MD3 emphasized). Use motion only to explain change (flip, advance, reveal),
never decoration. **Honor `prefers-reduced-motion`** (already implemented) — keep
that gate on every new animation.

### Touch targets and accessibility baseline

- Minimum hit target **44×44pt (HIG) / 48×48dp (MD3)** — several chips and the
  voice-picker chevron are smaller today.
- Visible focus ring on every interactive element (you added focus-visible — keep
  it consistent, 2px accent, 2px offset).
- Every control has an accessible name; decorative SVG `aria-hidden`; live
  regions for score/streak updates (partly done).
- Modal: focus trap + Esc + return focus (done for the detail overlay — extend to
  the welcome dialog).

### Component library (define once, reuse)

Buttons (filled / tonal / text), chips (filter), option tile (MCQ), metric card,
list row, card, dialog, nav bar. Each with hover/focus/pressed/disabled **state
layers** (MD3): a subtle overlay on interaction gives tactile feedback the app
currently lacks.

---

## Part 2 — Screen by screen

Each screen lists only its **deltas** beyond the foundations above.

### 2.1 Today — dashboard + start

- **Problems:** the start screen is very sparse (a line of text + one button on a
  large empty canvas); it under-sells the day and wastes vertical space.
- **Usability:** the single "1 due · 12 new" line is easy to miss; no sense of
  what a session contains.
- **Visual hierarchy:** make the CTA the clear focal point with a supporting
  stat row above it; add a compact streak/goal indicator so Today answers "how am
  I doing" at a glance (HIG: the home screen should orient).
- **Typography:** Title-L "Today", Body summary, Label on the stat chips.
- **Spacing:** center the block in a max-width column (~560px), 24 between
  elements; stop the content from floating in a wide void.
- **Components:** promote the summary to 2–3 small **metric cards** (due · new ·
  streak) above a full-width primary button.
- **Accessibility:** the CTA needs an aria-label describing the count ("Start
  today's review, 24 due, 5 new"); announce the count via `aria-live`.
- **Interaction:** pressing Start should feel like entering a flow — a brief
  cross-fade to the first card.
- **Animation:** count-up on the streak number on open (reduced-motion: no count).
- **Mobile:** the primary button should be thumb-reachable near the bottom; the
  bottom nav must not overlap it (safe-area already handled).
- **Dark mode:** the empty canvas reads flat — a faint surface tint behind the
  card gives it a home.

### 2.2 Today — task card (recognition / recall)

- **Problems:** the flashcard is a large flat panel with tiny hint text; the
  affordance to "tap to reveal" is weak.
- **Usability:** no visible progress within the card beyond "13 left" up top;
  reveal/rate is a two-step users may not discover.
- **Visual hierarchy:** the 汉字 is the hero (good); make the reveal state clearly
  distinct (elevate the card, reveal pinyin→meaning→story in a gentle stagger).
- **Typography:** Display for the character, Title-M pinyin, Body meaning, Caption
  Khmer; keep the memory-story sound-clue line as a tinted callout.
- **Spacing:** more breathing room inside the card (24–28 padding); separate the
  rating row with 16.
- **Components:** the four rating buttons should be equal-width tiles with a tiny
  interval hint ("~1d") and color+icon, not color alone.
- **Accessibility:** the card is a button — add role/label ("flashcard, tap to
  reveal"); rating buttons keyboard 1–4 (done) — surface that hint on screen.
- **Interaction:** a **flip** (Y-axis) on reveal reads better than a fade; swipe
  left/right on mobile to rate again/good (with visible affordance).
- **Animation:** 200ms flip; rated card slides out, next slides in (reduced: cut).
- **Mobile:** enlarge the tap area to the whole card; rating tiles ≥ 48dp tall.
- **Dark mode:** raise the flashcard one tonal step so it separates from the page.

### 2.3 Today — MCQ tasks (listening / tone / sentence) — shared

- **Problems:** four option tiles float below the prompt with modest spacing; the
  "Play again" button styling competes with options.
- **Usability:** on a wrong answer the correct/incorrect marking is good; add a
  one-line reveal (the meaning/pinyin) so the miss teaches.
- **Visual hierarchy:** prompt (audio icon or blanked sentence) clearly primary;
  options as a 2×2 grid of equal tiles.
- **Typography:** options in Title-M for Chinese, Body for English; the tone
  options ("3-3") deserve a clearer visual (contour glyphs, not just digits).
- **Spacing:** 12 gap grid; consistent tile height.
- **Components:** MCQ **option tile** with pressed/correct/incorrect state layers;
  a distinct, secondary "Play again" (icon button) so it doesn't read as an answer.
- **Accessibility:** options are buttons with labels; on answer, move focus/aria
  to the feedback; ensure audio has a visible control (not audio-only) for the
  hard-of-hearing (the listening task inherently needs a text fallback path).
- **Interaction:** number keys 1–4 select (done) — show the numbers on the tiles.
- **Animation:** correct tile pulses green, wrong shakes subtly then reveals.
- **Mobile:** tiles full-width-ish in 2 columns; ≥ 48dp.
- **Dark mode:** correct/incorrect tints need dark variants (green/red tuned for
  the dark surface, not the light-mode rgba).

### 2.4 Today — session summary

- **Problems:** text-only summary; the numbers (reviewed / % / streak) are prose.
- **Visual hierarchy:** show three metric cards (reviewed, accuracy, streak) with
  a celebratory but calm treatment; primary "Keep going" only if work remains.
- **Animation:** a gentle checkmark or streak bump (reduced-motion safe).
- **Everything else:** inherits foundations.

### 2.5 Learn — Vocabulary (word grid)

- **Problems:** dense grid of equal cards; search + 10 level chips wrap into a
  tall control block that pushes content down.
- **Usability:** no sort or "show only unlearned/leeches"; hard to find a word's
  status at a glance.
- **Visual hierarchy:** each card: 汉字 primary, pinyin secondary, English
  tertiary, level tag as a quiet badge (mostly there) — reduce the level-tag
  emphasis so it doesn't compete.
- **Typography:** 汉字 Title-L, pinyin Label accent, English Caption.
- **Spacing:** consistent card padding; 12 grid gap; give the search bar its own
  row and collapse level chips into a scrollable single row or a "Filter" menu
  (10 chips is a lot on mobile).
- **Components:** add a small **mastery ring/dot** per card (new/learning/mature)
  so browse doubles as progress; sticky search on scroll.
- **Accessibility:** cards are buttons with full labels (done); ensure the grid is
  navigable by keyboard in reading order.
- **Interaction:** tap → detail (done); long-press → quick actions (add to
  focus, hear); type-ahead search already tone-insensitive (good).
- **Animation:** results fade/reflow on filter (reduced: instant).
- **Mobile:** 2 columns; chips horizontally scrollable (you added this pattern for
  the old tabs — reuse for filters).
- **Dark mode:** card surface one step above page; level tag legible on dark.

### 2.6 Learn — Characters / Structures

- **Problems:** the structure example rows show **empty gray SVG boxes** (the
  shape diagram isn't rendering a visible glyph) — a real visual bug.
- **Usability:** the "base / most common" badges are useful; the empty icon
  undercuts the teaching.
- **Visual hierarchy:** the shape diagram should be the anchor of each row; fix or
  replace the SVG so the split (⿰ ⿱ ⿴) is visible.
- **Components:** render structure as a clear 2-tone split glyph; member chars as
  tappable chips (they are) with ≥ 44pt targets.
- **Everything else:** foundations. (Same for Radicals / Pattern Families —
  strong content, just needs the type scale and target sizes.)

### 2.7 Learn — Grammar

- **Problems:** pattern cards are text-dense.
- **Visual hierarchy:** lead each card with the **pattern formula** as a chip
  (把 … 了), then rule, then examples; today the formula competes with prose.
- **Typography:** formula in mono-ish/label style to read as a template; examples
  indented with the tappable audio affordance visible.
- **Interaction:** tap example → hear (exists) — make the speaker icon a clear
  44pt button.
- **Everything else:** foundations.

### 2.8 Learn — Sentences (reading) & Practice — Sentence cloze

- **Problems:** the cloze blank underline is subtle; options are large tiles that
  look like the answer is obvious.
- **Visual hierarchy:** sentence primary and large; the blank clearly marked;
  English meaning secondary directly under it.
- **Interaction:** on answer, the blank fills with a smooth swap and the whole
  sentence is spoken (exists) — add a replay control.
- **Everything else:** shares the MCQ foundations (2.3).

### 2.9 Practice — Flashcards (Study Mode)

- **Problems:** this screen is **overloaded** — dashboard moved out (good), but it
  still stacks: intro, mode toggle, direction toggle, 10 level chips, srs stats +
  reset, then the card. Too many controls above the actual task.
- **Usability:** first-time users face 4 control clusters before a card; the
  primary task (the flashcard) is pushed below the fold on mobile.
- **Visual hierarchy:** the **card is the hero** — move controls into a compact
  toolbar or an overflow menu; collapse mode + direction into segmented controls;
  put level filter behind a "Filter" chip.
- **Components:** MD3 **segmented button** for Review/Browse and for direction;
  a single filter entry instead of 10 inline chips.
- **Spacing:** cut the vertical stack roughly in half so the card is visible on
  first paint.
- **Accessibility:** segmented controls with `role=tablist`/aria-selected.
- **Mobile:** controls in one scrollable toolbar row; card immediately visible.
- **Everything else:** the card itself inherits 2.2.

### 2.10 Practice — Listening / Tones

- Covered by 2.3 (MCQ foundations). Screen-specific: the big "?" prompt card is
  good; add a **large primary play button** as the focal affordance (HIG: obvious
  primary action), and for tones, replace bare "3-3" with **tone-contour marks**
  (ˉ ˊ ˇ ˋ) so the answer is visual, not numeric.

### 2.11 Practice — Writing

- **Problems:** the trace character shows as a faint watermark (good), but the
  grid guides (米字格) and stroke feedback are minimal; controls (Prev / Show /
  Shuffle / Next) are a flat row.
- **Visual hierarchy:** the writing box is the hero — enlarge it, add the
  cross/rice guide lines, and a clear "your stroke vs. target" feedback color.
- **Interaction:** immediate per-stroke feedback (correct = accent, wrong = shake
  + retry); a subtle completion animation when the character finishes.
- **Components:** the four controls → one primary ("Show answer") + icon buttons
  for prev/next/shuffle.
- **Mobile:** the canvas should fill width with a comfortable drawing area (≥ 280px
  square); buttons ≥ 48dp; keep them clear of the bottom nav.
- **Dark mode:** the watermark and guide lines need a dark-mode tone (light gray
  on dark, not the light-mode faint).

### 2.12 Progress

- **Problems:** four metric numbers + a goal input; honest but flat — no trend,
  no sense of retention health (the real KPI).
- **Visual hierarchy:** lead with a **retention gauge** (rolling recall %) and
  streak; metrics as MD3 metric cards; add a small coverage bar per level and a
  "weak items" list.
- **Typography:** big numbers Title-L, labels Caption.
- **Components:** metric cards, a simple sparkline/gauge (respect reduced-motion),
  a leech list with a "focus" action.
- **Accessibility:** gauges need text equivalents (aria-label with the value).
- **Everything else:** foundations.

### 2.13 You — Settings

- **Problems:** a heading, the voice picker, and three data buttons — functional
  but unstructured; day/night lives elsewhere (header) which is inconsistent.
- **Visual hierarchy:** group into **list sections** (Appearance, Audio, Data,
  About) with MD3 list rows (label + control on the right); bring the theme toggle
  here as a proper row (leave the header shortcut too).
- **Components:** list rows with trailing switch/select/chevron; destructive
  actions (Reset) visually separated and confirmed.
- **Accessibility:** each row a labeled control; the voice select is a real
  listbox (done) — ensure 44pt rows.
- **Everything else:** foundations.

### 2.14 Global — navigation, header, dialogs

- **Navigation (group + subnav + bottom bar):**
  - Desktop: the primary groups read well; the sub-row should show which section
    you're in and stay put (sticky) so it doesn't scroll away.
  - Mobile: bottom nav is the right pattern (HIG tab bar / MD3 navigation bar) —
    ensure 5 items fit with labels, ≥ 48dp, active state = filled icon + accent
    label, and a top **large title** per HIG.
  - Consider a persistent **primary action** (Start review) — HIG toolbar / MD3
    FAB-style — so the daily session is always one tap.
- **Header:** the decorative 学习 stamp + title + subtitle is a tall banner that
  repeats on every screen and pushes content down; shrink it after first paint or
  make it a compact sticky app bar (HIG large-title that collapses on scroll).
- **Detail overlay (word/character):** good depth (HIG). Ensure the sheet
  animates up from the bottom on mobile (MD3 bottom sheet), has a grabber, and
  Esc/scrim-tap close (done); cap content width on desktop.
- **Welcome dialog:** extend the focus-trap/Esc treatment; make it a proper MD3
  dialog with a clear primary/secondary button pair.

---

## Part 3 — Prioritized changes (highest UX ROI first)

1. **De-clutter Practice → Flashcards** (2.9): segmented controls + filter menu so
   the card is the hero and visible on first paint. Biggest daily-use win.
2. **Fix the empty Structure SVGs** (2.6): a visible rendering bug.
3. **Collapsing header / large-title app bar** (2.14): reclaim vertical space on
   every screen, especially mobile.
4. **Tone-contour glyphs** instead of "3-3" (2.10): clearer, teaches the shape.
5. **Metric cards + retention gauge on Progress and Today** (2.1, 2.12): make
   "how am I doing" instant.
6. **State layers + consistent focus rings on all controls** (foundations):
   tactile feedback + accessibility in one pass.
7. **Dark-mode contrast audit** of the remaining hardcoded colors (rate buttons,
   correct/incorrect tints, subnav) (foundations).
8. **8pt spacing + single type scale** applied globally (foundations): the calmest
   possible version of the current look, no redesign risk.

## Honest notes

- Don't import Material's saturated color or heavy elevation — it would fight the
  Warm Stone calm. Take MD3's **structure** (type scale, state layers, motion
  tokens, nav patterns) and HIG's **restraint** (deference, large titles,
  reduce-motion), not their surface look.
- Several items here are polish, not bugs; the two genuine defects to fix first
  are the empty Structure SVGs and the overloaded Flashcards screen.
- All animation suggestions assume the existing `prefers-reduced-motion` gate
  stays on — keep it for every new transition.
</content>
