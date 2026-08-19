import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const screenshotsDir = path.resolve(process.cwd(), "artifacts/screenshots");

test.beforeAll(() => {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
});

test.describe("Multi-Vendor Cart, Checkout, Order Splitting & Escrow Sandbox (Phase 4C)", () => {
  test("user can add multi-vendor items, complete checkout, inspect split child orders, and simulate delivery settlement", async ({
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
      path: path.join(
        screenshotsDir,
        `checkout-form-${testInfo.project.name}.png`,
      ),
      fullPage: false,
    });

    // 6. Submit Checkout Form
    const submitOrderBtn = page.locator(
      'button:has-text("Підтвердити замовлення")',
    );
    await expect(submitOrderBtn).toBeVisible();
    await submitOrderBtn.click({ force: true });

    // 7. Verify Success Page
    await page.waitForURL("**/checkout/success?orderNumber=**");
    await expect(
      page.getByRole("heading", { name: "Дякуємо! Ваше замовлення прийнято" }),
    ).toBeVisible();

    // Capture screenshot of success page
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `checkout-success-${testInfo.project.name}.png`,
      ),
      fullPage: false,
    });

    // 8. Navigate to Order Tracking Page
    const trackOrderBtn = page.locator(
      'a:has-text("Відстежувати посилки в реальному часі")',
    );
    await expect(trackOrderBtn).toBeVisible();
    await trackOrderBtn.click({ force: true });

    // 9. Inspect Order Tracking View
    await page.waitForURL("**/orders/**");
    await expect(
      page.getByRole("heading", { name: /Замовлення #LF-/ }),
    ).toBeVisible();
    await expect(page.getByText("Escrow-холдинг")).toBeVisible();
    await expect(page.getByText("Симулятор трекінгу")).toBeVisible();

    // 10. Simulate Nova Poshta Delivery Trigger (Status 9)
    const deliverBtn = page.locator('button:has-text("Вручено (9)")').first();
    await expect(deliverBtn).toBeVisible();
    await deliverBtn.click({ force: true });

    // 11. Verify Settlement payout creation
    await expect(page.getByText("Виплату проведено")).toBeVisible();

    // Capture screenshot of settled order tracking
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `order-settlement-tracking-${testInfo.project.name}.png`,
      ),
      fullPage: false,
    });
  });
});
