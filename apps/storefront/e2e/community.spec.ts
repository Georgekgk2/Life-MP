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
    await saveBtn.click({ force: true });
    const headerBadge = page.locator(
      "a.site-header__saved-link .site-header__saved-badge",
    );
    await expect(headerBadge).toBeVisible();
    await expect(headerBadge).toHaveText("1");

    // 6. Capture screenshot
    await page.screenshot({
      caret: "initial",
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
    await detailLink.click({ force: true });

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
      caret: "initial",
      path: path.join(
        screenshotsDir,
        `event-detail-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
  });
  test("organizations page displays support centers with video workshop badges and product detail displays certificate switcher", async ({
    page,
  }) => {
    // 1. Visit organizations/partners page
    await page.goto("/partners");
    await expect(page.locator("h1")).toContainText(
      "Організації та центри підтримки",
    );
    await expect(page.getByText("Ветеранська хата")).toBeVisible();
    await expect(page.getByText("Центр Капралова")).toBeVisible();
    await expect(page.getByText("Центр Крутова")).toBeVisible();
    await expect(page.getByText("Інформаційне застереження")).toBeVisible();

    // 2. Visit certified Dobroizh product detail page
    await page.goto("/catalog/podarunky/nabor-podarunok");
    await expect(page.locator("h1")).toContainText(
      "Набір «Добрий знак» (Доброїж смаколики)",
    );
    await expect(page.getByText("ДСТУ / Сертифікат якості")).toBeVisible();

    // 3. Verify certificate switcher tabs
    const certTab = page.getByRole("tab", {
      name: /Сертифікат відповідності/i,
    });
    await expect(certTab).toBeVisible();
    const photoTab = page.getByRole("tab", { name: /Фото виробу/i });
    await expect(photoTab).toBeVisible();

    // 4. Switch to certificate tab and verify document preview
    await certTab.click();
    await expect(page.getByText("Держстандарт / ДСТУ")).toBeVisible();
    await expect(
      page.getByText("Орган акредитації: Держпродспоживслужба"),
    ).toBeVisible();
    const certImage = page.locator(
      '.product-media-viewer img[alt*="Сертифікат"]',
    );
    await expect(certImage).toBeVisible();

    // 5. Switch back to photo tab
    await photoTab.click();
    const productImage = page.locator(
      '.product-media-viewer img[alt*="Фото виробу"]',
    );
    await expect(productImage).toBeVisible();
  });

  test("video player modal opens on organization card and referral attribution captures ?ref parameter", async ({
    page,
  }) => {
    // 1. Visit partners page and click video button
    await page.goto("/partners");
    const videoBtn = page
      .getByRole("button", { name: /Переглянути відео/i })
      .first();
    await expect(videoBtn).toBeVisible();
    await videoBtn.click();

    // 2. Verify modal opened
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Демо-потік активний")).toBeVisible();

    // 3. Close on Escape
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();

    // 4. Test referral attribution via URL parameter
    await page.goto("/?ref=tiktok_creator_alex&utm_source=tiktok");
    const referralNotice = page.locator(".referral-notice-bar");
    await expect(referralNotice).toBeVisible();
    await expect(referralNotice).toContainText("@tiktok_creator_alex");
    await expect(referralNotice).toContainText("TikTok");

    // 5. Dismiss referral notice
    const dismissBtn = referralNotice.getByRole("button", {
      name: /Приховати сповіщення/i,
    });
    await dismissBtn.click();
    await expect(referralNotice).not.toBeVisible();
  });
});
