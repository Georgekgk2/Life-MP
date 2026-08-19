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

test.describe("Saved Wishlist & Artisan Application E2E", () => {
  test("wishlist flow: adds item from catalog, verifies header badge, views /saved, and removes item", async ({
    page,
  }, testInfo) => {
    // 1. Visit catalog
    await page.goto("/catalog");
    await expect(page.locator("h1")).toContainText("Тематичні добірки");

    // 2. Initial header badge should not show count
    const savedLink = page.getByRole("link", { name: /Збережені товари/i });
    await expect(savedLink).toBeVisible();
    await expect(page.locator(".site-header__saved-badge")).toHaveCount(0);

    // 3. Click save button on first product card
    const firstSaveBtn = page
      .getByRole("button", { name: /Зберегти товар/i })
      .first();
    await expect(firstSaveBtn).toBeVisible();
    await firstSaveBtn.click();

    // 4. Header badge should now display '1'
    const badge = page.locator(".site-header__saved-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("1");

    // 5. Navigate to /saved
    await savedLink.click();
    await expect(page).toHaveURL("/saved");
    await expect(page.locator("h1")).toContainText("Збережені товари");

    // 6. Verify saved product card is visible on /saved
    const savedCard = page.locator(".saved-product-card").first();
    await expect(savedCard).toBeVisible();

    // Capture screenshot of /saved with item
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `saved-with-item-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 7. Remove item from saved
    const removeBtn = page.getByRole("button", { name: /Видалити/i }).first();
    await expect(removeBtn).toBeVisible();
    await removeBtn.click({ force: true });

    // 8. Verify empty state appears
    await expect(
      page.getByText("У вас поки немає збережених виробів"),
    ).toBeVisible();
    await expect(page.locator(".site-header__saved-badge")).toHaveCount(0);

    // Capture screenshot of empty /saved
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `saved-empty-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
  });

  test("artisan flow: navigates to /join-as-artisan, validates form fields, and submits successfully", async ({
    page,
  }, testInfo) => {
    // 1. Visit /join-as-artisan
    await page.goto("/join-as-artisan");
    await expect(page.locator("h1")).toContainText(
      "Стати частиною спільноти Life-MP",
    );
    await expect(page.getByText("100% Локальність та склад")).toBeVisible();

    // Capture screenshot of join page
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `join-as-artisan-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 2. Submit empty form to trigger validation
    const submitBtn = page.getByRole("button", {
      name: /Подати заявку на модерацію/i,
    });
    await submitBtn.click();

    // 3. Verify validation error messages
    await expect(page.getByText(/не менше 2 символів/i).first()).toBeVisible();
    await expect(page.getByText(/Оберіть категорію виробів/i)).toBeVisible();
    await expect(page.getByText(/правилами спільноти/i)).toBeVisible();

    // 4. Fill form with valid details
    await page.fill("#artisan-name", "Ярослав Дерев'янко");
    await page.fill("#artisan-workshop", "Крафтова Різьба Полісся");
    await page.selectOption("#artisan-category", "home");
    await page.fill(
      "#artisan-desc",
      "Виготовляємо екологічний дерев'яний декор, авторські свічники та посуд із сухостійного поліського дуба та ясеня.",
    );
    await page.fill("#artisan-email", "yaroslav@polissia-craft.ua");
    await page.fill("#artisan-phone", "+380 50 987 65 43");
    await page.fill(
      "#artisan-portfolio",
      "https://instagram.com/polissia_craft",
    );
    await page.check("#artisan-terms");

    // 5. Submit valid form
    await submitBtn.click();

    // 6. Verify success summary screen
    await expect(
      page.getByText("Заявку успішно прийнято на модерацію!"),
    ).toBeVisible();
    await expect(page.getByText("Ярослав Дерев'янко")).toBeVisible();
    await expect(page.getByText("Крафтова Різьба Полісся")).toBeVisible();
    await expect(page.getByText("yaroslav@polissia-craft.ua")).toBeVisible();

    // Capture screenshot of success screen
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `artisan-success-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
  });
});
