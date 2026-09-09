import { test, expect } from "@playwright/test";

test.describe("Vendor Product New Route Security & Containment E2E", () => {
  test("fails closed with 404 Not Found in demonstration mode", async ({
    page,
  }) => {
    // 1. Attempt to visit new product submission page directly
    const res = await page.goto("/vendor/products/new");
    expect(res?.status()).toBe(404);

    // 2. Sensitive form is not rendered
    await expect(page.locator("h1")).toHaveCount(0);
    await expect(page.locator("form")).toHaveCount(0);
  });
});
