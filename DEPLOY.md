# Deploy checklist

Your live site once fell behind because only some files were pushed. Follow
this every time so it never happens again.

## The files the website needs (push ALL of these together)

- index.html
- css/style.css
- js/data.js
- js/app.js
- js/structures.js
- js/grammar.js
- js/upload.js

If you change even one, push the whole set. They depend on each other —
a new tab in index.html needs the matching code in js/app.js, or it breaks.

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
   (Ctrl+Shift+R). Browsers cache old files — a normal refresh may show the
   old version.
5. Click every tab once: Word List, Pattern Families, Structures, Grammar,
   Sentences, Listen, Tones, Study Mode, Writing. If one is blank, a file
   didn't push — go back to step 2.

## Quick health check

The header should say: **1,331 words · HSK 1–4 complete · Boya L11–L14 · GCP7 L6**
and the tab row should include **Grammar, Sentences, Listen, Tones**.
If it doesn't, the push was incomplete.
