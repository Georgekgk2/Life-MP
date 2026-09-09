import { test, expect } from "@playwright/test";

test.describe("Vendor Dashboard Route Security & Containment E2E", () => {
  test("fails closed with 404 Not Found in demonstration mode", async ({
    page,
  }) => {
    // 1. Attempt to visit vendor dashboard directly
    const res = await page.goto("/vendor/dashboard");
    expect(res?.status()).toBe(404);

    // 2. Sensitive vendor UI, order selector, and financial metrics must not be accessible
    await expect(page.locator("h1")).toHaveCount(0);
    await expect(page.locator("#vendor-selector")).toHaveCount(0);
    await expect(
      page.getByText(/tax_identifier|iban|комісі|виплат/i),
    ).toHaveCount(0);
  });
});
