import { describe, it, expect } from "vitest";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";

// data.js and examples.js are plain browser scripts (const DB / window.DB_EXAMPLES),
// not ES modules, so we load them in a sandbox to validate their contents.
const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(dir, "..", "js", f), "utf8");
function loadDB() {
  const c = {};
  vm.createContext(c);
  vm.runInContext(read("data.js") + "\nthis.__DB = DB;", c);
  return c.__DB;
}
function loadExamples() {
  const c = {};
  c.window = c;
  vm.createContext(c);
  vm.runInContext(read("examples.js"), c);
  return c.window.DB_EXAMPLES;
}

const DB = loadDB();
const EX = loadExamples();

const REQUIRED = ["id", "level", "chinese", "pinyin", "english", "khmer", "chars"];
const LATIN_OR_CYRILLIC = /[A-Za-zЀ-ӿ]/;
const CJK = /[㐀-鿿]/;
const KHMER = /[ក-៿]/;

describe("data.js — word integrity", () => {
  it("has a non-empty words array", () => {
    expect(Array.isArray(DB.words)).toBe(true);
    expect(DB.words.length).toBeGreaterThan(0);
  });

  it("every word has all required fields", () => {
    const bad = DB.words
      .filter((w) => REQUIRED.some((k) => w[k] === undefined || w[k] === null || w[k] === ""))
      .map((w) => w.chinese || w.id);
    expect(bad).toEqual([]);
  });

  it("chars is an array on every word", () => {
    const bad = DB.words.filter((w) => !Array.isArray(w.chars)).map((w) => w.chinese);
    expect(bad).toEqual([]);
  });

  it("word ids are unique", () => {
    const ids = DB.words.map((w) => String(w.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chinese field has no Latin or Cyrillic letters (catches typo bugs)", () => {
    const bad = DB.words.filter((w) => LATIN_OR_CYRILLIC.test(w.chinese || "")).map((w) => w.chinese);
    expect(bad).toEqual([]);
  });

  it("pinyin has no Chinese characters (fields not swapped)", () => {
    const bad = DB.words.filter((w) => CJK.test(w.pinyin || "")).map((w) => w.chinese);
    expect(bad).toEqual([]);
  });

  it("khmer contains Khmer script on every word", () => {
    const bad = DB.words.filter((w) => !KHMER.test(w.khmer || "")).map((w) => w.chinese);
    expect(bad).toEqual([]);
  });
});

describe("examples.js — integrity", () => {
  it("every example key maps to a real word id", () => {
    const ids = new Set(DB.words.map((w) => String(w.id)));
    const orphan = Object.keys(EX).filter((k) => !ids.has(String(k)));
    expect(orphan).toEqual([]);
  });

  it("every example sentence has cn, py, and en", () => {
    const bad = [];
    for (const k of Object.keys(EX))
      for (const ex of EX[k]) if (!ex.cn || !ex.py || !ex.en) bad.push(k);
    expect(bad).toEqual([]);
  });
});
