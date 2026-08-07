// Playwright end-to-end config. Serves the static app and runs the browser
// tests in tests-e2e/. Kept separate from the vitest unit/smoke tests.
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests-e2e",
  testMatch: "**/*.e2e.js",
  timeout: 30000,
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    trace: "on-first-retry",
  },
  webServer: {
    // No build step — just serve the files. python3 is on GitHub runners.
    command: "python3 -m http.server 5173",
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
