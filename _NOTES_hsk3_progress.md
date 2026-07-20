# HSK 3 (HSK 2.0) build — progress log

Last updated: 2026-07-20

## Decision

Koko's teacher confirmed the course follows **HSK 2.0**, not HSK 3.0.
The HSK 3.0 work is dropped. We build against the stable HSK 2.0 lists.

## Target

HSK 2.0 cumulative word counts:

| Level | New words | Cumulative |
|---|---|---|
| HSK 1 | 150 | 150 |
| HSK 2 | 150 | 300 |
| HSK 3 | 300 | 600 |
| HSK 4 | 600 | 1,200 |

Lab already covers HSK 1 and HSK 2. Remaining work: **HSK 3 (300) + HSK 4 (600)**.

## Progress

| Batch | Words | Status |
|---|---|---|
| HSK 3 batch 1 (啊 → 地方) | 46 added | **DONE** |
| HSK 3 batch 2 (不但 → 几乎) | 50 added | **DONE** |
| HSK 3 batch 3 (机会 → 马上) | 50 added | **DONE** |
| HSK 3 batch 4 (帽子 → 同事) | 50 added | **DONE** |
| HSK 3 batch 5 (同意 → 作业) | 63 added | **DONE** |
| HSK 4 batches 1–12 | ~600 | next level |

Lab total: **647 words** (HSK1 153, HSK2 170, HSK3 259, Boya L11 34, Boya L12 31)

## HSK 3 IS COMPLETE

**300 of 300 official HSK 2.0 Level 3 entries are now covered.**
Verified by diffing `js/data.js` against `_source_hsk3_official_2012.txt`.
259 were built new here; the other 41 were already in the lab from the
HSK 1 / HSK 2 / Boya sets.

Next milestone: HSK 4 (600 words). Source file still needs to be pulled —
use the same hskhsk.com official 2012 list, Level 4.

Authoritative source now in use: `_source_hsk3_official_2012.txt`, taken from
the official 2012 HSK 2.0 Level 3 list (hskhsk.com data, with pinyin and
CC-CEDICT definitions). This replaces the unreliable HSK 3.0 draft sources.

## Build rules agreed

- One level at a time, batches of ~50.
- Koko spot-checks each batch before the next is built.
- Full card format: chinese, pinyin, english, khmer, breakdown, chars,
  5 example sentences each with pinyin + English.
- Back up `js/data.js` before every merge.

## Verification run on batch 1

- data.js parses as valid JS
- 0 duplicate ids
- 0 missing fields
- all 46 words have exactly 5 examples
- `chars` array matches the word for all entries
- no stray Latin characters inside Chinese text

## Known issues to review

**4 pre-existing duplicate words** (not from this batch). Same word appears
once under an HSK level and once under a Boya lesson:

- 桌子 (HSK1 #149 / L12 #366)
- 但是 (HSK2 #171 / L12 #388)
- 鸡蛋 (HSK2 #205 / L11 #327)
- 虽然 (HSK2 #262 / L12 #387)

This may be intentional, since the Boya lessons are a separate track.
Ask Koko before merging or removing them.

**Khmer translations** are Claude's best effort. Verify with a native
speaker before memorizing.

## Scratch files (safe to delete)

- `_source_hsk30_L1_raw.txt` — old HSK 3.0 draft list, no longer needed
- `_pending_260_new_words.txt` — HSK 3.0 gap list, no longer needed
- `_NOTES_hsk30_plan.md` — superseded by this file
- `_batch1_hsk3.json` — source for batch 1, already merged
- `js/data.js.backup-20260720-124252` — backup before batch 1 merge
