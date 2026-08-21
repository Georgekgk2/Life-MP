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

test.describe("Instant Search & Ukrainian Morphology E2E", () => {
  test("opens search modal, tests autocompletion, synonyms, and typo tolerance", async ({
    page,
  }, testInfo) => {
    // 1. Visit homepage
    await page.goto("/");

    // 2. Click Search button in header
    const searchBtn = page.getByRole("button", { name: /Швидкий пошук/i });
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();

    // 3. Verify search modal opened
    const searchInput = page.getByLabel("Поле швидкого пошуку");
    await expect(searchInput).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Швидкий пошук маркетплейсу" }),
    ).toBeVisible();

    // 4. Test exact keyword search
    await searchInput.fill("чашка");
    await expect(
      page.getByRole("dialog").getByRole("link", { name: /Чашка «Ранок»/i }),
    ).toBeVisible();

    // Capture screenshot of search modal with suggestions
    await page.screenshot({
      caret: "initial",
      path: path.join(
        screenshotsDir,
        `search-modal-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 5. Test Ukrainian synonym search ("ткацтво" finds linen goods)
    await searchInput.fill("ткацтво");
    await expect(
      page.getByRole("dialog").getByRole("link", { name: /Шопер «Разом»/i }),
    ).toBeVisible();

    await page.screenshot({
      caret: "initial",
      path: path.join(
        screenshotsDir,
        `search-synonyms-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 6. Test typo tolerance ("олівци" finds "Набір олівців «Колір»")
    await searchInput.fill("олівци");
    await expect(
      page
        .getByRole("dialog")
        .getByRole("link", { name: /Набір олівців «Колір»/i }),
    ).toBeVisible();

    // 7. Click suggestion to navigate to product detail
    const suggestionItem = page
      .getByRole("dialog")
      .getByRole("link", { name: /Набір олівців «Колір»/i });
    await expect(suggestionItem).toBeVisible();
    await suggestionItem.click();

    // 8. Verify product detail page loaded
    await expect(page).toHaveURL("/catalog/kanzeliariia/olivtsi-kolir");
    await expect(page.locator("h1")).toContainText("Набір олівців «Колір»");
  });
});
