// ============================================================
// Upload a Lesson — PDF -> word candidates -> AI generate -> download
//
// Flow:
//   1. Read the PDF. Try real text extraction first (pdf.js).
//   2. If that finds almost no Chinese text, fall back to OCR
//      (Tesseract.js) on rendered page images — slower, less
//      accurate, but works on scanned/photographed pages.
//   3. Pull out runs of Chinese characters as candidate words.
//   4. Let Koko review/edit the list — extraction is never perfect.
//   5. Send the confirmed word list + passphrase to the Cloudflare
//      Worker backend, which calls the Claude API and returns a
//      DB-shaped JSON object (words/charInfo/charToFamily/
//      patternGroups/radicalGroups).
//   6. Fill lesson-template.html with that data and download the
//      finished, self-contained lesson HTML file.
// ============================================================

// --- CONFIG ---------------------------------------------------
// Replace this with your deployed Cloudflare Worker URL once you've
// followed worker/README.md. Example:
//   const WORKER_URL = "https://cml-lesson-generator.koko123.workers.dev";
const WORKER_URL = "https://cml-lesson-generator.huysanlong1.workers.dev";

const WORD_CAP = 40; // max words per upload — keeps one mistake from burning a lot of API credit
const MAX_OCR_PAGES = 5; // OCR is slow; cap how many pages we'll try
const CJK_RE = /[一-鿿]+/g;
const LONG_WORD_WARN_LEN = 6; // runs longer than this are probably not a single word — flagged, not blocked

// --- STATE -------------------------------------------------------
let candidateWords = []; // ordered array of unique strings

// --- DOM ----------------------------------------------------------
const configWarning = document.getElementById("configWarning");
const lessonNameInput = document.getElementById("lessonName");
const passphraseInput = document.getElementById("passphrase");
const pdfFileInput = document.getElementById("pdfFile");
const extractBtn = document.getElementById("extractBtn");
const extractStatus = document.getElementById("extractStatus");
const reviewStep = document.getElementById("reviewStep");
const wordCountNote = document.getElementById("wordCountNote");
const wordChipWrap = document.getElementById("wordChipWrap");
const addWordInput = document.getElementById("addWordInput");
const addWordBtn = document.getElementById("addWordBtn");
const generateStep = document.getElementById("generateStep");
const generateBtn = document.getElementById("generateBtn");
const generateStatus = document.getElementById("generateStatus");

if (!WORKER_URL || WORKER_URL.includes("REPLACE-ME")) {
  configWarning.style.display = "block";
}

pdfFileInput.addEventListener("change", () => {
  extractBtn.disabled = !pdfFileInput.files.length;
  extractStatus.textContent = "";
  extractStatus.className = "status-line";
});

// --- Step 1: extract text from the PDF (pdf.js) -------------------
async function readPdfText(arrayBuffer) {
  if (typeof pdfjsLib === "undefined") {
    throw new Error("PDF library didn't load. Check your internet connection and reload the page.");
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let allText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    allText += pageText + "\n";
  }
  return { text: allText, numPages: pdf.numPages, pdf };
}

// --- Step 2 (fallback): OCR scanned pages (Tesseract.js) -----------
async function ocrPdfText(pdf, numPages, onProgress) {
  if (typeof Tesseract === "undefined") {
    throw new Error("OCR library didn't load. Check your internet connection and reload the page.");
  }
  const pagesToTry = Math.min(numPages, MAX_OCR_PAGES);
  let allText = "";
  for (let i = 1; i <= pagesToTry; i++) {
    onProgress(`OCR: reading page ${i} of ${pagesToTry}...`);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;

    const result = await Tesseract.recognize(canvas, "chi_sim+chi_tra", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          const pct = Math.round((m.progress || 0) * 100);
          onProgress(`OCR: reading page ${i} of ${pagesToTry}... ${pct}%`);
        }
      },
    });
    allText += result.data.text + "\n";
  }
  if (numPages > MAX_OCR_PAGES) {
    onProgress(
      `OCR only checked the first ${MAX_OCR_PAGES} of ${numPages} pages (OCR is slow). Add any missing words manually below.`,
    );
  }
  return allText;
}

// --- Pull Chinese word candidates out of raw text ------------------
function extractCJKWords(text) {
  const runs = text.match(CJK_RE) || [];
  const seen = new Set();
  const out = [];
  for (const run of runs) {
    if (!seen.has(run)) {
      seen.add(run);
      out.push(run);
    }
  }
  return out;
}

function setExtractStatus(msg, kind) {
  extractStatus.textContent = msg;
  extractStatus.className = "status-line" + (kind ? " " + kind : "");
}

extractBtn.addEventListener("click", async () => {
  const file = pdfFileInput.files[0];
  if (!file) return;

  extractBtn.disabled = true;
  setExtractStatus("Reading PDF...");

  try {
    const arrayBuffer = await file.arrayBuffer();
    const { text, numPages, pdf } = await readPdfText(arrayBuffer);
    let words = extractCJKWords(text);

    // If almost no Chinese text came out, this is probably a scanned/photographed PDF.
    const cjkCharCount = (text.match(/[一-鿿]/g) || []).length;
    if (cjkCharCount < 5) {
      setExtractStatus(
        "No selectable Chinese text found — this looks like a scanned PDF. Trying OCR (this can take a minute)...",
      );
      const ocrText = await ocrPdfText(pdf, numPages, (msg) => setExtractStatus(msg));
      words = extractCJKWords(ocrText);
    }

    if (!words.length) {
      setExtractStatus(
        "Couldn't find any Chinese words in this PDF. Try a different file, or add words manually below.",
        "error",
      );
    } else {
      setExtractStatus(
        `Found ${words.length} candidate word${words.length === 1 ? "" : "s"} — check the list below before generating.`,
        "success",
      );
    }

    candidateWords = words;
    renderWordChips();
    reviewStep.classList.remove("step-disabled");
  } catch (err) {
    console.error(err);
    setExtractStatus("Something went wrong reading this PDF: " + err.message, "error");
  } finally {
    extractBtn.disabled = false;
  }
});

