import { test, expect } from "@playwright/test";

test.describe("Storefront runtime diagnostics", () => {
  test("has no browser console errors or uncaught page errors", async ({
    page,
  }) => {
    const runtimeErrors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        runtimeErrors.push(`console.error: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      runtimeErrors.push(`pageerror: ${error.message}`);
    });

    for (const route of [
      "/vendor/products/new",
      "/catalog/odiah/futbolka-svitlo",
      "/moderation",
    ]) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
    }

    expect(runtimeErrors).toEqual([]);
  });
});
