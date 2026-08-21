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

test.describe("Vendor Dashboard containment E2E (Phase 4D)", () => {
  test("fails closed until server authentication and authorization are available", async ({
    page,
  }, testInfo) => {
    await page.goto("/vendor/dashboard");

    await expect(page.locator("h1")).toContainText(
      "Кабінет майстра недоступний",
    );
    await expect(
      page.getByText(/потрібна автентифікація майстра/i),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Безпечний режим");

    // No browser-side vendor selection or order/tracking mutations are exposed.
    await expect(page.locator("#vendor-selector")).toHaveCount(0);
    const dashboard = page.locator(
      'section[aria-labelledby="vendor-dashboard-unavailable-title"]',
    );
    await expect(dashboard.locator("button")).toHaveCount(0);

    // Sensitive financial and identity data must not be rendered by this route.
    await expect(
      page.getByText(/tax_identifier|iban|комісі|виплат/i),
    ).toHaveCount(0);

    await page.screenshot({
      caret: "initial",
      path: path.join(
        screenshotsDir,
        `vendor-dashboard-contained-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
  });
});
