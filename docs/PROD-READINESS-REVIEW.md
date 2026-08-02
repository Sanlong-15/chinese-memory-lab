# Production Readiness Review

A senior-engineer pass over the codebase. Real issues only, grouped by severity,
with evidence and fix direction. Trivial style nits are omitted.

Reviewed at app version `v=43`.

## Already solid (verified, no action needed)

- Backup / restore (`importProgress`) validates JSON, checks the app signature,
  confirms before overwriting, and only writes known keys.
- The fixed bottom nav respects the iPhone home indicator via
  `env(safe-area-inset-bottom)`.
- Speech-synthesis voices handle async loading (`onvoiceschanged` warm-up).
- Animations are GPU-friendly (`transform`/`opacity`) and gated behind
  `prefers-reduced-motion`.
- CSP is tight apart from the (intentional) Google Analytics additions.

---

## High — fix before calling it production-ready

### 1. Light-mode text fails WCAG AA contrast

Measured ratios against the current tokens (AA needs 4.5 for normal text):

| Pair | Ratio | Verdict |
| --- | --- | --- |
| `--ink-soft` on `--paper` | 4.23 | fails (secondary text / hints) |
| `--jade` on `--card` | 3.47 | fails (pinyin, links) |
| `--jade` on `--paper` | 3.13 | fails |
| `--seal` on `--paper` | 3.93 | fails |
| `--gold` on `--card` | 3.04 | fails |

Dark mode passes (6+). **Fix:** darken `--ink-soft`, `--jade`, `--seal`, `--gold`
in the light `:root` until each reaches 4.5 on its background.

### 2. Service worker is all-or-nothing and manually versioned

`sw.js` precaches a hardcoded list of `?v=43` URLs with `cache.addAll`, which
rejects the whole install if a single URL 404s — so one missed version bump means
**no offline at all, silently**. HanziWriter (CDN) is not precached, so writing
practice breaks on an offline first visit.

**Fix:** precache each item with an individual `catch` so one failure doesn't
kill the install; self-host HanziWriter or document that writing needs one online
visit first.

### 3. Dead, misleading feature link

The header advertises "+ Upload a new lesson from a PDF" but the link is
`href="index.html"` and `upload.js` is not loaded anywhere. Clicking reloads the
page. Advertising a feature that doesn't exist is a trust problem in a portfolio.

**Fix:** wire the upload flow or remove the link.

### 4. `renderGrid` injects data into `innerHTML` unescaped

`w.chinese / pinyin / english / level` are interpolated straight into template
HTML and into an `aria-label` attribute with no `escapeHTML`, though the helper
exists and is used on the Wikimedia path. Trusted today, but the upload feature
is a direct XSS vector the moment it ships, and any word containing `"` or `<`
breaks the markup.

**Fix:** escape those fields (and the attribute value) before injection.

---

## Medium

### 5. Manual `?v=` cache-busting across ~15 places

The version is hand-stamped in `index.html`, `core.js`, and `sw.js` every
release. Miss one and you ship a stale or broken asset. **Fix:** a small release
script that stamps a single version everywhere.

### 6. Known duplication still present

Filter-chip wiring is copy-pasted 6× (detail / reference / study / ui), the MCQ
correct/wrong handler exists in 3 places, and `.sent-opt` / `.listen-opt` CSS is
near-identical. **Fix:** extract `shared/filterChips.js` and `shared/mcq.js`.

### 7. Multi-feature files

`reference.js` bundles sentences + tones + radicals + grammar; `ui.js` bundles
theme + welcome + shortcuts + backup + writing. The refactor relocated them
whole. **Fix:** split per feature once each can be browser-verified.

### 8. Tap targets below 44px

Filter chips (`padding:9px 14px` ≈ 34px) and group-nav buttons (`8px 16px` ≈
34px) are under the 44px minimum (WCAG 2.5.5 / iOS HIG). **Fix:** raise vertical
padding or set `min-height:44px`.

### 9. iOS input zoom

`#searchBox` is `font-size:14px`; iOS Safari auto-zooms focused inputs under
16px. **Fix:** 16px on the search field.

### 10. Hardcoded colors that ignore dark mode

`.gram-badge`, `.rad-badge.tier-*`, `.struct-badge.tier-*`, `.rate-btn.*`, and
`.type-*` use literal hex (e.g. `background:#e0efe7; color:#2c5a48`) instead of
tokens, so they don't adapt in dark mode and risk contrast failures there.
**Fix:** move to theme variables with dark overrides.

### 11. Faux-bold numbers

`.summary-num`, `.dash-num`, `.ret-num` use `Zilla Slab` at `font-weight:700`,
but the font loads only `400;500;600`, so the browser synthesizes fake bold.
**Fix:** add 700 to the Zilla weights, or use 600.

### 12. Words grid isn't windowed

Lazy-render fixed startup, but opening Words still injects 1,331 cards, each
`tabindex="0"` — a punishing tab order for keyboard / screen-reader users and a
heavy layout. **Fix:** render a capped batch with "show more", or windowize.

---

## Lower / edge cases

### 13. Tone task with no tone marks

A word whose pinyin has only neutral tones or punctuation yields an empty tone
sequence and a degenerate multiple-choice. Verify the tone pool filters these.

### 14. Multi-character writing with missing stroke data

If one character in a word has no HanziWriter data, the completion counter never
reaches the character count, so "complete" (and the audio reward) never fires.
Give partial credit or skip missing-data characters.

### 15. Streak is local-date based

`dayStr` uses local date, so crossing time zones or DST can miscount the streak.
Minor, but real for a daily-habit app.

### 16. `words.js` is 183 KB gzipped and synchronous

The LCP floor. Chunking was deferred by choice; kept here so it stays on the
radar.

---

## Suggested fix order

1–4 (High) are what a senior reviewer would gate a release on. The tightest
safety-to-impact batch to do first: contrast tokens (1), SW resilience (2), the
dead upload link (3), and grid escaping (4).
