import { describe, expect, it, vi, afterEach } from "vitest";
import * as catalogServer from "../src/catalog/server";
import CategoryPage, {
  generateMetadata as generateCategoryMetadata,
} from "../app/catalog/[category]/page";
import ProductDetailPage, {
  generateMetadata as generateProductMetadata,
} from "../app/catalog/[category]/[slug]/page";

describe("Catalog Pages Error State (HTTP 5xx / Error Boundary)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("CategoryPage throws CATALOG_UNAVAILABLE when catalog service is unavailable", async () => {
    vi.spyOn(catalogServer, "getCatalogSnapshot").mockResolvedValue({
      kind: "unavailable",
      source: "medusa",
      reason: "upstream_error",
    });

    await expect(
      CategoryPage({ params: Promise.resolve({ category: "odiah" }) }),
    ).rejects.toThrow("CATALOG_UNAVAILABLE");

    await expect(
      generateCategoryMetadata({
        params: Promise.resolve({ category: "odiah" }),
      }),
    ).rejects.toThrow("CATALOG_UNAVAILABLE");
  });

  it("ProductDetailPage throws CATALOG_UNAVAILABLE when catalog service is unavailable", async () => {
    vi.spyOn(catalogServer, "getCatalogSnapshot").mockResolvedValue({
      kind: "unavailable",
      source: "medusa",
      reason: "upstream_error",
    });

    await expect(
      ProductDetailPage({
        params: Promise.resolve({
          category: "odiah",
          slug: "futbolka-svitlo",
        }),
      }),
    ).rejects.toThrow("CATALOG_UNAVAILABLE");

    await expect(
      generateProductMetadata({
        params: Promise.resolve({
          category: "odiah",
          slug: "futbolka-svitlo",
        }),
      }),
    ).rejects.toThrow("CATALOG_UNAVAILABLE");
  });
});
