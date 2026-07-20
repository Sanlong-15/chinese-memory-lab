# HSK 3.0 expansion — plan and open question

Date: 2026-07-20
Status: **PAUSED — waiting on the official 2025 word list**

## Decision made

Koko decided to wait for the official 2025 HSK 3.0 word list before adding
anything to the lab. No changes were made to `js/data.js`.

## Why we paused

The public HSK 3.0 lists on GitHub are the **2021 draft**, not the 2025 final
standard.

- 2021 draft, Level 1 = ~500 words (the list we found has 497)
- 2025 final, Level 1 = ~300 words

Building 260 cards from the wrong list risks months of studying words that are
not on the exam. Not worth it.

Second problem with the public source: the repo README says meanings fall back
to **Google Translate** when a word is not in CC-CEDICT, and states the data
"may contain errors."

## What we already worked out (do not redo this)

Current lab contents: **388 words**
- HSK1: 153
- HSK2: 170
- Boya L11: 34
- Boya L12: 31

Compared against the 497-word draft list:
- 237 words already in the lab
- **260 words genuinely new**

## Files saved

| File | What it is |
|---|---|
| `_source_hsk30_L1_raw.txt` | The 497-word **2021 draft** list. Reference only. Not verified. |
| `_pending_260_new_words.txt` | The 260 words not yet in the lab. Reference only. |

Both are scratch files. Safe to delete. They are not loaded by `index.html`.

## What Koko needs to do next

Get the official 2025 HSK 3.0 word list from one of these:

1. His Chinese teacher at Camtech, or the textbook the course uses
2. chinesetest.cn (the official HSK site) — look for 考试大纲 / syllabus
3. The Chinese Ministry of Education 国际中文教育中文水平等级标准

Then upload it here (PDF, Excel, or plain text) and we build from that.

## Agreed build plan (for when the list arrives)

- One HSK level at a time. Finish Level 1 fully before starting Level 2.
- Keep the current card format: chinese, pinyin, english, khmer, breakdown,
  chars, and 5 example sentences with pinyin + English.
- Deliver in batches of ~50 cards. Koko spot-checks each batch for errors
  before the next batch is built.
- Back up `js/data.js` before any merge.
- Add a new filter chip to `index.html` for the new level.

## Open questions

- Does Koko's course follow HSK 2.0 or HSK 3.0? This decides everything.
  Worth asking his teacher directly.
- Khmer translations are Claude's best effort. A native speaker should verify
  them before Koko memorizes anything.
