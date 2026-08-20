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

test.describe("Vendor Management & Logistics Workspace E2E (Phase 2)", () => {
  test("artisan can switch workshops, manage orders, track Nova Poshta status, and inspect IBAN payouts", async ({
    page,
  }, testInfo) => {
    // 1. Visit Vendor Dashboard
    await page.goto("/vendor/dashboard");
    await expect(page.locator("h1")).toContainText("Кабінет Майстра");
    await expect(page.getByText("✓ Перевірена майстерня")).toBeVisible();

    // Capture screenshot of default orders tab
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `vendor-dashboard-orders-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 2. Switch workshop in selector
    const vendorSelector = page.locator("#vendor-selector");
    await expect(vendorSelector).toBeVisible();
    await vendorSelector.selectOption("berehynia");
    await expect(vendorSelector).toHaveValue("berehynia");

    // Switch back to Olena
    await vendorSelector.selectOption("olena");
    await expect(vendorSelector).toHaveValue("olena");

    // 3. Inspect Orders tab and update tracking status
    const updateBtn = page
      .getByRole("button", { name: /Передати перевізнику|Прибуло у відділення|Вручено покупцю/i })
      .first();

    if (await updateBtn.isVisible()) {
      await updateBtn.click({ force: true });
      await expect(
        page.getByRole("status").or(page.locator('text=/Оновлено статус|вручено/i')),
      ).toBeVisible();
    }

    // 4. Switch to Finances & Settlement tab
    const financesTabBtn = page.getByRole("button", {
      name: /💰 Фінанси та виплати/i,
    });
    await expect(financesTabBtn).toBeVisible();
    await financesTabBtn.click({ force: true });

    await expect(page.getByText("Загальний виторг майстерні:")).toBeVisible();
    await expect(page.getByText("Комісія маркетплейсу (10%):")).toBeVisible();
    await expect(page.getByText("Виплачено на IBAN (Settled):")).toBeVisible();

    // Capture screenshot of finances tab
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `vendor-dashboard-finances-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 5. Switch to Products tab
    const productsTabBtn = page.getByRole("button", {
      name: /🏺 Товари майстерні/i,
    });
    await expect(productsTabBtn).toBeVisible();
    await productsTabBtn.click({ force: true });

    await expect(
      page.getByRole("heading", { name: /Товари майстерні/i }),
    ).toBeVisible();
    await expect(page.getByText("Чашка «Ранок»")).toBeVisible();

    // 6. Switch to Compliance tab
    const complianceTabBtn = page.getByRole("button", {
      name: /📜 Комплаєнс та оферти/i,
    });
    await expect(complianceTabBtn).toBeVisible();
    await complianceTabBtn.click({ force: true });

    await expect(page.getByText("Податкова реєстрація")).toBeVisible();
    await expect(
      page.getByText("Агентський договір приєднання"),
    ).toBeVisible();
  });
});
