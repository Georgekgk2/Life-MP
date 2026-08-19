import type {
  ProductSearchResult,
  SearchProvider,
  SearchQueryOptions,
  StorefrontCatalogProduct,
  UnifiedSearchResult,
} from "@life/types";
import { PostgresFtsSearchProvider } from "./postgres-fts-provider";
import { ukrainianSynonyms } from "./ukrainian-morphology";

export class MeilisearchProvider implements SearchProvider {
  public readonly name = "meilisearch" as const;

  private readonly host: string;
  private readonly apiKey: string;
  private readonly fallbackProvider: PostgresFtsSearchProvider;

  constructor(
    host: string = process.env["MEILISEARCH_HOST"] || "http://127.0.0.1:7700",
    apiKey: string = process.env["MEILISEARCH_API_KEY"] || "",
    initialProducts?: readonly StorefrontCatalogProduct[],
  ) {
    this.host = host.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.fallbackProvider = new PostgresFtsSearchProvider(initialProducts);
  }

  public setProducts(products: readonly StorefrontCatalogProduct[]): void {
    this.fallbackProvider.setProducts(products);
  }

  public async searchProducts(
    query: string,
    options?: SearchQueryOptions,
  ): Promise<ProductSearchResult> {
    const startTime = Date.now();

    try {
      const filterConditions: string[] = [];

      if (options?.categorySlug && options.categorySlug !== "all") {
        filterConditions.push(`categorySlug = "${options.categorySlug}"`);
      }
      if (options?.isOrganic) {
        filterConditions.push("isOrganic = true");
      }
      if (options?.isCertified) {
        filterConditions.push("isCertified = true");
      }
      if (options?.minPriceUah) {
        filterConditions.push(`priceUah >= ${options.minPriceUah}`);
      }
      if (options?.maxPriceUah) {
        filterConditions.push(`priceUah <= ${options.maxPriceUah}`);
      }

      const sortRules: string[] = [];
      if (options?.sortBy === "price-asc") {
        sortRules.push("priceUah:asc");
      } else if (options?.sortBy === "price-desc") {
        sortRules.push("priceUah:desc");
      } else if (options?.sortBy === "name-asc") {
        sortRules.push("name:asc");
      }

      const res = await fetch(`${this.host}/indexes/products/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          q: query,
          filter:
            filterConditions.length > 0
              ? filterConditions.join(" AND ")
              : undefined,
          sort: sortRules.length > 0 ? sortRules : undefined,
          limit: options?.limit ?? 100,
          offset: options?.offset ?? 0,
        }),
        signal: AbortSignal.timeout(500),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          items: data.hits as StorefrontCatalogProduct[],
          totalCount: data.estimatedTotalHits ?? data.hits.length,
          queryTimeMs: Date.now() - startTime,
          providerName: "meilisearch",
        };
      }

      // If Meilisearch returns non-200, fallback
      return await this.fallbackProvider.searchProducts(query, options);
    } catch {
      // Graceful fallback to Postgres FTS in offline / test environments
      return await this.fallbackProvider.searchProducts(query, options);
    }
  }

  public async searchUnified(
    query: string,
    limit: number = 8,
  ): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    try {
      const pResult = await this.searchProducts(query, { limit });
      const fallbackUnified = await this.fallbackProvider.searchUnified(
        query,
        limit,
      );

      return {
        query,
        suggestions: fallbackUnified.suggestions,
        products: pResult.items,
        totalCount: fallbackUnified.totalCount,
        queryTimeMs: Date.now() - startTime,
        providerName: "meilisearch",
      };
    } catch {
      return await this.fallbackProvider.searchUnified(query, limit);
    }
  }

  public async configureSettings(): Promise<void> {
    try {
      await fetch(`${this.host}/indexes/products/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          searchableAttributes: [
            "name",
            "description",
            "providerName",
            "categoryName",
          ],
          filterableAttributes: [
            "categorySlug",
            "isOrganic",
            "isCertified",
            "priceUah",
          ],
          sortableAttributes: ["priceUah", "name"],
          synonyms: ukrainianSynonyms,
          typoTolerance: {
            minWordSizeForTypos: {
              oneTypo: 5,
              twoTypos: 9,
            },
          },
        }),
        signal: AbortSignal.timeout(1000),
      });
    } catch {
      // Ignore if offline
    }
  }

  public async indexProducts(
    products: readonly StorefrontCatalogProduct[],
  ): Promise<void> {
    this.fallbackProvider.setProducts(products);

    try {
      await fetch(`${this.host}/indexes/products/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(products),
        signal: AbortSignal.timeout(1000),
      });
    } catch {
      // Graceful fallback
    }
  }
}
