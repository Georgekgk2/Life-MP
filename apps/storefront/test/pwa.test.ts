import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import manifest from "../app/manifest";

function getPublicPath(...segments: string[]) {
  const base = process.cwd().endsWith("apps/storefront")
    ? path.resolve(process.cwd(), "public")
    : path.resolve(process.cwd(), "apps/storefront/public");
  return path.join(base, ...segments);
}

describe("PWA Manifest & Configuration", () => {
  it("manifest() provides complete Ukrainian localization and brand metadata", () => {
    const data = manifest();
    expect(data.name).toBe("ЛАЙФ — Ярмарок крафту");
    expect(data.short_name).toBe("ЛАЙФ");
    expect(data.start_url).toBe("/");
    expect(data.display).toBe("standalone");
    expect(data.theme_color).toBe("#1a3026");
    expect(data.background_color).toBe("#faf7f2");
    expect(data.lang).toBe("uk");
    expect(data.icons?.length).toBeGreaterThanOrEqual(4);

    const sizes = data.icons?.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("public/manifest.webmanifest matches manifest specification and exists on disk", () => {
    const manifestPath = getPublicPath("manifest.webmanifest");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const raw = fs.readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.name).toBe("ЛАЙФ — Ярмарок крафту");
    expect(parsed.short_name).toBe("ЛАЙФ");
    expect(parsed.display).toBe("standalone");
    expect(parsed.theme_color).toBe("#1a3026");
    expect(parsed.icons.length).toBeGreaterThanOrEqual(4);
  });

  it("public/sw.js exists and implements caching strategies", () => {
    const swPath = getPublicPath("sw.js");
    expect(fs.existsSync(swPath)).toBe(true);

    const swCode = fs.readFileSync(swPath, "utf-8");
    expect(swCode).toContain("life-mp-v1");
    expect(swCode).toContain("STATIC_CACHE");
    expect(swCode).toContain("PAGES_CACHE");
    expect(swCode).toContain("PRECACHE_ASSETS");
    expect(swCode).toContain("install");
    expect(swCode).toContain("activate");
    expect(swCode).toContain("fetch");
  });

  it("all required PWA icons exist in public/icons", () => {
    const iconsDir = getPublicPath("icons");
    expect(fs.existsSync(path.join(iconsDir, "icon-192.png"))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, "icon-512.png"))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, "icon-maskable-192.png"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(iconsDir, "icon-maskable-512.png"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(iconsDir, "apple-touch-icon.png"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(iconsDir, "icon.svg"))).toBe(true);
  });
});
