import type { StorefrontCatalogSnapshot } from "@life/types";
import {
  categories as fixtureCategories,
  products as fixtureProducts,
  people as fixturePeople,
} from "@/fixtures";

export type CatalogReadResult =
  | Readonly<{ kind: "ready"; snapshot: StorefrontCatalogSnapshot }>
  | Readonly<{
      kind: "unavailable";
      source: "medusa";
      reason: "missing_configuration" | "upstream_error" | "invalid_response";
    }>;

export async function getCatalogSnapshot(): Promise<CatalogReadResult> {
  const configuredSource = process.env["CATALOG_SOURCE"];
  const source = configuredSource || "fixtures";
  // Next standalone builds inline NODE_ENV as production. Keep the build in
  // production mode while allowing the E2E server to declare its app runtime
  // explicitly as test without opening the real production catalog path.
  const nodeEnvironment = process.env["NODE_ENV"];
  const runtimeEnvironment = process.env["LIFE_RUNTIME_ENV"] || nodeEnvironment;
  const isTestRuntime = runtimeEnvironment === "test";
  const isPublicDemoRuntime =
    nodeEnvironment === "production" && runtimeEnvironment === "public-demo";
  const isDevelopmentRuntime =
    runtimeEnvironment === "development" && nodeEnvironment !== "production";
  const isProduction =
    nodeEnvironment === "production" && !isTestRuntime && !isPublicDemoRuntime;
  const isLocalOrTest = isDevelopmentRuntime || isTestRuntime;
  const allowSyntheticCatalog =
    process.env["ALLOW_SYNTHETIC_CATALOG"] === "true";
  const allowPublicDemoCatalog =
    process.env["ALLOW_PUBLIC_DEMO_CATALOG"] === "true";

  // Dedicated non-commercial public-demo showcase mode:
  // Strict non-commercial demonstration mode: only when ALL conditions are met:
  // 1. nodeEnvironment === "production"
  // 2. LIFE_RUNTIME_ENV === "public-demo"
  // 3. configuredSource === "fixtures" (must be explicitly configured, no silent fallback)
  // 4. ALLOW_PUBLIC_DEMO_CATALOG === "true"
  // In this mode, static synthetic fixtures are served with isSynthetic: true and demo-only.
  // Medusa backend is never called; commercial catalog fallback stays unavailable.
  if (isPublicDemoRuntime) {
    if (configuredSource !== "fixtures" || !allowPublicDemoCatalog) {
      return {
        kind: "unavailable",
        source: "medusa",
        reason: "missing_configuration",
      };
    }

    const categories = fixtureCategories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      imageSrc: c.imageSrc,
    }));

    const products = fixtureProducts.map((p) => {
      const person = fixturePeople.find((per) =>
        (per.featuredProductSlugs as readonly string[]).includes(p.slug),
      );
      return {
        id: p.id,
        slug: p.slug,
        categorySlug: p.categorySlug,
        name: p.name,
        description: p.description,
        priceUah: p.priceUah,
        imageSrc: p.imageSrc,
        provider: {
          handle: person?.slug || "spilnota",
          name: person?.name || "Майстерня спільноти",
          region: person?.region || "Україна",
        },
        isSynthetic: true,
      };
    });

    return {
      kind: "ready",
      snapshot: {
        source: "fixtures",
        categories,
        products,
      },
    };
  }

  // Production must never silently serve fixtures or a non-commercial Medusa
  // catalog. Synthetic catalog access is restricted to explicit development/
  // test runs; the production fallback stays unavailable.
  if (
    isProduction ||
    !isLocalOrTest ||
    (source === "medusa" && !allowSyntheticCatalog)
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

    const products = fixtureProducts.map((p) => {
      const person = fixturePeople.find((per) =>
        (per.featuredProductSlugs as readonly string[]).includes(p.slug),
      );
      return {
        id: p.id,
        slug: p.slug,
        categorySlug: p.categorySlug,
        name: p.name,
        description: p.description,
        priceUah: p.priceUah,
        imageSrc: p.imageSrc,
        provider: {
          handle: person?.slug || "spilnota",
          name: person?.name || "Майстерня спільноти",
          region: person?.region || "Україна",
        },
        isSynthetic: true,
      };
    });

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
