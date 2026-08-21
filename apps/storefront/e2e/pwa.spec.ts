import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const screenshotsDir = path.resolve(process.cwd(), "artifacts/screenshots");

test.beforeAll(() => {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
});

test.describe("Progressive Web App (PWA) & Mobile Capabilities", () => {
  test("manifest and service worker are properly served", async ({
    request,
  }) => {
    // 1. Check webmanifest endpoint
    const manifestRes = await request.get("/manifest.webmanifest");
    expect(manifestRes.status()).toBe(200);
    const manifest = await manifestRes.json();
    expect(manifest.name).toBe("ЛАЙФ — Ярмарок крафту");
    expect(manifest.short_name).toBe("ЛАЙФ");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#1a3026");

    // 2. Check service worker endpoint
    const swRes = await request.get("/sw.js");
    expect(swRes.status()).toBe(200);
    const swText = await swRes.text();
    expect(swText).toContain("life-mp-v1");
    expect(swText).toContain("STATIC_CACHE");

    // 3. Check PWA icons delivery
    const icon192Res = await request.get("/icons/icon-192.png");
    expect(icon192Res.status()).toBe(200);
    expect(icon192Res.headers()["content-type"]).toContain("image/png");

    const icon512Res = await request.get("/icons/icon-512.png");
    expect(icon512Res.status()).toBe(200);

    const iconSvgRes = await request.get("/icons/icon.svg");
    expect(iconSvgRes.status()).toBe(200);
    expect(iconSvgRes.headers()["content-type"]).toContain("image/svg+xml");
  });

  test("PWA tags and metadata are embedded in HTML", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 1. Verify manifest link in DOM
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.webmanifest");

    // 2. Verify theme color
    const themeColorMeta = page.locator('meta[name="theme-color"]');
    await expect(themeColorMeta).toHaveAttribute("content", "#1a3026");

    // 3. Verify Apple Web App Capable
    const appleCapableMeta = page.locator(
      'meta[name="mobile-web-app-capable"]',
    );
    await expect(appleCapableMeta).toHaveAttribute("content", "yes");

    // 4. Capture screenshot of PWA home
    await page.screenshot({
      caret: "initial",
      path: path.join(screenshotsDir, "pwa-home-desktop.png"),
      fullPage: false,
    });
  });
});
