// End-to-end smoke: drives the real app in Chromium. This is the coverage the
// headless vm smoke can't give — it proves the UI actually renders and responds
// to clicks in a browser. Selectors may need small tweaks after the first CI run.
const { test, expect } = require("@playwright/test");

// Fresh browser context shows the welcome dialog on first load — dismiss it.
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  const close = page.locator("#welcomeX");
  if (await close.isVisible().catch(() => false)) await close.click();
});

test("app loads with the daily session", async ({ page }) => {
  await expect(page.locator("h1.title")).toContainText("Character Memory Lab");
  await expect(page.locator("#todayStartBtn")).toBeVisible();
});

test("starting the daily review renders a task card", async ({ page }) => {
  await page.locator("#todayStartBtn").click();
  // a task (flashcard / MCQ / etc.) is rendered into #todayCard
  await expect(page.locator("#todayCard")).not.toBeEmpty();
});

test("opening a course lesson shows its words", async ({ page }) => {
  await page.locator('.group-btn[data-group="learn"]').click();
  // Course is the first sub-tab under Learn; the map renders lesson nodes
  await expect(page.locator(".course-node").first()).toBeVisible();
  await page.locator(".course-node:not(.locked)").first().click();
  // the "Meet the words" cards render (proves the lazy charInfo chunk loaded too)
  await expect(page.locator(".lesson-word").first()).toBeVisible({ timeout: 15000 });
});

test("a word detail opens from the vocabulary grid", async ({ page }) => {
  await page.locator('.group-btn[data-group="learn"]').click();
  await page.getByRole("button", { name: "Vocabulary" }).first().click();
  await page.locator(".word-card").first().click();
  await expect(page.locator("#overlay .detail-head .zi")).toBeVisible({
    timeout: 15000,
  });
});
