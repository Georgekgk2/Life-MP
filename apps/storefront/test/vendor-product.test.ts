import { describe, expect, it } from "vitest";
import {
  vendorCategoryOptions,
  vendorProductSchema,
} from "../src/schema/vendor-product";

describe("vendorProductSchema", () => {
  const validProduct = {
    name: "Керамічна чашка «Світанок»",
    workshopName: "Майстерня Олени Ковальчук",
    categorySlug: "dim" as const,
    description:
      "Авторська керамічна чашка ручного ліплення з чорнолощеної карпатської глини. Об'єм 350 мл.",
    priceUah: 480,
    isOrganic: true,
    isCertified: true,
    isVerifiedCraft: true,
    acceptedRules: true as const,
  };

  it("validates a complete, valid vendor product submission", () => {
    const result = vendorProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Керамічна чашка «Світанок»");
      expect(result.data.priceUah).toBe(480);
      expect(result.data.isOrganic).toBe(true);
    }
  });

  it("fails when product name is too short", () => {
    const result = vendorProductSchema.safeParse({
      ...validProduct,
      name: "Ч",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("не менше 2 символів");
    }
  });

  it("fails when description is too short (under 20 characters)", () => {
    const result = vendorProductSchema.safeParse({
      ...validProduct,
      description: "Чашка",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("не менше 20 символів");
    }
  });

  it("fails when price is zero or negative", () => {
    const result = vendorProductSchema.safeParse({
      ...validProduct,
      priceUah: 0,
    });
    expect(result.success).toBe(false);
  });

  it("fails on invalid category", () => {
    const result = vendorProductSchema.safeParse({
      ...validProduct,
      categorySlug: "invalid-category",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("категорію каталогу");
    }
  });

  it("fails when community rules are not accepted", () => {
    const result = vendorProductSchema.safeParse({
      ...validProduct,
      acceptedRules: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("стандартам спільноти");
    }
  });

  it("provides available vendor categories with Ukrainian labels", () => {
    expect(vendorCategoryOptions.length).toBeGreaterThan(0);
    const dim = vendorCategoryOptions.find((c) => c.value === "dim");
    expect(dim?.label).toContain("Дім і затишок");
  });
});
