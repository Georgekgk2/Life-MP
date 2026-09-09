import { test, expect } from "@playwright/test";

test.describe("Customer Profile Route Security & Containment E2E", () => {
  test("fails closed with 404 Not Found in demonstration mode", async ({
    page,
  }) => {
    // 1. Attempt to visit customer profile directly
    const res = await page.goto("/profile");
    expect(res?.status()).toBe(404);

    // 2. Sensitive customer profile headings and controls are completely absent
    await expect(page.locator("h1")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(
      "Особистий кабінет покупця",
    );
  });
});
