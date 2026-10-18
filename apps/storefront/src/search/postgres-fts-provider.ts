import type {
  ProductSearchResult,
  SearchProvider,
  SearchQueryOptions,
  StorefrontCatalogProduct,
  UnifiedSearchResult,
  UnifiedSearchSuggestion,
} from "@life/types";
import { events, people } from "../fixtures";
import {
  expandWithSynonyms,
  matchesWithTypoTolerance,
  tokenizeUkrainian,
} from "./ukrainian-morphology";

export class PostgresFtsSearchProvider implements SearchProvider {
  public readonly name = "postgres_fts" as const;

  private products: readonly StorefrontCatalogProduct[] = [];

  constructor(initialProducts?: readonly StorefrontCatalogProduct[]) {
    if (initialProducts) {
      this.products = initialProducts;
    }
  }

  public setProducts(products: readonly StorefrontCatalogProduct[]): void {
    this.products = products;
  }

  public async searchProducts(
    query: string,
    options?: SearchQueryOptions,
  ): Promise<ProductSearchResult> {
    const startTime = Date.now();
    const rawTokens = tokenizeUkrainian(query);
    const searchTokens = expandWithSynonyms(rawTokens);

    let filtered = this.products.filter((product) => {
      // Category filter
      if (options?.categorySlug && options.categorySlug !== "all") {
        if (product.categorySlug !== options.categorySlug) {
          return false;
        }
      }

      // Attributes filters
      if (options?.isOrganic && !product.organicProductBadge) {
        return false;
      }
      if (options?.isCertified && !product.certifiedProductBadge) {
        return false;
      }
      if (options?.isVerifiedVendor && !product.verifiedVendorBadge) {
        return false;
      }

      // Price range filters
      if (
        options?.minPriceUah !== undefined &&
        product.priceUah < options.minPriceUah
      ) {
        return false;
      }
      if (
        options?.maxPriceUah !== undefined &&
        product.priceUah > options.maxPriceUah
      ) {
        return false;
      }

      // If empty query, match all that passed filters
      if (searchTokens.length === 0) {
        return true;
      }

      // Search matching: name, description, provider name
      const targetText = `${product.name} ${product.description} ${product.provider?.name || ""}`;
      const targetTokens = tokenizeUkrainian(targetText);

      return searchTokens.some((sToken) =>
        targetTokens.some((tToken) => matchesWithTypoTolerance(sToken, tToken)),
      );
    });

    // Sorting
    if (options?.sortBy) {
      filtered = [...filtered].sort((a, b) => {
        switch (options.sortBy) {
          case "price-asc":
            return a.priceUah - b.priceUah;
          case "price-desc":
            return b.priceUah - a.priceUah;
          case "name-asc":
            return a.name.localeCompare(b.name, "uk");
          default:
            return 0;
        }
      });
    }

    const totalCount = filtered.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    const paged = filtered.slice(offset, offset + limit);

    return {
      items: paged,
      totalCount,
      queryTimeMs: Date.now() - startTime,
      providerName: "postgres_fts",
    };
  }

  public async searchUnified(
    query: string,
    limit: number = 8,
  ): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    const rawTokens = tokenizeUkrainian(query);
    const searchTokens = expandWithSynonyms(rawTokens);

    const suggestions: UnifiedSearchSuggestion[] = [];

    if (searchTokens.length > 0) {
      // 1. Search Products
      for (const p of this.products) {
        const pTokens = tokenizeUkrainian(
          `${p.name} ${p.description} ${p.provider?.name || ""}`,
        );
        const matches = searchTokens.some((st) =>
          pTokens.some((tt) => matchesWithTypoTolerance(st, tt)),
        );
        if (matches) {
          suggestions.push({
            id: `prod_${p.id}`,
            type: "product",
            title: p.name,
            subtitle: p.provider?.name
              ? `Майстер: ${p.provider.name}`
              : `Категорія: ${p.categorySlug}`,
            url: `/catalog/${p.categorySlug}/${p.slug}`,
          });
        }
      }

      // 2. Search Workshops/People
      for (const person of people) {
        const personTokens = tokenizeUkrainian(
          `${person.name} ${person.role} ${person.description}`,
        );
        const matches = searchTokens.some((st) =>
          personTokens.some((tt) => matchesWithTypoTolerance(st, tt)),
        );
        if (matches) {
          suggestions.push({
            id: `person_${person.id}`,
            type: "workshop",
            title: person.name,
            subtitle: person.role,
            url: `/people/${person.slug}`,
          });
        }
      }

      // 3. Search Events
      for (const event of events) {
        const eventTokens = tokenizeUkrainian(
          `${event.title} ${event.summary} ${event.location} ${event.typeLabel || ""}`,
        );
        const matches = searchTokens.some((st) =>
          eventTokens.some((tt) => matchesWithTypoTolerance(st, tt)),
        );
        if (matches) {
          suggestions.push({
            id: `event_${event.id}`,
            type: "event",
            title: event.title,
            subtitle: `Подія • ${event.dateLabel}`,
            url: `/events/${event.slug}`,
          });
        }
      }
    }

    const pResult = await this.searchProducts(query, { limit });

    return {
      query,
      suggestions: suggestions.slice(0, limit),
      products: pResult.items,
      totalCount: suggestions.length,
      queryTimeMs: Date.now() - startTime,
      providerName: "postgres_fts",
    };
  }

  public async indexProducts(
    products: readonly StorefrontCatalogProduct[],
  ): Promise<void> {
    this.products = products;
  }
}
