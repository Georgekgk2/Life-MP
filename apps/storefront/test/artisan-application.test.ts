import { describe, expect, it } from "vitest";
import {
  artisanApplicationSchema,
  categoryOptions,
} from "../src/schema/artisan-application";

describe("artisanApplicationSchema", () => {
  const validPayload = {
    name: "Оксана Шевченко",
    workshopName: "Майстерня «Глина та Сонце»",
    category: "pottery" as const,
    description:
      "Створюємо авторський керамічний посуд ручної роботи з екологічної карпатської глини.",
    email: "oksana@craft.ua",
    phone: "+380 67 123 45 67",
    portfolioUrl: "https://instagram.com/craft_pottery",
    acceptedTerms: true as const,
  };

  it("validates a complete, correct artisan application", () => {
    const result = artisanApplicationSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Оксана Шевченко");
      expect(result.data.category).toBe("pottery");
    }
  });

  it("accepts valid application without optional portfolio URL", () => {
    const result = artisanApplicationSchema.safeParse({
      ...validPayload,
      portfolioUrl: "",
    });
    expect(result.success).toBe(true);
  });

  it("fails when name is too short", () => {
    const result = artisanApplicationSchema.safeParse({
      ...validPayload,
      name: "О",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("не менше 2 символів");
    }
  });

  it("fails when workshop name is empty", () => {
    const result = artisanApplicationSchema.safeParse({
      ...validPayload,
      workshopName: "",
    });
    expect(result.success).toBe(false);
  });

  it("fails on invalid category", () => {
    const result = artisanApplicationSchema.safeParse({
      ...validPayload,
      category: "invalid_category",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Оберіть категорію виробів",
      );
    }
  });

  it("fails when description is too short (under 20 characters)", () => {
    const result = artisanApplicationSchema.safeParse({
      ...validPayload,
      description: "Кераміка",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("не менше 20 символів");
    }
  });

  it("fails on invalid email format", () => {
    const result = artisanApplicationSchema.safeParse({
      ...validPayload,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("fails on invalid phone number", () => {
    const result = artisanApplicationSchema.safeParse({
      ...validPayload,
      phone: "123",
    });
    expect(result.success).toBe(false);
  });

  it("fails when community terms are not accepted", () => {
    const result = artisanApplicationSchema.safeParse({
      ...validPayload,
      acceptedTerms: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("правилами спільноти");
    }
  });

  it("provides available categories with human-readable Ukrainian labels", () => {
    expect(categoryOptions.length).toBeGreaterThan(0);
    const pottery = categoryOptions.find((c) => c.value === "pottery");
    expect(pottery?.label).toContain("Кераміка");
  });
});
