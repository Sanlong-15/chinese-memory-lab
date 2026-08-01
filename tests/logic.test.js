import { describe, it, expect } from "vitest";
import Logic from "../js/logic.js";

const DAY = 86400000;
const newCard = () => ({ state: "new", due: 0, S: 0, D: 0, reps: 0, lapses: 0, last: 0 });

describe("fsrsUpdate — scheduler", () => {
  it("grows the interval when you keep rating Good", () => {
    let st = newCard();
    let now = Date.now();
    const intervals = [];
    for (let i = 0; i < 4; i++) {
      st = Logic.fsrsUpdate(st, "good", now);
      intervals.push(st.interval);
      now += st.interval * DAY; // review on schedule
    }
    // each interval should be strictly longer than the one before
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    }
  });

  it("a new Easy card gets a longer interval than a new Good card", () => {
    const now = Date.now();
    const easy = Logic.fsrsUpdate(newCard(), "easy", now);
    const good = Logic.fsrsUpdate(newCard(), "good", now);
    expect(easy.interval).toBeGreaterThan(good.interval);
  });

  it("Again on a mature card shrinks stability and counts a lapse", () => {
    let st = newCard();
    let now = Date.now();
    for (let i = 0; i < 4; i++) {
      st = Logic.fsrsUpdate(st, "good", now);
      now += st.interval * DAY;
    }
    const before = st.S;
    st = Logic.fsrsUpdate(st, "again", now);
    expect(st.S).toBeLessThan(before);
    expect(st.lapses).toBe(1);
  });

  it("keeps Difficulty within 1..10 and Stability positive", () => {
    let st = newCard();
    let now = Date.now();
    const ratings = ["again", "hard", "good", "easy", "again", "again", "good"];
    for (const r of ratings) {
      st = Logic.fsrsUpdate(st, r, now);
      now += Math.max(0.01, st.interval) * DAY;
      expect(st.D).toBeGreaterThanOrEqual(1);
      expect(st.D).toBeLessThanOrEqual(10);
      expect(st.S).toBeGreaterThan(0);
    }
  });

  it("counts reps and sets state to review", () => {
    const st = Logic.fsrsUpdate(newCard(), "good", Date.now());
    expect(st.reps).toBe(1);
    expect(st.state).toBe("review");
  });

  it("throws on a bad rating", () => {
    expect(() => Logic.fsrsUpdate(newCard(), "nope", Date.now())).toThrow();
  });
});

describe("pickTaskFromState — daily task selection", () => {
  const ALL = ["recognize", "recall", "listen", "tone", "sentence"];

  it("new words always get recognition (see the story first)", () => {
    expect(Logic.pickTaskFromState({ state: "new" }, ALL)).toBe("recognize");
    expect(Logic.pickTaskFromState({ reps: 0 }, ALL)).toBe("recognize");
    expect(Logic.pickTaskFromState(null, ALL)).toBe("recognize");
  });

  it("mature words never fall back to plain recognition", () => {
    for (let i = 0; i < 40; i++) {
      const t = Logic.pickTaskFromState({ state: "review", reps: 8 }, ALL);
      expect(t).not.toBe("recognize");
      expect(ALL).toContain(t);
    }
  });

  it("only ever returns an eligible task", () => {
    const elig = ["recognize", "recall"];
    for (let i = 0; i < 40; i++) {
      const t = Logic.pickTaskFromState({ state: "review", reps: 8 }, elig);
      expect(elig).toContain(t);
    }
  });

  it("falls back to an eligible task when weights don't intersect", () => {
    // mature weights are recall/tone/sentence/listen; only recognize eligible
    expect(
      Logic.pickTaskFromState({ state: "review", reps: 9 }, ["recognize"])
    ).toBe("recognize");
  });

  it("avoids repeating the exact same task as last time", () => {
    for (let i = 0; i < 40; i++) {
      const t = Logic.pickTaskFromState(
        { state: "review", reps: 8, lastTask: "recall" },
        ALL
      );
      expect(t).not.toBe("recall");
    }
  });
});

describe("toneSeq — pinyin tone parser", () => {
  it("reads the tone marks in order", () => {
    expect(Logic.toneSeq("nǐ hǎo")).toEqual([3, 3]);
    expect(Logic.toneSeq("xièxie")).toEqual([4]);
    expect(Logic.toneSeq("māmá mǎ mà")).toEqual([1, 2, 3, 4]);
  });
  it("returns an empty array for no marks or empty input", () => {
    expect(Logic.toneSeq("hello")).toEqual([]);
    expect(Logic.toneSeq("")).toEqual([]);
    expect(Logic.toneSeq(undefined)).toEqual([]);
  });
});

describe("dedupeByChinese", () => {
  it("keeps the first of each Chinese string", () => {
    const list = [
      { chinese: "好", english: "good" },
      { chinese: "你", english: "you" },
      { chinese: "好", english: "duplicate" },
    ];
    const out = Logic.dedupeByChinese(list);
    expect(out).toHaveLength(2);
    expect(out[0].english).toBe("good");
  });
  it("handles empty or missing input", () => {
    expect(Logic.dedupeByChinese([])).toEqual([]);
    expect(Logic.dedupeByChinese(undefined)).toEqual([]);
  });
});
