# Accessibility Audit — Phase 3

Automated tools catch maybe 30% of accessibility problems. The rest you find by
actually using the app the way a disabled person would. This is the by-hand pass.
Tick each box on the deployed site: https://sanlong-15.github.io/chinese-memory-lab/

## Part A — VoiceOver on your iPhone (screen reader)

Turn on: Settings → Accessibility → VoiceOver (or triple-click the side button if
you set that shortcut). Basics: swipe right = next item, double-tap = activate,
two-finger swipe up = read from top.

Go through the app **with your eyes closed** where you can. If you can't tell what
something is or does by listening, that's a fail.

- [ ] Each nav button announces its name and that it's a button (not "button" alone)
- [ ] The daily review card reads the Chinese, then pinyin, then meaning in a sensible order
- [ ] Again / Hard / Good / Easy buttons announce their label
- [ ] The play/audio buttons say what they do, not just "button"
- [ ] Course lesson nodes announce locked vs unlocked
- [ ] The word grid: each card announces the character and meaning
- [ ] Opening a word detail moves focus into the overlay (VoiceOver lands inside it)
- [ ] Closing the overlay returns focus to where you were
- [ ] The voice dropdown: options are reachable and announce which is selected
- [ ] No item reads as a meaningless string (e.g. "image", raw emoji, or "clickable")
- [ ] Nothing important is skipped when swiping through in order

## Part B — Keyboard only (desktop, no mouse)

Unplug the mouse or don't touch the trackpad. Use **Tab**, **Shift+Tab**,
**Enter**, **Space**, **Esc**, arrow keys.

- [ ] Tab reaches every button and link in a logical order
- [ ] The focused element always has a **visible ring** (never invisible)
- [ ] Enter/Space activate the focused control
- [ ] In the daily review, you can rate a card without a mouse
- [ ] Opening a word detail traps focus in the overlay (Tab doesn't escape behind it)
- [ ] **Esc** closes the overlay / any open menu
- [ ] The voice dropdown opens and you can pick with arrow keys + Enter
- [ ] You never get "stuck" — focus can always move on

## Part C — Vision and motion

- [ ] Zoom the browser to 200% — no text is cut off or overlapping
- [ ] Test both light and dark theme — text stays readable in both
- [ ] Turn on **Reduce Motion** (iOS: Accessibility → Motion) — animations calm down,
      nothing important only conveyed by an animation
- [ ] Check with a color-blindness simulator that meaning isn't shown by color alone
      (tones use both color **and** the contour glyph — verify that holds everywhere)

## Log fails the same way as user testing

| Screen | What failed | WCAG idea | Severity |
| --- | --- | --- | --- |
| e.g. Word detail | Focus didn't enter the overlay | Focus management | High |

Bring me the fails. Focus-management and label fixes are usually small and I can
do them fast. This is the honest path to an Accessibility 10 — a real screen
reader, real keyboard, real fixes.
