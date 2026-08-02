# Character Memory Lab — Production Readiness Audit

Reviewed as if preparing for a real production release. State reflects the
project after Phases A–D (FSRS scheduler, recall mode, unit tests + lint + CI,
onboarding, keyboard + modal accessibility, smarter audio, cache-busting,
minimalist voice picker).

## Snapshot (facts)

- index.html 363 lines · css 788 · **app.js 1,961 lines** · logic.js 123 (pure, tested)
- data.js **2 MB**, loaded eagerly and synchronously
- 1,331 word entries (**1,275 distinct**), **6,655 example sentences**
- **445 of 1,077** characters have a memory story (**632 missing**)
- Accessibility: 17 aria attributes, 3 roles, **0 alt attributes**
- 10 unit tests, ESLint + Prettier, GitHub Action CI
- No backend, no accounts, localStorage only

Severity scale: Critical (blocks release) · High (fix before calling it
production) · Medium (fix soon after) · Low (polish).

---

## 1. Product vision

**Issue — the "one job" is not stated in-product.** Severity: Low.
Why it matters: a strong product answers "who is this for and what does it do"
in one line. The app is broad (words, grammar, radicals, structures, writing)
but never says its promise. Best practice: a single positioning line and a clear
primary action. Recommended solution: keep the new welcome dialog's "Start
today's review" as the north star; add one subtitle line ("Learn and *remember*
Chinese, one review at a time"). Expected impact: sharper first impression,
clearer portfolio story.

**Strength:** the scope is coherent and unusually deep for a free tool — SRS +
production recall + grammar + radicals + structures + stroke practice.

---

## 2. Learning effectiveness

**Issue 2.1 — content is unverified.** Severity: High.
Why it matters: 6,655 example sentences and all Khmer are AI-generated and never
checked by a human. A memorized wrong sentence is worse than none. Best practice:
native-speaker review of a sample before shipping; flag unverified content.
Recommended solution: the Khmer review sheet (Excel export → teacher marks fixes
→ re-import); spot-check a sample of sentences. Expected impact: trust in the
core material; removes the biggest learning risk.

**Issue 2.2 — 632 characters have no memory story.** Severity: Medium.
Why it matters: the character breakdown is the app's signature feature; 59% of
characters are missing it. Best practice: honest decomposition (real components
+ a labeled mnemonic, never invented etymology). Recommended solution: generate
in batches, you review each batch. Expected impact: the flagship feature covers
the whole vocabulary.

**Issue 2.3 — audio is browser TTS only.** Severity: Medium.
Why it matters: voice quality varies by device; some phones have no Mandarin
voice. We improved voice selection and added a clear fallback, but it is still
synthetic. Best practice: recorded native audio for listening/tone training.
Recommended solution: optional native audio for the most common words from a
free CC source, later. Expected impact: better listening and tone accuracy.

**Strength:** the scheduler is now FSRS-style (Anki/Hack-Chinese class), and
Study Mode has a recall (production) direction — this is genuinely strong.

---

## 3. User experience

**Issue 3.1 — progress lives in one browser.** Severity: High.
Why it matters: no account or sync means studying on phone and laptop never
merges, and clearing the browser wipes months of work. This is a real retention
and data-loss risk. Best practice: at minimum, export/import of progress; ideally
optional sync. Recommended solution: an "Export my progress" / "Import" button
that saves the SRS + daily JSON to a file. Expected impact: removes the fear of
losing progress; enables multi-device.

**Issue 3.2 — no undo on "Reset progress".** Severity: Medium.
Why it matters: a misclick can wipe SRS state irreversibly. Best practice: undo
window or a typed confirmation. Recommended solution: require typing the level
name, or keep a one-step undo snapshot. Expected impact: protects the user's
work.

**Strength:** onboarding, keyboard shortcuts, and a real day/night theme are in
place — above the bar for a solo project.

---

## 4. UI

