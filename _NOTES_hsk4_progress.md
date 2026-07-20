# HSK 1–4 build — COMPLETE

Last updated: 2026-07-20

## STATUS: DONE

**HSK 1, 2, 3, and 4 are all complete.** Verified by diffing `js/data.js`
against the official 2012 HSK 2.0 source lists.

| Level | Official entries | Covered |
|---|---|---|
| HSK 3 | 300 | **300 / 300** |
| HSK 4 | 600 | **600 / 600** |

Lab total: **1,228 words**, **1,070 unique characters**

| Set | Words |
|---|---|
| HSK 1 | 153 |
| HSK 2 | 170 |
| HSK 3 | 259 |
| HSK 4 | 581 |
| Boya L11 | 34 |
| Boya L12 | 31 |

## Build history

| Batch | Level | Range | Words |
|---|---|---|---|
| 1 | HSK 3 | 啊 → 地方 | 46 |
| 2 | HSK 3 | 不但 → 几乎 | 50 |
| 3 | HSK 3 | 机会 → 马上 | 50 |
| 4 | HSK 3 | 帽子 → 同事 | 50 |
| 5 | HSK 3 | 同意 → 作业 | 63 |
| 6 | HSK 4 | 爱情 → 抽烟 | 50 |
| 7 | HSK 4 | 出差 → 而 | 49 |
| 8 | HSK 4 | 动作 → 管理 | 50 |
| 9 | HSK 4 | 光 → 减少 | 50 |
| 10 | HSK 4 | 建议 → 可是 | 50 |
| 11 | HSK 4 | 可惜 → 秒 | 50 |
| 12 | HSK 4 | 民族 → 任何 | 50 |
| 13 | HSK 4 | 任务 → 硕士 | 50 |
| 14 | HSK 4 | 死 → 羡慕 | 50 |
| 15 | HSK 4 | 相反 → 引起 | 50 |
| 16 | HSK 4 | 印象 → 值得 | 50 |
| 17 | HSK 4 | 职业 → 座位 | 32 |

**840 cards built in total**, each with pinyin, English, Khmer, a character
breakdown, and 5 example sentences with pinyin and English.
That is roughly **4,200 example sentences**.

## Final verification (full lab)

- `js/data.js` parses as valid JavaScript
- 0 duplicate ids
- 0 missing fields across all 1,228 words
- every example has Chinese, pinyin, and English
- no stray Latin or Cyrillic characters inside any Chinese text
- `chars` array matches the word for every entry
- HSK 3 and HSK 4 official lists both 100% covered

## Sources

- `_source_hsk3_official_2012.txt` — official 2012 HSK 2.0 Level 3 list (300)
- `_source_hsk4_official_2012.txt` — official 2012 HSK 2.0 Level 4 list (600)

Both taken from the hskhsk.com published data, with pinyin and CC-CEDICT
definitions. This is the stable HSK 2.0 standard that Koko's course at
Camtech uses, confirmed by his teacher.

## Still open

**Khmer translations are Claude's best effort, not native-checked.**
This matters more at HSK 4, where words are abstract (责任, principle-type
words, grammar connectors). A Khmer speaker should review before Koko
memorizes them.

**4 pre-existing duplicate words** — 桌子, 但是, 鸡蛋, 虽然 — each appear
once under an HSK level and once under a Boya lesson. May be intentional
since Boya is a separate track. Not changed.

## Scratch files (safe to delete)

- `_batch1_hsk3.json` … `_batch17_hsk4.json` — batch sources, all merged
- `_source_hsk30_L1_raw.txt`, `_pending_260_new_words.txt`,
  `_NOTES_hsk30_plan.md` — abandoned HSK 3.0 work, no longer relevant
- `js/data.js.backup-*` — one backup per merge, 17 in total

## Possible next steps

- Add HSK 5 (1,300 words) — same process, source list from hskhsk.com
- Have a Khmer speaker review the HSK 4 translations
- Extend the Pattern Families view to cover the new HSK 3–4 characters
  (it currently only groups the original 388-word set)
