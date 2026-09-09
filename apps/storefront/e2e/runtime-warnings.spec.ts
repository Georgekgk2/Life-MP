import { test, expect } from "@playwright/test";

test.describe("Storefront runtime diagnostics", () => {
  test("has no browser console warnings, errors, or uncaught page errors on public routes", async ({
    page,
  }) => {
    const runtimeDiagnostics: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        runtimeDiagnostics.push(`console.${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      runtimeDiagnostics.push(`pageerror: ${error.message}`);
    });

    for (const route of [
      "/",
      "/catalog",
      "/stories",
      "/events",
      "/charity",
      "/partners",
      "/join-as-artisan",
    ]) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
    }

    expect(runtimeDiagnostics).toEqual([]);
  });
});
