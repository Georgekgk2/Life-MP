import type { SearchProvider, StorefrontCatalogProduct } from "@life/types";
import { PostgresFtsSearchProvider } from "./postgres-fts-provider";
import { MeilisearchProvider } from "./meilisearch-provider";

export { PostgresFtsSearchProvider } from "./postgres-fts-provider";
export { MeilisearchProvider } from "./meilisearch-provider";
export * from "./ukrainian-morphology";

let globalSearchProvider: SearchProvider | null = null;

export function getSearchProvider(
  initialProducts?: readonly StorefrontCatalogProduct[],
): SearchProvider {
  const providerType = process.env["SEARCH_PROVIDER"] || "postgres_fts";

  if (globalSearchProvider) {
    if (initialProducts && "setProducts" in globalSearchProvider) {
      (
        globalSearchProvider as {
          setProducts: (p: readonly StorefrontCatalogProduct[]) => void;
        }
      ).setProducts(initialProducts);
    }
    return globalSearchProvider;
  }

  if (providerType === "meilisearch") {
    globalSearchProvider = new MeilisearchProvider(
      process.env["MEILISEARCH_HOST"],
      process.env["MEILISEARCH_API_KEY"],
      initialProducts,
    );
  } else {
    // Default ADR 0005 Search Provider
    globalSearchProvider = new PostgresFtsSearchProvider(initialProducts);
  }

  return globalSearchProvider;
}
