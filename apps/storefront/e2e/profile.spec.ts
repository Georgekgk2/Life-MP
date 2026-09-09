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

  test("fails closed with 404 Not Found on /profile even when forged session cookies are present", async ({
    page,
    context,
  }) => {
    // Inject forged authentication / session cookies
    await context.addCookies([
      {
        name: "life_mp_auth_session",
        value: "forged-session-token-12345",
        domain: "127.0.0.1",
        path: "/",
      },
      {
        name: "life_customer_id",
        value: "forged-customer-id",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    const res = await page.goto("/profile");
    expect(res?.status()).toBe(404);

    await expect(page.locator("h1")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(
      "Особистий кабінет покупця",
    );
  });

  test("mobile menu profile action displays in-development notice without navigating to /profile", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "Mobile navigation menu is only visible on mobile viewports",
    );

    await page.goto("/");
    const menuToggle = page.locator(".site-header__menu-toggle");
    await expect(menuToggle).toBeVisible();
    await menuToggle.click();

    const mobileProfileBtn = page
      .locator("#primary-navigation")
      .getByRole("button", { name: "Особистий кабінет" });
    await expect(mobileProfileBtn).toBeVisible();
    await mobileProfileBtn.click();

    expect(page.url()).not.toContain("/profile");
    await expect(
      page.getByRole("heading", { name: "Особистий кабінет у розробці" }),
    ).toBeVisible();
  });

  test("desktop header profile action displays in-development notice without navigating to /profile", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "Desktop header action is only visible on desktop viewports",
    );

    await page.goto("/");
    const desktopProfileBtn = page
      .locator(".site-header__actions")
      .getByRole("button", { name: "Особистий кабінет покупця (у розробці)" });
    await expect(desktopProfileBtn).toBeVisible();
    await desktopProfileBtn.click();

    expect(page.url()).not.toContain("/profile");
    await expect(
      page.getByRole("heading", { name: "Особистий кабінет у розробці" }),
    ).toBeVisible();
  });
});
