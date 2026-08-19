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

test.describe("Community Stories & Dynamic Events E2E", () => {
  test("story detail page renders linked artisan products with save buttons", async ({
    page,
  }, testInfo) => {
    // 1. Visit story page
    await page.goto("/stories/politsia-istorii");
    await expect(page.locator("h1")).toContainText("Полиця для історій");

    // 2. Verify breadcrumbs
    const breadcrumbs = page.locator(".breadcrumbs");
    await expect(breadcrumbs).toBeVisible();
    await expect(breadcrumbs).toContainText("Історії");

    // 3. Verify linked artisan products section
    const productsHeading = page.getByRole("heading", {
      name: "Вироби майстра з цієї історії",
    });
    await expect(productsHeading).toBeVisible();

    // 4. Verify product card and save button within story
    const productCard = page.locator(".product-card").first();
    await expect(productCard).toBeVisible();
    const saveBtn = productCard.getByRole("button", {
      name: /Зберегти товар/i,
    });
    await expect(saveBtn).toBeVisible();

    // 5. Click save button and verify header badge
    await saveBtn.click();
    const headerBadge = page.locator(".site-header__saved-badge");
    await expect(headerBadge).toBeVisible();
    await expect(headerBadge).toHaveText("1");

    // 6. Capture screenshot
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `story-detail-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
  });

  test("events listing links to dynamic event detail page with agenda and related products", async ({
    page,
  }, testInfo) => {
    // 1. Visit events listing
    await page.goto("/events");
    await expect(page.locator("h1")).toContainText(
      "Зустрічі та спільні моменти",
    );
    // 2. Click first event card to navigate to detail page
    const detailLink = page
      .getByRole("link", { name: /Детальніше про подію/i })
      .first();
    await expect(detailLink).toBeVisible();
    await detailLink.click();

    // 3. Verify event detail page loaded
    await expect(page).toHaveURL(/\/events\/[a-z0-9-]+/);
    await expect(page.locator("h1")).toBeVisible();

    // 4. Verify agenda program section
    await expect(
      page.getByRole("heading", { name: "Програма зустрічі" }),
    ).toBeVisible();

    // 5. Verify host master section
    await expect(
      page.getByRole("heading", { name: "Познайомтеся з ведучим" }),
    ).toBeVisible();

    // 6. Verify event products section
    await expect(
      page.getByRole("heading", { name: "Вироби та ремесло цієї події" }),
    ).toBeVisible();

    // 7. Capture screenshot
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `event-detail-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
  });
});
