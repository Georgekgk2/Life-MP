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
  const isProduction = process.env["NODE_ENV"] === "production";
  const isLocalOrTest =
    process.env["NODE_ENV"] === "development" ||
    process.env["NODE_ENV"] === "test";
  const isExplicitE2e = process.env["LIFE_E2E"] === "true";
  const allowSyntheticCatalog =
    process.env["ALLOW_SYNTHETIC_CATALOG"] === "true";

  // Production must never silently serve fixtures or a non-commercial Medusa
  // catalog. LIFE_E2E is set only by the local Playwright web server so the
  // suite can exercise a deterministic production-style server without
  // weakening the default production guard.
  if (
    (isProduction && !isExplicitE2e) ||
    (source === "medusa" &&
      (!(isLocalOrTest || isExplicitE2e) || !allowSyntheticCatalog))
  ) {
    return {
      kind: "unavailable",
      source: "medusa",
      reason: "missing_configuration",
    };
  }
  if (source === "fixtures") {
    const categories = fixtureCategories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      imageSrc: c.imageSrc,
    }));

    const products = fixtureProducts.map((p) => ({
      id: p.id,
      slug: p.slug,
      categorySlug: p.categorySlug,
      name: p.name,
      description: p.description,
      priceUah: p.priceUah,
      imageSrc: p.imageSrc,
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
      const publishableKey =
        process.env["MEDUSA_PUBLISHABLE_KEY"] ||
        process.env["NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"];
      const headers: Record<string, string> = {};
      if (publishableKey) {
        headers["x-publishable-api-key"] = publishableKey;
      }

      const response = await fetch(`${backendUrl}/store/catalog`, {
        cache: "no-store",
        headers,
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

export async function getCatalogProductsByProvider(
  providerHandleOrName: string,
): Promise<CatalogReadResult> {
  const result = await getCatalogSnapshot();
  if (result.kind === "unavailable") {
    return result;
  }

  const lowerQuery = providerHandleOrName.toLowerCase();
  const filteredProducts = result.snapshot.products.filter(
    (p) =>
      p.provider?.handle.toLowerCase() === lowerQuery ||
      p.provider?.name.toLowerCase().includes(lowerQuery),
  );

  return {
    kind: "ready",
    snapshot: {
      ...result.snapshot,
      products: filteredProducts,
    },
  };
}
