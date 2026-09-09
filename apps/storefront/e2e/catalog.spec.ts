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
      "Речі з історією. Люди, яких хочеться підтримати.",
    );
    await expect(page.locator(".page-intro")).toContainText("Life-MP");
    await expect(page.getByRole("status")).toContainText(
      "Демонстраційний режим",
    );

    // Capture homepage screenshot
    await page.screenshot({
      caret: "initial",
      path: path.join(screenshotsDir, `homepage-${testInfo.project.name}.png`),
      fullPage: true,
    });

    // Assert absence of buy / checkout / payment buttons
    await expect(page.getByText("Купити")).not.toBeVisible();
    await expect(page.getByText("Оплатити")).not.toBeVisible();
    await expect(page.getByText("Оформити замовлення")).not.toBeVisible();

    // Verify public-demo catalog showcase loads cleanly without warning banner
    await expect(
      page.getByText("Каталог тимчасово недоступний"),
    ).not.toBeVisible();
    await expect(
      page.getByText("Вітрина тимчасово недоступна"),
    ).not.toBeVisible();

    // 2. Catalog Page
    await page.goto("/catalog");
    await expect(page.locator("h1")).toContainText("Тематичні добірки");
    await expect(page.getByText("Купити")).not.toBeVisible();
    await expect(
      page.getByText("Каталог тимчасово недоступний"),
    ).not.toBeVisible();
    await expect(page.locator(".category-card")).toHaveCount(6);

    // Capture catalog screenshot
    await page.screenshot({
      caret: "initial",
      path: path.join(screenshotsDir, `catalog-${testInfo.project.name}.png`),
      fullPage: true,
    });

    // 3. Category Page
    await page.goto("/catalog/odiah");
    await expect(page.locator("h1")).toContainText("Одяг і аксесуари");
    await expect(page.getByText("Купити")).not.toBeVisible();

    // Capture category screenshot
    await page.screenshot({
      caret: "initial",
      path: path.join(screenshotsDir, `category-${testInfo.project.name}.png`),
      fullPage: true,
    });
    // 4. Product detail must not make payment, escrow, delivery, or payout claims.
    await page.goto("/catalog/odiah/futbolka-svitlo");
    await expect(page.locator("h1")).toContainText("Футболка «Світло»");
    await expect(page.getByText("Некомерційний sandbox")).toBeVisible();
    await expect(page.getByText("Кошти зарезервовано")).toHaveCount(0);
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

  test("cart traps focus, closes on Escape, and restores opener focus", async ({
    page,
  }) => {
    await page.goto("/");
    const addButton = page.getByRole("button", { name: /^Додати / }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    const dialog = page.getByRole("dialog", { name: "Кошик покупок" });
    const closeButton = page.getByRole("button", { name: "Закрити кошик" });
    const clearButton = page.getByRole("button", { name: "Очистити" });

    await expect(dialog).toBeVisible();
    await expect(closeButton).toBeFocused();
    await expect(clearButton).toBeVisible();

    await page.keyboard.press("Shift+Tab");
    await expect(clearButton).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(addButton).toBeFocused();
  });

  test("ensures no horizontal document overflow", async ({ page }) => {
    await page.goto("/catalog");
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
