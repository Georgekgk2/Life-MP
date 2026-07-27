import { describe, expect, expectTypeOf, it } from "vitest";

import { defineFoundationPackageMetadata } from "../src/index";
import type {
  Category,
  CharityProject,
  DemoAvailability,
  Event,
  Partner,
  Person,
  Product,
  Story,
} from "../src/index";

describe("defineFoundationPackageMetadata", () => {
  it("preserves a package name in its metadata", () => {
    expect(defineFoundationPackageMetadata("@life/types")).toEqual({
      name: "@life/types",
      state: "foundation",
    });
  });
});

describe("storefront fixture types", () => {
  it("keeps linked identifiers and demo-only availability precise", () => {
    expectTypeOf<DemoAvailability>().toEqualTypeOf<"demo-only">();
    expectTypeOf<Category<"odiah">["slug"]>().toEqualTypeOf<"odiah">();
    expectTypeOf<
      Product<"odiah", "futbolka-svitlo">["categorySlug"]
    >().toEqualTypeOf<"odiah">();
    expectTypeOf<
      Product<"odiah", "futbolka-svitlo">["slug"]
    >().toEqualTypeOf<"futbolka-svitlo">();
    expectTypeOf<Product["priceUah"]>().toEqualTypeOf<number>();
    expectTypeOf<Product["availability"]>().toEqualTypeOf<DemoAvailability>();
    expectTypeOf<
      Person<"futbolka-svitlo", "olena">["featuredProductSlugs"]
    >().toEqualTypeOf<readonly "futbolka-svitlo"[]>();
    expectTypeOf<
      Story<"olena", "futbolka-svitlo">["personSlug"]
    >().toEqualTypeOf<"olena">();
    expectTypeOf<
      Story<"olena", "futbolka-svitlo">["relatedProductSlugs"]
    >().toEqualTypeOf<readonly "futbolka-svitlo"[]>();
    expectTypeOf<Event<"olena">["personSlug"]>().toEqualTypeOf<"olena">();
    expectTypeOf<
      CharityProject<"olena", "partner-svitlo", "futbolka-svitlo">["partnerIds"]
    >().toEqualTypeOf<readonly "partner-svitlo"[]>();
    expectTypeOf<
      CharityProject<
        "olena",
        "partner-svitlo",
        "futbolka-svitlo"
      >["relatedProductSlugs"]
    >().toEqualTypeOf<readonly "futbolka-svitlo"[]>();
    expectTypeOf<Partner<"svitlo">["slug"]>().toEqualTypeOf<"svitlo">();
  });
});
