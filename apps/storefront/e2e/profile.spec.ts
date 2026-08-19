import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const screenshotsDir = path.resolve(
  process.cwd(),
  "../../artifacts/screenshots",
);

test.beforeAll(() => {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
});

test.describe("Customer Profile & Preferences E2E", () => {
  test("navigates to profile, switches tabs, toggles notifications, and edits personal details", async ({
    page,
  }, testInfo) => {
    // 1. Visit homepage and click Profile link in header
    await page.goto("/");
    const profileLink = page.getByRole("link", {
      name: "Особистий кабінет покупця",
    });
    await expect(profileLink).toBeVisible();
    await profileLink.click({ force: true });

    // 2. Verify profile page loaded
    await expect(page).toHaveURL("/profile");
    await expect(page.locator("h1")).toContainText("Особистий кабінет покупця");

    // 3. Verify user overview card
    await expect(page.getByText("Олена Мельник")).toBeVisible();
    await expect(page.getByText("Поціновувач крафту")).toBeVisible();

    // 4. Capture screenshot of default saved items tab
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `profile-saved-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 5. Switch to Favorite Workshops tab
    const workshopsTabBtn = page.getByRole("button", {
      name: /Улюблені майстерні/i,
    });
    await expect(workshopsTabBtn).toBeVisible();
    await workshopsTabBtn.click({ force: true });

    await expect(page.getByText("Майстерня «Глина та Світло»")).toBeVisible();
    await expect(page.getByText("Лляне Ткацтво «Берегиня»")).toBeVisible();

    // 6. Switch to Notifications tab and toggle preferences
    const notifsTabBtn = page.getByRole("button", { name: /Сповіщення/i });
    await expect(notifsTabBtn).toBeVisible();
    await notifsTabBtn.click({ force: true });

    await expect(page.getByText("Налаштування сповіщень")).toBeVisible();
    await expect(page.getByText("Нові крафтові вироби")).toBeVisible();

    // Capture screenshot of notifications tab
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `profile-notifications-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });

    // 7. Switch to Personal Details tab and edit profile
    const detailsTabBtn = page.getByRole("button", { name: /Особисті дані/i });
    await expect(detailsTabBtn).toBeVisible();
    await detailsTabBtn.click({ force: true });

    await expect(
      page.getByRole("heading", { name: "Особисті дані" }),
    ).toBeVisible();

    // Edit city
    await page.fill("#profile-city", "Львів");
    const saveBtn = page.getByRole("button", { name: /Зберегти зміни/i });
    await saveBtn.click({ force: true });

    // Verify success message
    await expect(
      page.getByText("Дані профілю успішно оновлено!"),
    ).toBeVisible();

    // Capture screenshot of details tab
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        `profile-details-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
  });
});
