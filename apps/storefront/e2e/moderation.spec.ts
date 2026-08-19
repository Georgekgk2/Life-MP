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

test.describe("Moderation Dashboard E2E", () => {
  test("views applications, filters by status, searches, and reviews a pending application", async ({
    page,
  }, testInfo) => {
    // 1. Visit moderation dashboard
    await page.goto("/moderation");
    await expect(page.locator("h1")).toContainText(
      "Кабінет модератора платформи",
    );

    // 2. Verify metrics counters
    const metricsContainer = page.locator(".moderation-metrics");
    await expect(metricsContainer).toBeVisible();
    await expect(page.getByText("Всі заявки")).toBeVisible();
    await expect(page.getByText("⏳ Очікують")).toBeVisible();
    await expect(page.getByText("✅ Схвалені")).toBeVisible();

    // 3. Search for a specific workshop
    const searchInput = page.getByLabel("Пошук заявок");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Глина");

    // Verify filtered result
    await expect(page.getByText("Майстерня «Глина та Світло»")).toBeVisible();
    await expect(page.getByText("Лляне Ткацтво «Берегиня»")).not.toBeVisible();

    // Clear search
    await searchInput.fill("");

    // 4. Capture screenshot of dashboard
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `moderation-dashboard-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 5. Open review modal for pending application
    const reviewBtn = page.getByRole("button", {
      name: /Модерація заявки: Майстерня «Глина та Світло»/i,
    });
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    // 6. Verify modal opened
    const modalTitle = page.getByRole("heading", {
      name: /Модерація: Майстерня «Глина та Світло»/i,
    });
    await expect(modalTitle).toBeVisible();

    // Capture screenshot of review modal
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `moderation-modal-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 7. Enter reviewer notes and approve application
    const notesTextarea = page.locator("#review-notes");
    await notesTextarea.fill(
      "Майстерня успішно пройшла перевірку зразків карпатської глини. Схвалено до розміщення.",
    );

    const approveBtn = page.getByRole("button", { name: /✅ Схвалити/i });
    await approveBtn.click();

    // 8. Verify modal closed and application status updated
    await expect(modalTitle).not.toBeVisible();
    await expect(
      page.getByText(
        "Майстерня успішно пройшла перевірку зразків карпатської глини. Схвалено до розміщення.",
      ),
    ).toBeVisible();
  });
});
