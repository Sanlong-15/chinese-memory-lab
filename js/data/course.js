// data/course.js
// Course config. Tiny by design: it holds only hand-authored lessons and the
// path definitions. The rest of each path's lessons are GENERATED at runtime
// from the existing word list (see features/course/course.js -> pathLessons),
// so adding words to a level automatically extends its course.

const COURSE = {
  // Hand-authored lessons, keyed by id. Used first in their path; generated
  // lessons cover the remaining words of the level (never the same word twice).
  authored: {
    "hsk1-01": {
      path: "hsk1",
      index: 1,
      title: "Greetings & basics",
      objective:
        "Greet people, say thank you and sorry, and answer yes/no. By the end you can recognise and say 9 everyday words.",
      wordIds: [77, 36, 114, 99, 7, 128, 141, 23, 86], // 你好我是不谢谢再见对不起请
      toneNote:
        "你 (nǐ) and 我 (wǒ) are both tone 3 — a low dip. Two tone-3 syllables in a row (你好) shift the first to tone 2, so 你好 sounds like 'ní hǎo'.",
      commonMistakes: [
        "不 is normally 4th tone (bù), but before another 4th tone it becomes 2nd tone: 不是 → bú shì.",
        "谢谢 — the second 谢 is light and quick (xièxie), not a full falling tone.",
      ],
      mastery: { threshold: 0.8 },
    },
    "hsk1-02": {
      path: "hsk1",
      index: 2,
      title: "Numbers 1–10",
      objective: "Count from one to ten and recognise each number character.",
      wordIds: [133, 27, 91, 105, 116, 58, 83, 2, 48, 97], // 一二三四五六七八九十
      toneNote:
        "一 (yī) changes tone by context: yì before 4th tone, yí before others. Here just 'yī'.",
      commonMistakes: [
        "三 sān (three) vs 山 shān (mountain) look and sound close — mind the tone and the extra stroke.",
      ],
      mastery: { threshold: 0.8 },
    },
    "hsk1-03": {
      path: "hsk1",
      index: 3,
      title: "People & everyday things",
      objective:
        "Talk about people and a few daily actions: big/small, eat, drink, water, family.",
      wordIds: [89, 14, 124, 3, 59, 45, 11, 38, 101], // 人大小爸爸妈妈家吃喝水
      toneNote:
        "妈 mā (tone 1, flat) vs 大 dà (tone 4, falling) — practise a flat top vs a sharp drop.",
      commonMistakes: [
        "喝 hē (drink) vs 吃 chī (eat) — different verbs, don't mix the actions.",
      ],
      mastery: { threshold: 0.8 },
    },
  },

  // Learning paths. Each generates its remaining lessons from `level`'s words,
  // in chunks of `lessonSize`.
  paths: [
    { id: "hsk1", title: "HSK 1", level: "HSK1", lessonSize: 8 },
    { id: "hsk2", title: "HSK 2", level: "HSK2", lessonSize: 8 },
    { id: "hsk3", title: "HSK 3", level: "HSK3", lessonSize: 8 },
    { id: "hsk4", title: "HSK 4", level: "HSK4", lessonSize: 10 },
  ],
};
