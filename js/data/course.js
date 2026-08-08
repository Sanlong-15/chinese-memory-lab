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
      grammar: {
        point: "Say “A is B” with 是 (shì)",
        pattern: "Subject + 是 + noun   ·   negative: Subject + 不是 + noun",
        examples: [
          {
            cn: "我是老师。",
            py: "wǒ shì lǎoshī.",
            en: "I am a teacher.",
            note: "老师 lǎoshī = teacher",
          },
          {
            cn: "我不是学生。",
            py: "wǒ bú shì xuésheng.",
            en: "I am not a student.",
            note: "学生 xuésheng = student",
          },
        ],
        note: "不 bù becomes bú before a 4th tone, so 不是 is said bú shì.",
      },
      collocations: [
        { chunk: "你好吗？", py: "nǐ hǎo ma?", en: "how are you?" },
        { chunk: "谢谢你", py: "xièxie nǐ", en: "thank you" },
        { chunk: "没关系", py: "méi guānxi", en: "it's okay (reply to sorry)" },
        { chunk: "明天见", py: "míngtiān jiàn", en: "see you tomorrow" },
      ],
      dialogue: {
        situation: "Meeting someone",
        lines: [
          { sp: "A", cn: "你好！我是 Lin。", py: "nǐ hǎo! wǒ shì Lín.", en: "Hello! I'm Lin." },
          { sp: "B", cn: "你好，Lin！我是 Wang。", py: "nǐ hǎo, Lín! wǒ shì Wáng.", en: "Hello, Lin! I'm Wang." },
          { sp: "A", cn: "谢谢！再见！", py: "xièxie! zàijiàn!", en: "Thanks! Goodbye!" },
          { sp: "B", cn: "再见！", py: "zàijiàn!", en: "Goodbye!" },
        ],
        comprehension: {
          q: "How does the conversation end?",
          options: ["再见", "谢谢", "你好", "对不起"],
          answer: "再见",
        },
      },
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
      grammar: {
        point: "Count things with 个 (gè)",
        pattern: "number + 个 + noun",
        examples: [
          {
            cn: "一个人",
            py: "yí gè rén",
            en: "one person",
            note: "人 rén = person",
          },
          { cn: "三个人", py: "sān gè rén", en: "three people" },
        ],
        note: "Before a measure word, “two” is 两 (liǎng), not 二 — say 两个人, not 二个人. And 一 yī becomes yí before 个: yí gè.",
      },
      collocations: [
        { chunk: "第一", py: "dì yī", en: "first (1st)" },
        { chunk: "星期一", py: "xīngqīyī", en: "Monday" },
        { chunk: "一起", py: "yìqǐ", en: "together" },
        { chunk: "两个", py: "liǎng gè", en: "two (of something)" },
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
      grammar: {
        point: "Make a sentence: Subject + Verb + Object",
        pattern: "Subject + Verb + Object",
        examples: [
          { cn: "我喝水。", py: "wǒ hē shuǐ.", en: "I drink water." },
          {
            cn: "妈妈吃饭。",
            py: "māma chī fàn.",
            en: "Mom eats.",
            note: "饭 fàn = cooked rice / a meal",
          },
        ],
        note: "Chinese verbs never change form. 我吃, 你吃, 他吃 — 吃 stays the same, no endings to add.",
      },
      collocations: [
        { chunk: "吃饭", py: "chī fàn", en: "to eat / have a meal" },
        { chunk: "喝水", py: "hē shuǐ", en: "to drink water" },
        { chunk: "大家", py: "dàjiā", en: "everyone" },
        { chunk: "回家", py: "huí jiā", en: "go home" },
      ],
      mastery: { threshold: 0.8 },
    },
    "hsk1-04": {
      path: "hsk1",
      index: 4,
      title: "Asking who & what",
      objective:
        "Ask and answer simple questions: he/she, someone's name, who and what. By the end you can ask “what's your name?” and say your own.",
      wordIds: [107, 108, 46, 71, 96, 95, 60, 75, 15], // 他她叫名字什么谁吗呢的
      toneNote:
        "什么 (shénme) and 名字 (míngzi) each end in a light, toneless syllable — say the second part short and soft.",
      commonMistakes: [
        "他 (he) and 她 (she) sound exactly the same — tā. Only the writing shows which one.",
        "Don't add 吗 to a question that already uses 什么 or 谁: 你叫什么名字吗？ is wrong.",
      ],
      grammar: {
        point: "Ask a question two ways",
        pattern:
          "Yes/no: statement + 吗？   ·   What/Who: keep the question word in place",
        examples: [
          {
            cn: "他是老师吗？",
            py: "tā shì lǎoshī ma?",
            en: "Is he a teacher?",
            note: "add 吗 to make a yes/no question",
          },
          {
            cn: "你叫什么名字？",
            py: "nǐ jiào shénme míngzi?",
            en: "What is your name?",
            note: "什么 stays where the answer goes",
          },
        ],
        note: "In Chinese the question word (什么/谁) does not jump to the front like English “what/who”. It sits where the answer will be.",
      },
      collocations: [
        { chunk: "我叫…", py: "wǒ jiào…", en: "I'm called… (my name is)" },
        { chunk: "你呢？", py: "nǐ ne?", en: "and you?" },
        { chunk: "他是谁？", py: "tā shì shéi?", en: "who is he?" },
        { chunk: "好吗？", py: "hǎo ma?", en: "is that okay?" },
      ],
      dialogue: {
        situation: "Introductions",
        lines: [
          { sp: "A", cn: "你好！你叫什么名字？", py: "nǐ hǎo! nǐ jiào shénme míngzi?", en: "Hi! What's your name?" },
          { sp: "B", cn: "我叫 Lin。你呢？", py: "wǒ jiào Lín. nǐ ne?", en: "I'm Lin. And you?" },
          { sp: "A", cn: "我叫 Wang。他是谁？", py: "wǒ jiào Wáng. tā shì shéi?", en: "I'm Wang. Who is he?" },
          { sp: "B", cn: "他叫 Li。", py: "tā jiào Lǐ.", en: "He's called Li." },
        ],
        comprehension: {
          q: "What is B's name?",
          options: ["Lin", "Wang", "Li", "Koko"],
          answer: "Lin",
        },
      },
      mastery: { threshold: 0.8 },
    },
    "hsk1-05": {
      path: "hsk1",
      index: 5,
      title: "Feelings & liking",
      objective:
        "Describe how you feel and say what you like: happy, pretty, hot/cold, many/few, and “I like / I love”.",
      wordIds: [40, 31, 81, 56, 88, 24, 94, 117, 1], // 很高兴漂亮冷热多少喜欢爱
      toneNote:
        "很 (hěn) is tone 3 — a low dip, the same dip as 你 in 你好. Say it low before the adjective.",
      commonMistakes: [
        "With an adjective, skip 是: 我很高兴 is right, 我是高兴 is wrong.",
        "很 is often just a link, not a strong “very”. 我很好 means “I'm fine”. For real emphasis use 非常 (fēicháng).",
      ],
      grammar: {
        point: "Describe with 很 + adjective (no 是)",
        pattern: "Subject + 很 + adjective   ·   don't use 是 with an adjective",
        examples: [
          {
            cn: "我很高兴。",
            py: "wǒ hěn gāoxìng.",
            en: "I am happy.",
            note: "no 是 — 很 links the subject to the adjective",
          },
          {
            cn: "天气很热。",
            py: "tiānqì hěn rè.",
            en: "The weather is hot.",
            note: "天气 tiānqì = weather",
          },
        ],
        note: "With adjectives you drop 是. 很 here is mostly a link, not a strong “very”.",
      },
      collocations: [
        { chunk: "我喜欢…", py: "wǒ xǐhuan…", en: "I like…" },
        { chunk: "我爱你", py: "wǒ ài nǐ", en: "I love you" },
        { chunk: "很多", py: "hěn duō", en: "a lot / many" },
        { chunk: "不高兴", py: "bù gāoxìng", en: "unhappy" },
      ],
      dialogue: {
        situation: "Talking about feelings",
        lines: [
          { sp: "A", cn: "你好！你喜欢你的家吗？", py: "nǐ hǎo! nǐ xǐhuan nǐ de jiā ma?", en: "Hi! Do you like your home?" },
          { sp: "B", cn: "我很喜欢。你高兴吗？", py: "wǒ hěn xǐhuan. nǐ gāoxìng ma?", en: "I like it a lot. Are you happy?" },
          { sp: "A", cn: "我很高兴！", py: "wǒ hěn gāoxìng!", en: "I'm very happy!" },
        ],
        comprehension: {
          q: "How does A feel?",
          options: ["高兴", "不高兴", "冷", "热"],
          answer: "高兴",
        },
      },
      mastery: { threshold: 0.8 },
    },
    "hsk1-06": {
      path: "hsk1",
      index: 6,
      title: "This, that & having",
      objective:
        "Point at things and say what you have: this/that, have/don't have, friend, book, cat, dog, and “and”.",
      wordIds: [145, 74, 139, 64, 80, 100, 62, 34, 39], // 这那有没有朋友书猫狗和
      toneNote:
        "有 (yǒu) is tone 3 — a low dip. 这 (zhè) and 那 (nà) are short and sharp; keep them crisp.",
      commonMistakes: [
        "“Not have” is always 没有, never 不有. 不 does not work with 有.",
        "这 (zhè) is near you, 那 (nà) is far from you. Don't swap them.",
      ],
      grammar: {
        point: "Say what you have with 有 — and 没有 for “don't have”",
        pattern: "Subject + 有 + object   ·   negative: Subject + 没有 + object",
        examples: [
          {
            cn: "我有一个朋友。",
            py: "wǒ yǒu yí gè péngyou.",
            en: "I have a friend.",
            note: "个 is the measure word from lesson 2",
          },
          {
            cn: "我没有狗。",
            py: "wǒ méiyǒu gǒu.",
            en: "I don't have a dog.",
            note: "not 不有 — 有 takes 没",
          },
        ],
        note: "有 is the one big exception: its negative is 没有, never 不有. 不 negates almost everything else.",
      },
      collocations: [
        { chunk: "有没有？", py: "yǒu méiyǒu?", en: "do you have?" },
        { chunk: "我的朋友", py: "wǒ de péngyou", en: "my friend" },
        { chunk: "这是…", py: "zhè shì…", en: "this is…" },
        { chunk: "那是…", py: "nà shì…", en: "that is…" },
      ],
      mastery: { threshold: 0.8 },
    },
    "hsk1-07": {
      path: "hsk1",
      index: 7,
      title: "Days & time",
      objective:
        "Say today/tomorrow/yesterday, tell the clock, and ask what time it is: now, o'clock, week, morning, afternoon.",
      wordIds: [47, 70, 151, 122, 16, 129, 44, 93, 119], // 今天明天昨天现在点星期几上午下午
      toneNote:
        "今天 (jīntiān), 明天 (míngtiān) and 昨天 (zuótiān) all end in 天 (tiān, tone 1) — say 天 high and flat.",
      commonMistakes: [
        "Time goes before the verb: 我明天吃饭 is right, 我吃饭明天 is wrong.",
        "几 (jǐ) asks small numbers like time — 几点?, 星期几? For bigger amounts use 多少 (duōshao).",
      ],
      grammar: {
        point: "Put the time before the verb; tell the clock with 点",
        pattern: "Subject + time + verb/adjective   ·   clock: number + 点   ·   ask: 几点?",
        examples: [
          {
            cn: "现在几点？",
            py: "xiànzài jǐ diǎn?",
            en: "What time is it now?",
            note: "几点 = what o'clock",
          },
          {
            cn: "我今天很高兴。",
            py: "wǒ jīntiān hěn gāoxìng.",
            en: "Today I am happy.",
            note: "今天 comes before the adjective, near the front",
          },
        ],
        note: "The time word (今天, 明天, 现在) goes before the verb or adjective, near the front. English often puts it at the end — Chinese does not.",
      },
      collocations: [
        { chunk: "几点？", py: "jǐ diǎn?", en: "what time?" },
        { chunk: "三点", py: "sān diǎn", en: "3 o'clock (uses 三 from lesson 2)" },
        { chunk: "星期几？", py: "xīngqī jǐ?", en: "what day of the week?" },
        { chunk: "今天上午", py: "jīntiān shàngwǔ", en: "this morning" },
      ],
      mastery: { threshold: 0.8 },
    },
    "hsk1-08": {
      path: "hsk1",
      index: 8,
      title: "Places & where you are",
      objective:
        "Name places and say where people are and go: at/in, go, come, school, China, hospital, inside, sit, live.",
      wordIds: [142, 87, 53, 132, 146, 137, 57, 152, 148], // 在去来学校中国医院里坐住
      toneNote:
        "在 (zài) and 去 (qù) are both tone 4 — a sharp fall, drop the voice fast. 来 (lái) is tone 2 — rising.",
      commonMistakes: [
        "在 is for WHERE something is: 我在学校. Don't mix up 在 (at) with 是 (am/is).",
        "去 (go) moves away from you; 来 (come) moves toward you. Pick by direction.",
      ],
      grammar: {
        point: "Say where someone is with 在 (zài)",
        pattern: "Subject + 在 + place",
        examples: [
          {
            cn: "我在学校。",
            py: "wǒ zài xuéxiào.",
            en: "I'm at school.",
            note: "在 links you to where you are",
          },
          {
            cn: "他在中国。",
            py: "tā zài Zhōngguó.",
            en: "He is in China.",
            note: "他 is from lesson 4",
          },
        ],
        note: "在 links a person to where they are. To say “inside”, add 里 after the place: 在学校里 = inside the school.",
      },
      collocations: [
        { chunk: "你在哪儿？", py: "nǐ zài nǎr?", en: "where are you? (哪儿 = where)" },
        { chunk: "去学校", py: "qù xuéxiào", en: "go to school" },
        { chunk: "在家", py: "zài jiā", en: "at home (uses 家 from lesson 3)" },
        { chunk: "我住在…", py: "wǒ zhù zài…", en: "I live at/in…" },
      ],
      mastery: { threshold: 0.8 },
    },
    "hsk1-09": {
      path: "hsk1",
      index: 9,
      title: "Everyday verbs",
      objective:
        "Say what you want to do and can do: want to, can (skill), can (able), watch, listen, read, write, study, work.",
      wordIds: [123, 43, 76, 50, 111, 22, 127, 131, 33], // 想会能看听读写学习工作
      toneNote:
        "想 (xiǎng) is tone 3 — a low dip. 会 (huì) and 看 (kàn) are tone 4 — a sharp fall. Feel the difference: dip vs drop.",
      commonMistakes: [
        "会 (huì) is “can” for a learned skill; 能 (néng) is “can” for being able right now. 我会游泳 (I learned to swim) vs 我能来 (I'm free to come).",
        "想 before a verb means “want to”: 我想吃 (I want to eat). It can also mean “miss / think of” — context tells you which.",
      ],
      grammar: {
        point: "Say want / can with a modal + verb (想 / 会 / 能)",
        pattern: "Subject + 想 / 会 / 能 + verb",
        examples: [
          {
            cn: "我想学习。",
            py: "wǒ xiǎng xuéxí.",
            en: "I want to study.",
            note: "想 + verb = want to do it",
          },
          {
            cn: "我会写。",
            py: "wǒ huì xiě.",
            en: "I can write.",
            note: "会 = can, a skill you learned",
          },
        ],
        note: "想 = want to. 会 = can, for a learned skill. 能 = can, for being able or allowed right now.",
      },
      collocations: [
        { chunk: "我想去", py: "wǒ xiǎng qù", en: "I want to go (uses 去 from lesson 8)" },
        { chunk: "不会", py: "bú huì", en: "can't / don't know how" },
        { chunk: "看书", py: "kàn shū", en: "read a book (uses 书 from lesson 6)" },
        { chunk: "想不想？", py: "xiǎng bu xiǎng?", en: "do you want to?" },
      ],
      mastery: { threshold: 0.8 },
    },
    "hsk1-10": {
      path: "hsk1",
      index: 10,
      title: "Food & shopping",
      objective:
        "Name common foods and ask a price: dish, tea, rice, apple, fruit, buy, money, yuan, how much.",
      wordIds: [9, 10, 69, 82, 102, 61, 84, 52, 25], // 菜茶米饭苹果水果买钱块多少
      toneNote:
        "苹果 (píngguǒ) and 水果 (shuǐguǒ) both end in 果 (guǒ, tone 3 — a low dip). 多少 is duōshao, the second part light and quick.",
      commonMistakes: [
        "多少 asks bigger amounts like price; 几 (lesson 7) asks small numbers. For money use 多少钱.",
        "块 (kuài) is the spoken word for yuan. 三块 = 3 yuan. The formal written word is 元 (yuán), but people say 块.",
      ],
      grammar: {
        point: "Ask a price with 多少钱, answer with number + 块",
        pattern: "[thing] + 多少钱？   ·   answer: number + 块",
        examples: [
          {
            cn: "这个多少钱？",
            py: "zhège duōshao qián?",
            en: "How much is this?",
            note: "uses 这 (lesson 6) and 个 (lesson 2)",
          },
          {
            cn: "三块。",
            py: "sān kuài.",
            en: "Three yuan.",
            note: "三 from lesson 2 + 块",
          },
        ],
        note: "多少 asks bigger amounts like a price. 块 is the everyday spoken word for yuan (¥).",
      },
      collocations: [
        { chunk: "多少钱？", py: "duōshao qián?", en: "how much?" },
        { chunk: "我买…", py: "wǒ mǎi…", en: "I'll buy…" },
        { chunk: "一个苹果", py: "yí gè píngguǒ", en: "an apple (uses 个 from lesson 2)" },
        { chunk: "喝茶", py: "hē chá", en: "drink tea (uses 喝 from lesson 3)" },
      ],
      dialogue: {
        situation: "Buying tea at a shop",
        lines: [
          { sp: "A", cn: "你好！我想买茶。", py: "nǐ hǎo! wǒ xiǎng mǎi chá.", en: "Hello! I want to buy tea." },
          { sp: "B", cn: "好。你想买多少？", py: "hǎo. nǐ xiǎng mǎi duōshao?", en: "OK. How much do you want?" },
          { sp: "A", cn: "这个茶多少钱？", py: "zhège chá duōshao qián?", en: "How much is this tea?" },
          { sp: "B", cn: "十块。", py: "shí kuài.", en: "Ten yuan." },
          { sp: "A", cn: "好，我买。谢谢！", py: "hǎo, wǒ mǎi. xièxie!", en: "OK, I'll buy it. Thanks!" },
          { sp: "B", cn: "谢谢！再见！", py: "xièxie! zàijiàn!", en: "Thanks! Goodbye!" },
        ],
        comprehension: {
          q: "How much is the tea?",
          options: ["十块", "五块", "二十块", "一块"],
          answer: "十块",
        },
      },
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
