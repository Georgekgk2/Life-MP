import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const screenshotsDir = path.resolve(process.cwd(), "artifacts/screenshots");

test.beforeAll(() => {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
});

test.describe("Multi-Vendor Cart & Checkout Draft Containment (Phase 4D)", () => {
  test("keeps checkout customer-facing state draft-only when server order writer is unavailable", async ({
    page,
  }, testInfo) => {
    // 1. Visit Catalog
    await page.goto("/catalog");
    await page.waitForLoadState("domcontentloaded");

    // 2. Add first item to cart
    const firstAddBtn = page.locator('button:has-text("В кошик")').first();
    await expect(firstAddBtn).toBeVisible();
    await firstAddBtn.click({ force: true });

    // 3. Verify cart drawer opens
    const cartDrawer = page.locator(".cart-drawer-panel");
    await expect(cartDrawer).toBeVisible();
    await expect(page.locator("#cart-drawer-title")).toContainText(
      "Кошик покупок",
    );

    // 4. Click Checkout button in cart drawer
    const checkoutBtn = page.locator('a:has-text("Оформити замовлення")');
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click({ force: true });

    // 5. Verify Checkout page
    await page.waitForURL("**/checkout");
    await expect(
      page.getByRole("heading", { name: "Оформлення замовлення" }),
    ).toBeVisible();

    // Capture screenshot of checkout form
    await page.screenshot({
      caret: "initial",
      path: testInfo.outputPath("checkout-form.png"),
      fullPage: true,
    });

    // 6. Submit Checkout Form as a non-authoritative draft
    const submitDraftBtn = page.locator(
      'button:has-text("Переглянути стан чернетки")',
    );
    await expect(submitDraftBtn).toBeVisible();
    await submitDraftBtn.click({ force: true });

    // 7. Verify explicit unavailable/draft-only state
    await page.waitForURL("**/checkout/success?mode=draft");
    await expect(
      page.getByRole("heading", { name: "Чернетка оформлення" }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText(
      "Серверне оформлення наразі недоступне",
    );
    await expect(page.getByRole("status")).toContainText(
      "Платіж, Escrow-холдинг, комісія, IBAN, ТТН і виплата майстерні не створюються",
    );
    await expect(
      page.getByRole("heading", { name: "Дякуємо! Ваше замовлення прийнято" }),
    ).not.toBeVisible();
    await expect(page.locator("body")).not.toContainText("Олена Мельник");
    await expect(page.locator("body")).not.toContainText(
      "Відстежувати посилки в реальному часі",
    );

    // Navigation remains available without exposing an order-tracking mutation.
    await expect(
      page.getByRole("link", { name: "Повернутися до чернетки" }),
    ).toHaveAttribute("href", "/checkout");
    await expect(
      page.getByRole("link", { name: "Повернутися до каталогу" }),
    ).toHaveAttribute("href", "/catalog");

    // Capture screenshot of contained draft state
    await page.screenshot({
      caret: "initial",
      path: testInfo.outputPath("checkout-draft-state.png"),
      fullPage: true,
    });
  });
});
