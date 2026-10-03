import { expect, test } from "@playwright/test";

const createdDraftName = "Підвіска «Медовий вечір»";

test.describe("Isolated artisan demo workspace", () => {
  test("creates a local draft and clears it after reload without server writes", async ({
    page,
  }) => {
    const mutationRequests: string[] = [];
    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        message.text().toLowerCase().includes("hydration")
      ) {
        hydrationErrors.push(message.text());
      }
    });
    page.on("request", (request) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
        mutationRequests.push(`${request.method()} ${request.url()}`);
      }
    });

    const response = await page.goto("/demo/artisan");
    const main = page.locator("#main-content");

    expect(response?.status()).toBe(200);
    await expect(
      main.getByRole("heading", { name: "Кабінет майстра" }),
    ).toBeVisible();
    expect(hydrationErrors).toEqual([]);
    await expect(main.getByText("Демонстраційні дані")).toBeVisible();

    await main.getByRole("button", { name: "Створити чернетку" }).click();
    await expect(main.getByLabel("Назва виробу")).toBeFocused();
    await main.getByLabel("Назва виробу").fill(createdDraftName);
    await main.getByLabel("Категорія").selectOption("dim");
    await main
      .getByLabel("Опис виробу")
      .fill("Керамічна підвіска для демонстраційного каталогу майстерні.");
    await main.getByLabel("Ціна, гривні").fill("680");
    await main.getByRole("button", { name: "Зберегти демо-чернетку" }).click();
    await expect(
      main.getByRole("button", { name: "Створити чернетку" }),
    ).toBeFocused();

    await expect(main.getByRole("status")).toContainText("лише в цій вкладці");
    await expect(
      main.getByRole("heading", { name: createdDraftName }),
    ).toBeVisible();
    expect(mutationRequests).toEqual([]);

    await page.reload();
    await expect(
      main.getByRole("heading", { name: createdDraftName }),
    ).toHaveCount(0);
  });

  test("edits only local drafts and filters by current status", async ({
    page,
  }) => {
    const main = page.locator("#main-content");
    const mutationRequests: string[] = [];
    page.on("request", (request) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
        mutationRequests.push(`${request.method()} ${request.url()}`);
      }
    });
    await page.goto("/demo/artisan");

    await main
      .getByRole("button", { name: "Редагувати: Чашка «Тихий ранок»" })
      .click();
    await expect(main.getByLabel("Назва виробу")).toBeFocused();
    await main.getByLabel("Назва виробу").fill("Чашка «Теплий світанок»");
    await main.getByRole("button", { name: "Зберегти демо-чернетку" }).click();
    await expect(
      main.getByRole("button", {
        name: "Редагувати: Чашка «Теплий світанок»",
      }),
    ).toBeFocused();

    await expect(main.getByRole("status")).toContainText(
      "На перевірку нічого не надіслано",
    );
    await expect(
      main.getByRole("heading", { name: "Чашка «Теплий світанок»" }),
    ).toBeVisible();
    expect(mutationRequests).toEqual([]);

    await main.getByRole("button", { name: /На перевірці/ }).click();
    await expect(
      main.getByRole("button", { name: /На перевірці/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      main.getByRole("heading", { name: "Лляний шопер «Тиха неділя»" }),
    ).toBeVisible();
    await expect(
      main.getByRole("heading", { name: "Чашка «Теплий світанок»" }),
    ).toHaveCount(0);
    await expect(main.getByText("Редагування недоступне в демо")).toBeVisible();
    await main.getByRole("button", { name: /Потрібні зміни/ }).click();
    await main
      .getByRole("button", {
        name: "Редагувати: Набір свічок «Липневий сад»",
      })
      .click();
    await main.getByLabel("Назва виробу").fill("Набір свічок «Теплий вечір»");
    await main.getByRole("button", { name: "Зберегти демо-чернетку" }).click();
    await expect(
      main.getByRole("heading", { name: "Набір свічок «Теплий вечір»" }),
    ).toBeVisible();
    const draftFilter = main.getByRole("button", { name: /Чернетки 2/ });
    await draftFilter.click();
    await expect(draftFilter).toHaveAttribute("aria-pressed", "true");
    await expect(
      main.getByRole("heading", { name: "Набір свічок «Теплий вечір»" }),
    ).toBeVisible();
    expect(mutationRequests).toEqual([]);
  });

  test("shows connected field errors and rejects invalid local drafts", async ({
    page,
  }) => {
    const main = page.locator("#main-content");
    await page.goto("/demo/artisan");
    await main.getByRole("button", { name: "Створити чернетку" }).click();

    const nameField = main.getByLabel("Назва виробу");
    const categoryField = main.getByLabel("Категорія");
    const descriptionField = main.getByLabel("Опис виробу");
    const priceField = main.getByLabel("Ціна, гривні");

    await nameField.fill("x");
    await descriptionField.fill("Короткий опис");
    await priceField.fill("0");
    await main.getByRole("button", { name: "Зберегти демо-чернетку" }).click();

    for (const field of [
      nameField,
      categoryField,
      descriptionField,
      priceField,
    ]) {
      await expect(field).toHaveAttribute("aria-invalid", "true");
      const errorId = await field.getAttribute("aria-describedby");
      expect(errorId).toBeTruthy();
      await expect(main.locator(`#${errorId}`)).toBeVisible();
    }

    await expect(
      main.getByRole("heading", { name: "x", exact: true }),
    ).toHaveCount(0);
  });
});