// --- Step 4: editable review list -----------------------------------
function renderWordChips() {
  wordChipWrap.innerHTML = candidateWords
    .map((w, i) => {
      const long = w.length > LONG_WORD_WARN_LEN;
      return `<span class="word-chip${long ? " long" : ""}" title="${long ? "This looks long for one word — check it's not a whole phrase." : ""}">${w}<button type="button" data-idx="${i}">&times;</button></span>`;
    })
    .join("");
  wordChipWrap.querySelectorAll("button[data-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx, 10);
      candidateWords.splice(idx, 1);
      renderWordChips();
    });
  });
  updateWordCount();
}

function updateWordCount() {
  const over = candidateWords.length > WORD_CAP;
  wordCountNote.textContent = `${candidateWords.length} / ${WORD_CAP} words` + (over ? " — remove some before generating" : "");
  wordCountNote.className = "word-count-note" + (over ? " over" : "");
  updateGenerateAvailability();
}

addWordBtn.addEventListener("click", addWordManually);
addWordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addWordManually();
  }
});

function addWordManually() {
  const raw = addWordInput.value.trim();
  if (!raw) return;
  const matches = raw.match(CJK_RE);
  if (!matches) {
    setExtractStatus(`"${raw}" doesn't look like Chinese text — add the Chinese word itself.`, "error");
    return;
  }
  matches.forEach((w) => {
    if (!candidateWords.includes(w)) candidateWords.push(w);
  });
  addWordInput.value = "";
  renderWordChips();
  reviewStep.classList.remove("step-disabled");
}

// --- Step 5: generate ------------------------------------------------
function updateGenerateAvailability() {
  const nameOk = lessonNameInput.value.trim().length > 0;
  const passOk = passphraseInput.value.trim().length > 0;
  const countOk = candidateWords.length > 0 && candidateWords.length <= WORD_CAP;
  generateBtn.disabled = !(nameOk && passOk && countOk);
  if (countOk && candidateWords.length > 0) {
    generateStep.classList.remove("step-disabled");
  }
}
lessonNameInput.addEventListener("input", updateGenerateAvailability);
passphraseInput.addEventListener("input", updateGenerateAvailability);

function setGenerateStatus(msg, kind) {
  generateStatus.textContent = msg;
  generateStatus.className = "status-line" + (kind ? " " + kind : "");
}

generateBtn.addEventListener("click", async () => {
  if (!WORKER_URL || WORKER_URL.includes("REPLACE-ME")) {
    setGenerateStatus(
      "The backend isn't set up yet. See worker/README.md, then set WORKER_URL in js/upload.js.",
      "error",
    );
    return;
  }

  const lessonName = lessonNameInput.value.trim();
  const passphrase = passphraseInput.value.trim();

  generateBtn.disabled = true;
  setGenerateStatus("Generating your lesson... this can take a minute or two.");

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase, words: candidateWords, lessonName }),
    });

    if (!res.ok) {
      let message = `Request failed (${res.status}).`;
      try {
        const errBody = await res.json();
        if (errBody.error) message = errBody.error;
      } catch (_) {
        /* ignore parse failure, use default message */
      }
      if (res.status === 401) message = "Wrong passphrase.";
      if (res.status === 413) message = `Too many words — keep uploads to ${WORD_CAP} or fewer.`;
      throw new Error(message);
    }

    const data = await res.json();
    setGenerateStatus("Got the data back — building your lesson file...");
    await buildAndDownloadLesson(lessonName, data);
    setGenerateStatus(
      "Done! Your lesson file downloaded. Move it into your chinese-memory-lab folder and commit it to save it for good.",
      "success",
    );
  } catch (err) {
    console.error(err);
    setGenerateStatus("Couldn't generate the lesson: " + err.message, "error");
  } finally {
    generateBtn.disabled = false;
  }
});

async function buildAndDownloadLesson(lessonName, data) {
  const templateRes = await fetch("lesson-template.html");
  if (!templateRes.ok) {
    throw new Error(
      "Couldn't load lesson-template.html. If you're testing this on your own computer by double-clicking the file, that won't work — run a local server instead (see worker/README.md).",
    );
  }
  let html = await templateRes.text();

  const title = `${lessonName} · Character Memory Lab`;
  const subtitle = `${(data.words || []).length} words · every character broken into its story · sound-clue pattern families`;
  const footer =
    "Built for Koko · Chinese &amp; English &amp; Khmer study aid · Khmer translations are best-effort, please verify with a native speaker · Auto-generated from an uploaded PDF, please review before trusting it fully";

  html = html.split("__TITLE__").join(title);
  html = html.split("__SUBTITLE__").join(subtitle);
  html = html.split("__FOOTER_NOTE__").join(footer);

  const startMarker = "/*__DB_JSON_START__*/";
  const endMarker = "/*__DB_JSON_END__*/";
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error("lesson-template.html is missing its data markers — don't edit that file by hand.");
  }
  const before = html.slice(0, startIdx + startMarker.length);
  const after = html.slice(endIdx);
  html = before + JSON.stringify(data) + after;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = lessonName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "lesson";
  a.href = url;
  a.download = `${safeName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
