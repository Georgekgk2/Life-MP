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

test.describe("Product Reviews, Ratings & Social Proof (Phase 4D)", () => {
  test("fails closed when the server review API is unavailable", async ({
    page,
  }, testInfo) => {
    await page.goto("/catalog/dim/chashka-ranok");
    await expect(page.locator("h1")).toContainText("Чашка «Ранок»");

    const reviewsHeading = page.getByRole("heading", {
      name: "Відгуки поціновувачів крафту",
    });
    await expect(reviewsHeading).toBeVisible();
    await expect(
      page.getByText(
        "Публічні схвалені відгуки про «Чашка «Ранок»» наразі недоступні.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(/лише після отримання з серверного API/i),
    ).toBeVisible();

    // No browser-local review data or anonymous submission controls may be exposed.
    await expect(
      page.getByRole("button", { name: /Залишити відгук/i }),
    ).toHaveCount(0);
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.locator("#reviewAuthor")).toHaveCount(0);
    await expect(page.getByText("✓ Перевірений покупець")).toHaveCount(0);

    await page.screenshot({
      caret: "initial",
      path: path.join(
        screenshotsDir,
        `product-reviews-fail-closed-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
  });
});