**Issue 4.1 — a few status badges use fixed colors.** Severity: Low.
Why it matters: the SRS "due/new/learned" badges are hardcoded and may not fully
match dark mode. Best practice: theme every color via CSS variables. Recommended
solution: move badge colors to variables with light/dark values. Expected impact:
fully consistent dark mode.

**Strength:** clean single-accent Warm Stone system, cohesive spacing, and the
new minimalist voice picker are portfolio-grade.

---

## 5. Information architecture

**Issue 5.1 — nine top-level tabs.** Severity: Medium.
Why it matters: nine peers give no sense of hierarchy (what to do first vs.
reference material). Best practice: group by intent (Learn / Practice / Browse).
Recommended solution: you chose to keep tabs and make them mobile-friendly (done);
a future grouping is optional if the tab count grows. Expected impact: easier to
scan; lower overwhelm for new users.

---

## 6. Navigation

**Issue 6.1 — no deep links / no state in URL.** Severity: Low.
Why it matters: you cannot bookmark or share a specific tab or word; refresh
always lands on the default view. Best practice: reflect the active view (and
open word) in the URL hash. Recommended solution: `#study`, `#word/HSK1-3`.
Expected impact: shareable, bookmarkable, better back-button behavior.

**Strength:** mobile now scrolls tabs sideways with a bottom quick-bar; the active
tab auto-centers.

---

## 7. Search

**Issue 7.1 — search is basic and word-list only.** Severity: Medium.
Why it matters: search is a plain substring match on the word list; it is
tone-sensitive (typing "ni" may miss "nǐ"), does not search example sentences or
character stories, and is absent from other tabs. Best practice: diacritic- and
tone-insensitive matching, plus search across content. Recommended solution:
normalize pinyin (strip tone marks) for matching; extend search to sentences and
characters. Expected impact: users actually find what they want, faster.

---

## 8. Accessibility

**Issue 8.1 — zero alt text and no full contrast pass.** Severity: Medium.
Why it matters: images/SVGs have no alt (many are `aria-hidden`, which is fine
for decoration, but content graphics need labels); dark-mode badge contrast is
unverified against WCAG AA. Best practice: WCAG 2.1 AA — alt on meaningful
images, 4.5:1 text contrast. Recommended solution: add alt/aria-label to content
SVGs, run a contrast pass, keep the focus rings and reduced-motion support we
added. Expected impact: usable by screen-reader and low-vision users; stronger
portfolio signal.

**Strength:** modal is now a real dialog (focus trap, Esc, focus return),
keyboard shortcuts exist, focus rings and `prefers-reduced-motion` are honored.

---

## 9. Performance

**Issue 9.1 — 2 MB data.js loaded eagerly and synchronously.** Severity: High.
Why it matters: the browser parses 2 MB of JavaScript before the app runs; on a
mid-range phone this delays first paint. The 6,655 example sentences are most of
the weight but are not needed at startup. Best practice: split data by level and
lazy-load; load examples on demand. Recommended solution: move examples to a
separate file fetched when a word is opened; load the core word list first.
Expected impact: much faster first load, especially on mobile.

---

## 10. Code organization

**Issue 10.1 — app.js is a 1,961-line monolith.** Severity: Medium.
Why it matters: 60+ globals and shared mutable state make it hard to test and
easy to break; only the pure logic (scheduler, tone, dedupe) is extracted so far.
Best practice: small ES modules by feature. Recommended solution: split into
srs / study / sentences / listen / tone / grammar / structures / chardetail /
dashboard / theme / dom-utils. Expected impact: testable, safer to change, reads
as senior work.

**Strength:** the risky core is already isolated in a tested `logic.js` with CI.

---

## 11. Scalability

**Issue 11.1 — content is hand-edited JS objects.** Severity: Medium.
Why it matters: fine at 1.3k words, painful at 10k; every edit is manual and
risky. Best practice: JSON per lesson + a small build/validate step. Recommended
solution: store lessons as validated JSON, assemble at build/load time. Expected
impact: adding lessons stops being a merge-by-hand chore.

Non-goal (correct call): no backend/accounts yet — overkill for a solo learner.

---

## 12. Security

