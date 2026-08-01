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
