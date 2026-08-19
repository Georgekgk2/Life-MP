import { describe, expect, it } from "vitest";
import type { StorefrontCatalogProduct } from "@life/types";
import {
  expandWithSynonyms,
  levenshteinDistance,
  matchesWithTypoTolerance,
  normalizeUkrainianText,
  tokenizeUkrainian,
} from "../src/search/ukrainian-morphology";
import { PostgresFtsSearchProvider } from "../src/search/postgres-fts-provider";
import { MeilisearchProvider } from "../src/search/meilisearch-provider";

describe("Ukrainian Morphology & Search Utilities", () => {
  it("normalizes and tokenizes Ukrainian text removing punctuation and stop-words", () => {
    const text = "Чарівна чашка з натуральної карпатської глини для чаю!";
    expect(normalizeUkrainianText("«Чарівна»")).toBe("чарівна");
    const tokens = tokenizeUkrainian(text);

    expect(tokens).toContain("чарівна");
    expect(tokens).toContain("чашка");
    expect(tokens).toContain("натуральної");
    expect(tokens).toContain("глини");
    expect(tokens).not.toContain("з");
    expect(tokens).not.toContain("для");
  });

  it("expands query tokens with Ukrainian domain synonyms", () => {
    const tokens = ["кераміка"];
    const expanded = expandWithSynonyms(tokens);

    expect(expanded).toContain("кераміка");
    expect(expanded).toContain("посуд");
    expect(expanded).toContain("гончарство");
    expect(expanded).toContain("глина");
    expect(expanded).toContain("чашка");
  });

  it("calculates Levenshtein distance accurately", () => {
    expect(levenshteinDistance("чашка", "чашка")).toBe(0);
    expect(levenshteinDistance("чашка", "чяшка")).toBe(1);
    expect(levenshteinDistance("олівці", "олівци")).toBe(1);
    expect(levenshteinDistance("кераміка", "кераміка")).toBe(0);
  });

  it("matches tokens with typo tolerance", () => {
    expect(matchesWithTypoTolerance("чяшка", "чашка")).toBe(true);
    expect(matchesWithTypoTolerance("олівци", "олівці")).toBe(true);
    expect(matchesWithTypoTolerance("глина", "глиняний")).toBe(true);
    expect(matchesWithTypoTolerance("стіл", "корабель")).toBe(false);
  });
});

describe("PostgresFtsSearchProvider & Meilisearch Fallback", () => {
  const sampleProducts: readonly StorefrontCatalogProduct[] = [
    {
      id: "prod_1",
      slug: "chashka-ranok",
      categorySlug: "dim",
      name: "Чашка «Ранок»",
      description: "Авторська керамічна чашка з карпатської глини.",
      priceUah: 320,
      isSynthetic: true,
      provider: {
        handle: "olena",
        name: "Майстерня Олени",
      },
    },
    {
      id: "prod_2",
      slug: "shoper-razom",
      categorySlug: "odiah",
      name: "Шопер «Разом»",
      description: "Екологічна сумка з домотканого льону.",
      priceUah: 390,
      provider: {
        handle: "berehynia",
        name: "Ткацтво Берегиня",
      },
      isSynthetic: true,
      organicProductBadge: "100% льон",
    },
  ];

  it("finds products with exact keywords", async () => {
    const provider = new PostgresFtsSearchProvider(sampleProducts);
    const result = await provider.searchProducts("чашка");

    expect(result.items.length).toBe(1);
    expect(result.items[0]?.name).toBe("Чашка «Ранок»");
    expect(result.providerName).toBe("postgres_fts");
  });

  it("finds products using Ukrainian synonyms (searching 'кераміка' finds 'Чашка')", async () => {
    const provider = new PostgresFtsSearchProvider(sampleProducts);
    const result = await provider.searchProducts("кераміка");

    expect(result.items.length).toBe(1);
    expect(result.items[0]?.name).toBe("Чашка «Ранок»");
  });

  it("finds products with typo tolerance ('чяшка' finds 'Чашка')", async () => {
    const provider = new PostgresFtsSearchProvider(sampleProducts);
    const result = await provider.searchProducts("чяшка");

    expect(result.items.length).toBe(1);
    expect(result.items[0]?.name).toBe("Чашка «Ранок»");
  });

  it("generates unified search suggestions across products, workshops, and events", async () => {
    const provider = new PostgresFtsSearchProvider(sampleProducts);
    const unified = await provider.searchUnified("Олена");

    expect(unified.suggestions.length).toBeGreaterThan(0);
    const hasWorkshop = unified.suggestions.some((s) => s.type === "workshop");
    expect(hasWorkshop).toBe(true);
  });

  it("MeilisearchProvider seamlessly falls back to Postgres FTS in test mode", async () => {
    const meili = new MeilisearchProvider(
      "http://127.0.0.1:9999",
      "",
      sampleProducts,
    );
    const result = await meili.searchProducts("шопер");

    expect(result.items.length).toBe(1);
    expect(result.items[0]?.name).toBe("Шопер «Разом»");
  });
});
