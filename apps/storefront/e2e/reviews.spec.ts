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

test.describe("Product Reviews, Ratings & Social Proof E2E (Phase 3)", () => {
  test("user can view reviews, average rating, and submit a new verified review", async ({
    page,
  }, testInfo) => {
    // 1. Visit Product Page
    await page.goto("/catalog/dim/chashka-ranok");
    await expect(page.locator("h1")).toContainText("Чашка «Ранок»");

    // 2. Scroll to Reviews Section
    const reviewsHeading = page.getByRole("heading", {
      name: "Відгуки поціновувачів крафту",
    });
    await expect(reviewsHeading).toBeVisible();

    // 3. Verify average rating summary & pre-seeded reviews
    await expect(page.getByText(/★+/).first()).toBeVisible();
    await expect(
      page.getByText("✓ Перевірений покупець").first(),
    ).toBeVisible();

    // Capture screenshot of reviews section
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `product-reviews-section-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 4. Open Review Submission Form
    const openFormBtn = page.getByRole("button", {
      name: /✍️ Залишити відгук/i,
    });
    await expect(openFormBtn).toBeVisible();
    await openFormBtn.click({ force: true });

    // 5. Fill Form
    await page.fill("#reviewAuthor", "Ярослав П.");
    await page.fill("#reviewCity", "Полтава");
    await page.fill(
      "#reviewComment",
      "Чудова глиняна чашка! Дуже приємне молочіння та збереження тепла. Замовлятиму ще на подарунки.",
    );

    // 6. Submit Review
    const submitReviewBtn = page.getByRole("button", {
      name: /Опублікувати відгук/i,
    });
    await expect(submitReviewBtn).toBeVisible();
    await submitReviewBtn.click({ force: true });

    // 7. Verify Toast & New Review in List
    await expect(
      page.getByText("Ваш відгук успішно опубліковано"),
    ).toBeVisible();
    await expect(page.getByText("Ярослав П.")).toBeVisible();
    await expect(
      page.getByText(
        "Чудова глиняна чашка! Дуже приємне молочіння та збереження тепла.",
      ),
    ).toBeVisible();

    // Capture screenshot with new review
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `product-reviews-submitted-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
  });
});