**Issue 12.1 — no Subresource Integrity on CDN scripts.** Severity: Medium.
Why it matters: hanzi-writer loads from a CDN with no integrity hash; a
compromised CDN could run arbitrary code in the app. Best practice: SRI
`integrity` + `crossorigin` on all third-party scripts, or self-host. Recommended
solution: add the integrity hash (or vendor the file). Expected impact: closes a
supply-chain hole.

**Issue 12.2 — innerHTML used with content (incl. uploaded lessons).**
Severity: Low (single-user, self-XSS only).
Why it matters: rendering data via innerHTML can inject markup; the PDF-upload
feature turns user text into DOM, so a crafted lesson could run script in your
own browser. Best practice: escape or use textContent for untrusted text; add a
Content-Security-Policy. Recommended solution: escape uploaded fields before
insertion; add a CSP meta tag. Expected impact: hardened against injection.

Overall security risk is low: static site, no secrets, no server, no accounts.

---

## 13. Mobile responsiveness

**Issue 13.1 — layout not verified on a real device yet.** Severity: Low.
Why it matters: the mobile CSS (sideways tabs, bottom bar, safe-area) is written
but only logic-tested, not eyeballed on the target iPhone. Best practice: test on
the real device and one small Android width. Recommended solution: your live
Private-tab test on the iPhone 17 Pro Max. Expected impact: confidence the phone
layout is correct.

**Strength:** breakpoint, safe-area inset, and a bottom nav are already built.

---

## 14. Maintainability

**Issue 14.1 — thin test coverage and no data validation.** Severity: Medium.
Why it matters: 10 tests cover the pure logic only; there is no automated check
that every word has the required fields (pinyin, english, khmer, chars). A bad
data edit can ship silently. Best practice: a schema/lint test over data.js in CI.
Recommended solution: add a Vitest that validates every word's shape and flags
missing fields or non-Chinese characters. Expected impact: bad data caught before
it reaches the site.

**Strength:** lint + Prettier + CI + a tested core already exist — the backbone
is there.

---

## Scores

Scored out of 100 for a solo, no-backend student project aimed at portfolio +
personal use (not a funded commercial product).

| Area | Score | One-line reason |
|---|---|---|
| **Overall** | **78** | Strong, cohesive, above student bar; held back by content verification, 2 MB load, and the monolith. |
| **UI** | **86** | Clean Warm Stone system, dark mode, minimalist picker. |
| **UX** | **80** | Onboarding, keyboard, modes; loses points on no progress export and basic search. |
| **Learning** | **82** | FSRS + recall + rich modes; capped by unverified content and 632 missing stories. |
| **Code quality** | **73** | Tested core + lint + CI is real; app.js monolith and innerHTML drag it down. |
| **Portfolio** | **85** | Presents very well for Year-2: algorithm, tests, a11y, design, docs. |

---

## Prioritized roadmap (highest impact first)

1. **Split + lazy-load data.js** (Perf, High). Biggest speed win, especially on
   your phone. Move the 6,655 examples out of the startup path.
2. **Verify content** (Learning, High). Khmer review sheet + sentence spot-check.
   Removes the biggest trust risk in the material.
3. **Progress export / import** (UX, High). One button to back up and move your
   SRS data. Protects months of work; enables phone + laptop.
4. **Data validation test in CI** (Maintainability, Medium). Catch broken word
   entries automatically. Cheap, high safety.
5. **Fill the 632 character stories** (Learning, Medium). Complete the flagship
   feature, in reviewed batches.
6. **Finish modularizing app.js** (Code org, Medium). Split the 1,961-line file
   into feature modules; unlocks the FSRS weight optimizer later.
7. **Search upgrade** (Search, Medium). Tone-insensitive, and across sentences +
   characters.
8. **Security hardening** (Medium). SRI on the CDN script, escape uploaded text,
   add a CSP meta tag.
9. **Accessibility pass** (Medium). Alt/aria-labels on content graphics, WCAG AA
   contrast check.
10. **Native audio + URL deep links + badge theming** (Low–Medium). Polish once
    the above are done.
