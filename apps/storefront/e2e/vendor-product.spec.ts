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
    // 1. Visit new vendor product page
    await page.goto("/vendor/products/new");
    await expect(page.locator("h1")).toContainText(
      "Додати виріб до каталогу Life-MP",
    );

    // 2. Capture screenshot of submission page
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `vendor-product-new-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 3. Submit empty form to trigger validation errors
    const submitBtn = page.getByRole("button", {
      name: /Подати виріб на модерацію/i,
    });
    await submitBtn.click();

    // 4. Verify validation error messages
    await expect(page.getByText(/не менше 2 символів/i).first()).toBeVisible();
    await expect(page.getByText(/Оберіть категорію каталогу/i)).toBeVisible();
    await expect(page.getByText(/стандартам спільноти/i)).toBeVisible();

    // 5. Fill form with valid craft product details
    await page.fill("#product-name", "Керамічна ваза «Гуцульська Ружа»");
    await page.fill("#product-workshop", "Гончарня Павла Коваля");
    await page.selectOption("#product-category", "dim");
    await page.fill("#product-price", "890");
    await page.fill(
      "#product-desc",
      "Авторська висока ваза ручного гончарного витягування з карпатської глини. Декорована автентичним рельєфним розписом.",
    );
    await page.check("#product-rules");

    // 6. Submit valid form
    await submitBtn.click();

    // 7. Verify success screen with live preview card
    await expect(
      page.getByText("Виріб успішно надіслано на модерацію!"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Керамічна ваза «Гуцульська Ружа»" }),
    ).toBeVisible();
    await expect(page.locator(".product-card data")).toContainText("890");

    // 8. Capture screenshot of success screen
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `vendor-product-success-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 9. Navigate to moderation dashboard and switch to products tab
    await page.goto("/moderation");
    const productsTabBtn = page.getByRole("button", {
      name: /Товари на модерації/i,
    });
    await expect(productsTabBtn).toBeVisible();
    await productsTabBtn.click();

    // 10. Verify product cards in moderation tab
    await expect(page.getByText("Всі вироби")).toBeVisible();
    await expect(
      page.getByText("Керамічна таріль «Поліське Сонце»"),
    ).toBeVisible();

    // 11. Capture screenshot of moderation products tab
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `moderation-products-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 12. Open review modal for submitted product
    const moderateBtn = page.getByRole("button", {
      name: /Модерація товару: Керамічна таріль «Поліське Сонце»/i,
    });
    await expect(moderateBtn).toBeVisible();
    await moderateBtn.click();

    // 13. Verify review modal and approve
    const modalTitle = page.getByRole("heading", {
      name: /Модерація виробу: Керамічна таріль «Поліське Сонце»/i,
    });
    await expect(modalTitle).toBeVisible();

    await page.fill(
      "#review-prod-notes",
      "Опис та якість відповідають критеріям автентичного ремесла. Схвалено до каталогу.",
    );

    const approveBtn = page.getByRole("button", {
      name: /✅ Схвалити до каталогу/i,
    });
    await approveBtn.click();

    // 14. Verify modal closed and status updated to approved
    await expect(modalTitle).not.toBeVisible();
    await expect(
      page.getByText(
        "Опис та якість відповідають критеріям автентичного ремесла. Схвалено до каталогу.",
      ),
    ).toBeVisible();
  });
});
