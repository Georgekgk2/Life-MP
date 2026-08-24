import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "pnpm run build && mkdir -p .next/standalone/apps/storefront/public .next/standalone/apps/storefront/.next/static && cp -R public/. .next/standalone/apps/storefront/public/ && cp -R .next/static/. .next/standalone/apps/storefront/.next/static/ && node .next/standalone/apps/storefront/server.js",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: {
      NODE_ENV: "production",
      PORT: "3100",
      HOSTNAME: "127.0.0.1",
      CATALOG_SOURCE: "fixtures",
      ALLOW_SYNTHETIC_CATALOG: "true",
      LIFE_E2E: "true",
    },
  },
});
