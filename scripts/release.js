#!/usr/bin/env node
// Stamp one cache version everywhere, so a release can never ship a half-bumped
// mix of assets. Usage:  node scripts/release.js <version>
// Example:  node scripts/release.js 61
const fs = require("fs");
const path = require("path");

const v = process.argv[2];
if (!v || !/^\d+$/.test(v)) {
  console.error("usage: node scripts/release.js <integer-version>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const edits = [];

// 1) index.html — every ?v=N on css/js links
edit("index.html", (s) => s.replace(/\?v=\d+/g, "?v=" + v));
// 2) shared/core.js — the lazily-injected examples.js path
edit("js/shared/core.js", (s) =>
  s.replace(/\?v=\d+/g, "?v=" + v)
);
// 3) sw.js — cache name + the ?v used to build the precache list
edit("sw.js", (s) =>
  s.replace(/cml-v\d+/g, "cml-v" + v).replace(/"\?v=\d+"/g, '"?v=' + v + '"')
);

function edit(rel, fn) {
  const p = path.join(root, rel);
  const before = fs.readFileSync(p, "utf8");
  const after = fn(before);
  fs.writeFileSync(p, after);
  const n = (before.match(/\?v=\d+|cml-v\d+/g) || []).length;
  edits.push(`${rel} (${n} refs)`);
}

console.log("Stamped cache version v=" + v + " in:\n  " + edits.join("\n  "));
console.log("Now commit and push. The service worker will refresh the cache.");
