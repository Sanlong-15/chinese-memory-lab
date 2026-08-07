// Full-app smoke test. The app is classic <script> files sharing one global
// scope, so we concatenate them in load order into a vm context with DOM stubs
// and assert the key invariants across the whole surface (data, SRS, lazy views,
// course gate, practice queue, analytics). This is the regression net for the
// feature code that isn't a pure module.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

const ORDER = [
  "js/shared/observability.js",
  "js/data/words.js",
  "js/data/structures.js",
  "js/data/grammar.js",
  "js/data/course.js",
  "js/domain/logic.js",
  "js/domain/srs.js",
  "js/shared/core.js",
  "js/app/detail.js",
  "js/features/practice/reference.js",
  "js/features/flashcards/study.js",
  "js/features/flashcards/review.js",
  "js/app/ui.js",
  "js/features/today/session.js",
  "js/features/practice/practice.js",
  "js/features/course/course.js",
  "js/app/analytics.js",
  "js/app/main.js",
];

function fakeEl() {
  const e = {
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    removeAttribute() {},
    getAttribute: () => null,
    insertAdjacentHTML() {},
    textContent: "",
    innerHTML: "",
    hidden: false,
    style: { setProperty() {} },
    value: "",
    querySelector: () => fakeEl(),
    querySelectorAll: () => [],
    appendChild() {},
    remove() {},
    focus() {},
    closest: () => null,
  };
  return e;
}

let ctx;
beforeAll(() => {
  const store = {};
  const loc = { hash: "", search: "", protocol: "https:" };
  ctx = {
    console: { log() {}, error() {}, warn() {} },
    Math, Date, JSON, parseInt, parseFloat, isNaN,
    Array, Object, String, Number, Set, Map, RegExp, URLSearchParams, Promise,
    setTimeout: (f) => f && f(),
    fetch: () => Promise.reject(new Error("no network in test")),
    localStorage: {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => (store[k] = v),
      removeItem: (k) => delete store[k],
    },
    document: {
      getElementById: () => fakeEl(),
      querySelector: () => fakeEl(),
      querySelectorAll: () => [],
      addEventListener() {},
      body: fakeEl(),
      documentElement: fakeEl(),
      head: fakeEl(),
      createElement: () => fakeEl(),
    },
    navigator: {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    location: loc,
    history: { replaceState: (a, b, h) => (loc.hash = h) },
    scrollY: 0,
    speechSynthesis: { getVoices: () => [], speak() {}, cancel() {} },
    SpeechSynthesisUtterance: function () {},
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.window.addEventListener = function () {};
  vm.createContext(ctx);
  const code = ORDER.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n");
  vm.runInContext(code + "\n;this.__api = { DB, getState, schedule, switchView, buildPracticeQueue, courseLessonStatus, pathLessons, computeLearningStats, COURSE };", ctx);
});

describe("app smoke", () => {
  it("boots with the full word list", () => {
    expect(ctx.__api.DB.words.length).toBeGreaterThan(1300);
  });
  it("exposes the SRS domain functions", () => {
    expect(typeof ctx.__api.getState).toBe("function");
    expect(typeof ctx.__api.schedule).toBe("function");
  });
  it("renders every lazy view without throwing", () => {
    const views = ["wordsView", "patternsView", "structuresView", "grammarView", "writingView", "studyView", "courseView"];
    for (const v of views) expect(() => ctx.__api.switchView(v)).not.toThrow();
  });
  it("builds a mixed practice queue for a lesson's words", () => {
    const ids = ctx.__api.COURSE.authored["hsk1-01"].wordIds;
    const words = ids.map((id) => ctx.__api.DB.words.find((w) => w.id === id));
    const q = ctx.__api.buildPracticeQueue(words);
    expect(q.length).toBeGreaterThan(words.length); // per-word + match/order/speak
    const modes = new Set(q.map((x) => x.mode));
    expect(modes.has("typing")).toBe(true);
  });
  it("gates a lesson until the previous one is mastered", () => {
    const path0 = ctx.__api.COURSE.paths[0];
    const lessons = ctx.__api.pathLessons(path0);
    expect(ctx.__api.courseLessonStatus(path0, lessons[0].id)).toBe("available");
    expect(ctx.__api.courseLessonStatus(path0, lessons[1].id)).toBe("locked");
  });
  it("computes learning stats", () => {
    const s = ctx.__api.computeLearningStats(Date.now());
    expect(s).toHaveProperty("learned");
    expect(s.total).toBeGreaterThan(1300);
    expect(Array.isArray(s.dueByDay)).toBe(true);
  });
});
