import { expect, test } from "@playwright/test";

test.describe("Demo checkout privacy boundary", () => {
  test("uses synthetic details and reaches only a non-authoritative preview", async ({
    page,
  }, testInfo) => {
    await page.goto("/catalog");

    const firstAddBtn = page.locator('button:has-text("В кошик")').first();
    await expect(firstAddBtn).toBeVisible();
    await firstAddBtn.click({ force: true });

    const cartDrawer = page.locator(".cart-drawer-panel");
    await expect(cartDrawer).toBeVisible();
    await expect(page.locator("#cart-drawer-title")).toContainText(
      "Кошик покупок",
    );

    const checkoutBtn = page.locator('a:has-text("Оформити замовлення")');
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    await page.waitForURL("**/checkout");
    await expect(
      page.getByRole("heading", { name: "Демо-перегляд замовлення" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.locator("main")).toContainText(
      "Не вводьте реальні контактні чи адресні дані.",
    );

    await page.screenshot({
      caret: "initial",
      path: testInfo.outputPath("checkout-demo-flow.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: /Продовжити до доставки/ }).click();
    await expect(
      page.getByRole("heading", { name: "2. Демо-сценарій доставки" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await page.getByRole("radio", { name: /Кур['’]єр/ }).check();
    await page
      .getByRole("button", { name: /Продовжити до сценарію оплати/ })
      .click();

    await expect(
      page.getByRole("heading", {
        name: "3. Платіжний сценарій (Демо-перевірка)",
      }),
    ).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await page
      .getByRole("button", { name: /Перейти до підсумку чернетки/ })
      .click();

    await expect(
      page.getByRole("heading", { name: "4. Підсумок демо-кошика" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await expect(page.locator("main")).toContainText("Демо-покупець");
    await expect(page.locator("main")).toContainText(
      "Контактні дані не запитуються",
    );
    await expect(page.locator("main")).toContainText(
      "Демо-локація; фактичну адресу не запитано",
    );

    await page.screenshot({
      caret: "initial",
      path: testInfo.outputPath("checkout-demo-summary.png"),
      fullPage: true,
    });

    await page
      .getByRole("button", { name: "Переглянути демонстраційний стан" })
      .click();
    await page.waitForURL("**/checkout/success?mode=draft");
    await expect(
      page.getByRole("heading", { name: "Демо-перегляд кошика" }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText(
      "Серверне оформлення наразі недоступне",
    );
    await expect(page.getByRole("status")).toContainText(
      "Контактні дані не запитуються, не зберігаються й не передаються",
    );
    await expect(
      page.getByRole("heading", { name: "Дякуємо! Ваше замовлення прийнято" }),
    ).not.toBeVisible();
    await expect(page.locator("main form")).toHaveCount(0);
  });
});
