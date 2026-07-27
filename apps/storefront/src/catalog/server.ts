import type { StorefrontCatalogSnapshot } from "@life/types";
import {
  categories as fixtureCategories,
  products as fixtureProducts,
} from "@/fixtures";

export type CatalogReadResult =
  | Readonly<{ kind: "ready"; snapshot: StorefrontCatalogSnapshot }>
  | Readonly<{
      kind: "unavailable";
      source: "medusa";
      reason: "missing_configuration" | "upstream_error" | "invalid_response";
    }>;

export async function getCatalogSnapshot(): Promise<CatalogReadResult> {
  const source = process.env["CATALOG_SOURCE"] || "fixtures";

  if (source === "fixtures") {
    const categories = fixtureCategories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
    }));

    const products = fixtureProducts.map((p) => ({
      id: p.id,
      slug: p.slug,
      categorySlug: p.categorySlug,
      name: p.name,
      description: p.description,
      priceUah: p.priceUah,
      provider: {
        handle: "demo-provider",
        name: "Локальний майстер",
      },
      isSynthetic: true,
    }));

    return {
      kind: "ready",
      snapshot: {
        source: "fixtures",
        categories,
        products,
      },
    };
  }

  if (source === "medusa") {
    const backendUrl = process.env["MEDUSA_BACKEND_URL"];
    if (!backendUrl) {
      return {
        kind: "unavailable",
        source: "medusa",
        reason: "missing_configuration",
      };
    }

    try {
      const response = await fetch(`${backendUrl}/store/catalog`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return {
          kind: "unavailable",
          source: "medusa",
          reason: "upstream_error",
        };
      }

      const data = (await response.json()) as StorefrontCatalogSnapshot;
      if (
        !data ||
        data.source !== "medusa" ||
        !Array.isArray(data.categories) ||
        !Array.isArray(data.products)
      ) {
        return {
          kind: "unavailable",
          source: "medusa",
          reason: "invalid_response",
        };
      }

      return {
        kind: "ready",
        snapshot: data,
      };
    } catch {
      return {
        kind: "unavailable",
        source: "medusa",
        reason: "upstream_error",
      };
    }
  }

  return {
    kind: "unavailable",
    source: "medusa",
    reason: "missing_configuration",
  };
}

export async function getCatalogProductsBySlugs(
  slugs: readonly string[],
): Promise<CatalogReadResult> {
  const result = await getCatalogSnapshot();
  if (result.kind === "unavailable") {
    return result;
  }

  const filteredProducts = result.snapshot.products.filter((p) =>
    slugs.includes(p.slug),
  );

  return {
    kind: "ready",
    snapshot: {
      ...result.snapshot,
      products: filteredProducts,
    },
  };
}
