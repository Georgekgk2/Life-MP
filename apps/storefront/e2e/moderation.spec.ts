import { test, expect } from "@playwright/test";

test.describe("Moderation Route Security & Containment E2E", () => {
  test("fails closed with 404 Not Found in demonstration mode", async ({
    page,
  }) => {
    // 1. Attempt to visit moderation dashboard directly
    const res = await page.goto("/moderation");
    expect(res?.status()).toBe(404);

    // 2. Sensitive moderation headings and controls are completely absent
    await expect(page.locator("h1")).toHaveCount(0);
    await expect(page.locator(".moderation-metrics")).toHaveCount(0);
  });
});
