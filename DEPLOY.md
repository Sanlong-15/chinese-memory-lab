# Deploy checklist

Your live site once fell behind because only some files were pushed. Follow
this every time so it never happens again.

## The files the website needs (push ALL of these together)

- index.html
- css/style.css
- js/data.js
- js/logic.js
- js/app.js
- js/structures.js
- js/grammar.js
- js/upload.js

If you change even one, push the whole set. They depend on each other —
a new tab in index.html needs the matching code in js/app.js, or it breaks.
`js/logic.js` holds the scheduler + tone + dedupe logic and must load before
`js/app.js` (index.html already lists it in the right order).

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
