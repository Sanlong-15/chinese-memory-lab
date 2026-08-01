import js from "@eslint/js";

// We lint the pure logic module and the tests (clean, no DOM globals).
// The browser app.js is intentionally out of scope for now — it is a big
// DOM file with many shared globals; Phase B keeps the risky part small.
export default [
  js.configs.recommended,
  {
    files: ["js/logic.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        module: "readonly",
        window: "readonly",
        globalThis: "readonly",
      },
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
];
