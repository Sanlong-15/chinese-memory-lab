# Deploy checklist

Your live site once fell behind because only some files were pushed. Follow
this every time so it never happens again.

## The files the website needs (push ALL of these together)

- index.html
- css/style.css
- js/data.js
- js/examples.js  (the example sentences — loaded on demand, but must be pushed)
- js/structures.js
- js/grammar.js
- js/logic.js
- js/core.js      (app split, part 1 — search, grid, audio, examples loader)
- js/detail.js    (app split, part 2 — word/character detail, tabs, deep links)
- js/reference.js (app split, part 3 — patterns, radicals, sentences, grammar, tones)
- js/study.js     (app split, part 4 — SRS, Study Mode, dashboard, listen)
- js/ui.js        (app split, part 5 — voice picker, flashcard, backup, writing, welcome, keyboard)
- js/main.js      (app split, part 6 — startup; loads last)
- js/upload.js

The old `js/app.js` was split into the six files above. It is no longer used —
delete it once with `git rm js/app.js`.

If you change even one, push the whole set. They depend on each other, and the
script order in index.html matters: data → structures → grammar → logic →
core → detail → reference → study → ui → main. `js/logic.js` (scheduler + tone +
dedupe) must load before the split files; `js/main.js` starts the app and loads last.

## Dev tools (optional to push, not used by the website)

`package.json`, `tests/`, `eslint.config.mjs`, `.prettierrc.json`, and
`.github/workflows/test.yml` are for testing only. GitHub Pages ignores them.
Push them if you want the green "tests" badge on your repo. To run locally:
`npm install`, then `npm test` (runs the unit tests) and `npm run lint`.

## Steps

1. Save all your changes.
2. In the project folder:

   ```
   git add -A
   git commit -m "update lab"
   git push
   ```

   `git add -A` also records the new .gitignore and removes the scratch files
   from the repo (they stay on your computer, just not on GitHub).

3. Wait about 1 minute for GitHub Pages to rebuild.
4. Open https://sanlong-15.github.io/chinese-memory-lab/ and **hard-refresh**
   (Ctrl+Shift+R on a laptop; on iPhone use a Private tab, which ignores the
   cache). Browsers cache old files — a normal refresh may show the old version.

## Security (#8)

- index.html has a Content-Security-Policy meta tag. It only allows scripts
  from your own site and jsDelivr, fonts from Google, and images from Wikimedia.
  This blocks any injected inline script from running. If a feature ever breaks
  after a change, check the browser console for a CSP error and add the needed
  source (or remove the meta tag to roll back — it's one line).
- External data (Wikimedia image URLs) is now HTML-escaped before it's shown.

### SRI (optional, do it once on your machine)

To lock the hanzi-writer CDN file so a hacked CDN can't swap in bad code, run:

```
curl -s https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

Then in index.html add the result to the hanzi-writer script tag:

```
<script src="https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js"
        integrity="sha384-PASTE_THE_HASH_HERE" crossorigin="anonymous"></script>
```

Don't add a made-up hash — a wrong one stops the character animations from loading.

## Cache-busting (why the files end with ?v=1)

In index.html the CSS and JS links end with `?v=1`. When you change those
files, bump every number by one (v=1 -> v=2) before you push. That new number
forces phones and browsers to download the fresh file instead of the cached
old one. This is the real fix for the "my phone shows the old version" problem.
5. Click every tab once: Word List, Pattern Families, Structures, Grammar,
   Sentences, Listen, Tones, Study Mode, Writing. If one is blank, a file
   didn't push — go back to step 2.

## Quick health check

The header should say: **1,331 words · HSK 1–4 complete · Boya L11–L14 · GCP7 L6**
and the tab row should include **Grammar, Sentences, Listen, Tones**.
If it doesn't, the push was incomplete.
