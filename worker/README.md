# Setting up the lesson generator backend

This backend is what lets the "Upload a Lesson" screen call Claude automatically. It's a small script (a "Worker") that lives on Cloudflare's free tier, not on GitHub Pages — GitHub Pages can only serve files, it can't run server code or hold a secret key safely.

You only have to do this once. After it's set up, uploading new lessons is just: pick a PDF, click a couple buttons.

There are two things you need before you start:

1. An **Anthropic API key** — this lets code call Claude. It's different from your normal Claude.ai login.
2. A **Cloudflare account** — free — to host the Worker.

---

## Part 1 — Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign in (or make an account).
2. Add billing: go to **Settings → Billing**, add a card, and add a small amount of credit (even $5 is enough to test this many times over — each lesson generation costs a small fraction of a dollar).
3. Go to **API Keys**, click **Create Key**, give it a name like `chinese-memory-lab`, and copy the key somewhere safe. It starts with `sk-ant-...`. You won't be able to see it again after you leave the page, so save it now.

**Important:** never put this key directly in `upload.html`, `upload.js`, or anything that goes in your GitHub repo. It only ever goes into the Cloudflare Worker's secrets (Part 3 below).

---

## Part 2 — Create a Cloudflare account

1. Go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and make a free account.
2. In the sidebar, find **Workers & Pages**.

---

## Part 3 — Deploy the Worker (dashboard method — no install needed)

This is the simplest way to get started.

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Create Worker**.
2. Give it a name, like `cml-lesson-generator`, and click **Deploy** (it'll deploy a placeholder — that's fine, you'll replace the code next).
3. Click **Edit code** (this opens their online code editor).
4. Delete everything in the editor, then open `worker/worker.js` from this folder on your computer, copy all of it, and paste it into the editor.
5. Click **Save and deploy**.
6. Now set your secrets — go to the Worker's **Settings → Variables**:
   - Add a **secret** named `ANTHROPIC_API_KEY`, value = the key from Part 1.
   - Add a **secret** named `PASSPHRASE`, value = any password you make up (this is what you'll type into the upload screen each time — pick something only you know).
   - Optionally add a plain variable `ALLOWED_ORIGIN` set to your site's real address (e.g. `https://yourname.github.io`) once you know it. If you skip this, it defaults to allowing any site — your passphrase is still the main protection.
7. Save. Your Worker now has a public address, shown at the top of its page — something like:
   `https://cml-lesson-generator.yourname.workers.dev`

---

## Part 4 — Point the site at your Worker

1. Open `js/upload.js` in this project.
2. Find this line near the top:
   ```js
   const WORKER_URL = "https://REPLACE-ME.workers.dev";
   ```
3. Replace it with your real Worker address from Part 3, step 7.
4. Save, commit, and push like normal.

---

## Part 5 (optional) — Deploy with the CLI instead

If you'd rather use the command line (this is a good way to practice, and makes future edits faster):

```bash
npm install -g wrangler
cd worker
wrangler login
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put PASSPHRASE
wrangler deploy
```

`wrangler deploy` will print your Worker's URL at the end — put that into `js/upload.js` as in Part 4.

---

## Testing it locally before you trust it

Browsers block a page from `fetch()`-ing local files when you just double-click an HTML file (`file://...`), so `index.html` won't be able to load `lesson-template.html` that way. To test on your own computer first, run a tiny local server from this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html` in your browser. This isn't needed once it's on GitHub Pages — that already serves over `https://`, so it works normally there.

---

## Cost and safety notes

- Every lesson generation is a real, paid API call. The Worker caps uploads at 40 words to keep any single mistake cheap. Start with a smaller PDF (10-15 words) the first time to make sure everything works before trying a bigger one.
- The passphrase is the only thing stopping a stranger who finds your site from spending your API credit. Don't share it, and pick something that isn't easy to guess.
- If you ever want to shut this off, you can pause or delete the Worker from the Cloudflare dashboard at any time — the rest of the site keeps working normally without it.
