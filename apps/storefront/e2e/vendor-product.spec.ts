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

test.describe("Vendor Product Submissions & Moderation E2E", () => {
  test("submits a new craft product, views preview, and moderates it in the dashboard", async ({
    page,
  }, testInfo) => {
    // 1. Visit /vendor/products/new
    await page.goto("/vendor/products/new");
    await expect(page.locator("h1")).toContainText("Додати виріб до каталогу");
    await expect(page.getByText("Для перевірених майстерень")).toBeVisible();

    // Capture screenshot of new product submission form
    await page.screenshot({
      caret: "initial",
      path: path.join(
        screenshotsDir,
        `vendor-product-new-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 2. Submit empty form to trigger validation
    const submitBtn = page.getByRole("button", {
      name: /Подати виріб на модерацію/i,
    });
    await submitBtn.click({ force: true });

    // 3. Verify validation error messages
    await expect(page.getByText(/не менше 2 символів/i).first()).toBeVisible();
    await expect(page.getByText(/Оберіть категорію каталогу/i)).toBeVisible();
    await expect(page.getByText(/стандартам спільноти/i)).toBeVisible();

    // 4. Fill form with valid craft product details
    await page.fill("#product-name", "Керамічна ваза «Гуцульська Ружа»");
    await page.fill("#product-workshop", "Гончарня Павла Коваля");
    await page.selectOption("#product-category", "dim");
    await page.fill("#product-price", "890");
    await page.fill(
      "#product-desc",
      "Авторська висока ваза ручного гончарного витягування з карпатської глини. Декорована автентичним рельєфним розписом.",
    );
    await page.check("#product-rules", { force: true });

    // 5. Submit valid form
    await submitBtn.click({ force: true });

    // 6. Verify success screen with live preview card
    await expect(
      page.getByText("Виріб успішно надіслано на модерацію!"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Керамічна ваза «Гуцульська Ружа»" }),
    ).toBeVisible();
    await expect(page.locator(".product-card data")).toContainText("890");

    // 7. Capture screenshot of success screen
    await page.screenshot({
      caret: "initial",
      path: path.join(
        screenshotsDir,
        `vendor-product-success-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 8. Navigate to moderation dashboard and switch to products tab
    await page.goto("/moderation");
    const productsTabBtn = page.getByRole("button", {
      name: /Товари на модерації/i,
    });
    await expect(productsTabBtn).toBeVisible();
    await productsTabBtn.click({ force: true });

    // 9. Verify product cards in moderation tab
    await expect(page.getByText("Всі вироби")).toBeVisible();
    await expect(
      page.getByText("Керамічна таріль «Поліське Сонце»"),
    ).toBeVisible();

    // 10. Capture screenshot of moderation products tab
    await page.screenshot({
      caret: "initial",
      path: path.join(
        screenshotsDir,
        `moderation-products-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 11. Open review modal for submitted product
    const moderateBtn = page.getByRole("button", {
      name: /Модерація товару: Керамічна таріль «Поліське Сонце»/i,
    });
    await expect(moderateBtn).toBeVisible();
    await moderateBtn.click({ force: true });

    // 12. Verify review modal and approve
    const modalTitle = page.getByRole("heading", {
      name: /Модерація виробу: Керамічна таріль «Поліське Сонце»/i,
    });
    await expect(modalTitle).toBeVisible();

    await page.fill(
      "#review-prod-notes",
      "Опис та якість відповідають критеріям автентичного ремесла. Схвалено до каталогу.",
    );

    const approveBtn = page
      .getByRole("dialog")
      .getByRole("button", { name: /✅ Схвалити до каталогу/i });
    await approveBtn.click({ force: true });

    // 13. Verify modal closed and status updated to approved
    await expect(modalTitle).not.toBeVisible();
    await expect(
      page.getByText(
        "Опис та якість відповідають критеріям автентичного ремесла. Схвалено до каталогу.",
      ),
    ).toBeVisible();
  });
});
