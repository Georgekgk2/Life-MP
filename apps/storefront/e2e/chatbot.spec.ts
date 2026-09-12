import { expect, test } from "@playwright/test";

test.describe("FAQ Chatbot Widget E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("renders FAB button in bottom-right corner and opens/closes dialog", async ({
    page,
  }) => {
    const fab = page.locator(".chatbot-fab");
    await expect(fab).toBeVisible();
    await expect(fab).toHaveAttribute("aria-expanded", "false");
    await expect(fab).toHaveAttribute(
      "aria-label",
      "Відкрити помічника вітрини",
    );

    // Open dialog
    await fab.click();
    await expect(fab).toHaveAttribute("aria-expanded", "true");

    const dialog = page.locator("#faq-assistant-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("role", "dialog");
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(page.locator("#faq-assistant-title")).toContainText(
      "Помічник вітрини",
    );

    // Initial welcome message is displayed
    await expect(dialog.locator(".chatbot-msg--bot").first()).toContainText(
      "Вітаємо на вітрині ЛАЙФ",
    );

    // Close dialog via close button
    const closeBtn = page.locator('[data-chatbot-close="true"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    await expect(dialog).toHaveCount(0);
    await expect(fab).toHaveAttribute("aria-expanded", "false");
    // Focus restored to opener
    await expect(fab).toBeFocused();
  });

  test("closes dialog on Escape key and restores focus to FAB button", async ({
    page,
  }) => {
    const fab = page.locator(".chatbot-fab");
    await fab.click();

    const dialog = page.locator("#faq-assistant-dialog");
    await expect(dialog).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(fab).toBeFocused();
  });

  test("traps keyboard focus inside chatbot dialog", async ({ page }) => {
    const fab = page.locator(".chatbot-fab");
    await fab.click();

    const dialog = page.locator("#faq-assistant-dialog");
    await expect(dialog).toBeVisible();

    // First focus is on close button
    const closeBtn = dialog.locator('[data-chatbot-close="true"]');
    await expect(closeBtn).toBeFocused();

    // Tab backwards (Shift+Tab) -> wraps to last focusable element
    await page.keyboard.press("Shift+Tab");
    const lastElement = dialog.locator(".chatbot-panel__reset-btn");
    await expect(lastElement).toBeFocused();

    // Tab forward -> wraps back to first element (close button)
    await page.keyboard.press("Tab");
    await expect(closeBtn).toBeFocused();
  });

  test("clicking FAQ pill displays instant deterministic answer with route link", async ({
    page,
  }) => {
    const fab = page.locator(".chatbot-fab");
    await fab.click();

    const dialog = page.locator("#faq-assistant-dialog");
    await expect(dialog).toBeVisible();

    // Click "Як працює демо?" pill
    const demoPill = dialog.locator(
      '.chatbot-pill-btn:has-text("Як працює демо?")',
    );
    await expect(demoPill).toBeVisible();
    await demoPill.click();

    // User question appears
    await expect(dialog.locator(".chatbot-msg--user")).toContainText(
      "Як працює демо?",
    );

    // Bot response appears with link
    const botReply = dialog.locator(".chatbot-msg--bot").last();
    await expect(botReply).toContainText("public-demo");
    await expect(botReply).toContainText(
      "реальні банківські платежі, кошти та фіскальні чеки не списуються",
    );

    const actionLink = botReply.locator("a.chatbot-msg__link");
    await expect(actionLink).toBeVisible();
    await expect(actionLink).toHaveAttribute("href", "/checkout");

    // Click reset button
    const resetBtn = dialog.locator(".chatbot-panel__reset-btn");
    await resetBtn.click();
    await expect(dialog.locator(".chatbot-msg--bot")).toHaveCount(1);
    await expect(dialog.locator(".chatbot-msg--user")).toHaveCount(0);
  });

  test("ensures no horizontal overflow on mobile viewports (375px/390px)", async ({
    page,
  }) => {
    // 1. Mobile 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    let hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow).toBe(false);

    // Open chatbot
    const fab = page.locator(".chatbot-fab");
    await fab.click();
    const dialog = page.locator("#faq-assistant-dialog");
    await expect(dialog).toBeVisible();

    hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow).toBe(false);

    // 2. Mobile 375px
    await page.setViewportSize({ width: 375, height: 667 });
    hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});
