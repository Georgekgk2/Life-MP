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

  test("mobile menu profile action displays in-development notice without navigating to /profile", async ({
    page,
  }) => {
    await page.goto("/");
    const menuToggle = page.locator(".site-header__menu-toggle");
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
    }

    const mobileProfileBtn = page.getByRole("button", {
      name: "Особистий кабінет",
    });
    if (await mobileProfileBtn.isVisible()) {
      await mobileProfileBtn.click();
      expect(page.url()).not.toContain("/profile");
      await expect(
        page.getByRole("heading", { name: "Особистий кабінет у розробці" }),
      ).toBeVisible();
    }
  });
});
