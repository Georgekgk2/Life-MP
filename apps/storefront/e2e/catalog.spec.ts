import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const screenshotsDir = path.resolve(
  process.cwd(),
  "../../artifacts/screenshots",
);

test.beforeAll(() => {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
});

test.describe("Catalog E2E & Visual Artifacts", () => {
  test("loads homepage, catalog, and category page, captures visual artifacts, and verifies non-commercial invariants", async ({
    page,
  }, testInfo) => {
    // 1. Homepage
    await page.goto("/");
    await expect(page.locator("h1")).toContainText(
      "Місце, де історії людей поєднуються зі спільнотою",
    );
    await expect(page.locator(".page-intro")).toContainText("Life-MP");

    // Capture homepage screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, `homepage-${testInfo.project.name}.png`),
      fullPage: true,
    });

    // Assert absence of buy / checkout / payment buttons
    await expect(page.getByText("Купити")).not.toBeVisible();
    await expect(page.getByText("Оплатити")).not.toBeVisible();
    await expect(page.getByText("Оформити замовлення")).not.toBeVisible();

    // 2. Catalog Page
    await page.goto("/catalog");
    await expect(page.locator("h1")).toContainText("Тематичні добірки");
    await expect(page.getByText("Купити")).not.toBeVisible();

    // Capture catalog screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, `catalog-${testInfo.project.name}.png`),
      fullPage: true,
    });

    // 3. Category Page
    await page.goto("/catalog/odiah");
    await expect(page.locator("h1")).toContainText("Одяг і аксесуари");
    await expect(page.getByText("Купити")).not.toBeVisible();

    // Capture category screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, `category-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  test("skip link moves focus to #main-content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.locator(".skip-link");
    await expect(skipLink).toBeFocused();

    await page.keyboard.press("Enter");
    const mainContent = page.locator("#main-content");
    await expect(mainContent).toBeFocused();
  });

  test("ensures no horizontal document overflow", async ({ page }) => {
    await page.goto("/catalog");
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
