"use client";

import { useMemo, useState } from "react";
import type {
  StorefrontCatalogCategory,
  StorefrontCatalogProduct,
} from "@life/types";
import { ProductCard } from "./product-card";
import { EmptyState } from "./empty-state";
import {
  expandWithSynonyms,
  matchesWithTypoTolerance,
  tokenizeUkrainian,
} from "../search/ukrainian-morphology";

type CatalogBrowserProps = Readonly<{
  categories: readonly StorefrontCatalogCategory[];
  products: readonly StorefrontCatalogProduct[];
  initialCategorySlug?: string;
}>;

type SortOption = "default" | "price-asc" | "price-desc" | "name-asc";

export function CatalogBrowser({
  categories,
  products,
  initialCategorySlug,
}: CatalogBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategorySlug || "all",
  );
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [filterOrganic, setFilterOrganic] = useState(false);
  const [filterCertified, setFilterCertified] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("default");

  // Unique list of providers from products
  const providers = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      if (p.provider?.handle && p.provider?.name) {
        map.set(p.provider.handle, p.provider.name);
      }
    }
    return Array.from(map.entries()).map(([handle, name]) => ({
      handle,
      name,
    }));
  }, [products]);

  // Filtered and sorted products with Ukrainian Morphology & Synonyms
  const filteredProducts = useMemo(() => {
    const rawTokens = tokenizeUkrainian(searchQuery);
    const searchTokens = expandWithSynonyms(rawTokens);

    return products
      .filter((p) => {
        // Category filter
        if (selectedCategory !== "all" && p.categorySlug !== selectedCategory) {
          return false;
        }

        // Provider filter
        if (
          selectedProvider !== "all" &&
          p.provider?.handle !== selectedProvider
        ) {
          return false;
        }

        // Badges filters
        if (filterOrganic && !p.organicProductBadge) return false;
        if (filterCertified && !p.certifiedProductBadge) return false;
        if (filterVerified && !p.verifiedVendorBadge) return false;

        // Search tokens filter with typo tolerance
        if (searchTokens.length > 0) {
          const targetText = `${p.name} ${p.description} ${p.provider?.name || ""}`;
          const targetTokens = tokenizeUkrainian(targetText);

          const matches = searchTokens.some((st) =>
            targetTokens.some((tt) => matchesWithTypoTolerance(st, tt)),
          );

          if (!matches) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
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
  }, [
    products,
    selectedCategory,
    selectedProvider,
    filterOrganic,
    filterCertified,
    filterVerified,
    searchQuery,
    sortBy,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== (initialCategorySlug || "all") ||
    selectedProvider !== "all" ||
    filterOrganic ||
    filterCertified ||
    filterVerified ||
    sortBy !== "default";

  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategory(initialCategorySlug || "all");
    setSelectedProvider("all");
    setFilterOrganic(false);
    setFilterCertified(false);
    setFilterVerified(false);
    setSortBy("default");
  };

  return (
    <div className="catalog-browser">
      {/* Controls Box */}
      <div className="catalog-controls">
        {/* Search Bar */}
        <div className="catalog-search-wrapper">
          <label htmlFor="catalog-search" className="catalog-control-label">
            Пошук у каталозі
          </label>
          <div className="catalog-search-input-box">
            <span aria-hidden="true" className="catalog-search-icon">
              🔍
            </span>
            <input
              id="catalog-search"
              type="text"
              className="catalog-search-input"
              placeholder="Пошук за назвою, ремеслом чи описом (наприклад, чашка, льон, кераміка)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Пошук у каталозі"
            />
            {searchQuery && (
              <button
                type="button"
                className="catalog-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Очистити пошуковий запит"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filters Grid */}
        <div className="catalog-filters-grid">
          {/* Category Filter */}
          <div className="catalog-filter-group">
            <span className="catalog-filter-title">Категорія:</span>
            <div
              className="catalog-pills"
              role="radiogroup"
              aria-label="Фільтр за категорією"
            >
              <button
                type="button"
                className={`catalog-pill ${selectedCategory === "all" ? "catalog-pill--active" : ""}`}
                onClick={() => setSelectedCategory("all")}
                aria-checked={selectedCategory === "all"}
                role="radio"
              >
                Усі напрями ({products.length})
              </button>
              {categories.map((c) => {
                const count = products.filter(
                  (p) => p.categorySlug === c.slug,
                ).length;
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={`catalog-pill ${selectedCategory === c.slug ? "catalog-pill--active" : ""}`}
                    onClick={() => setSelectedCategory(c.slug)}
                    aria-checked={selectedCategory === c.slug}
                    role="radio"
                  >
                    {c.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider Filter */}
          {providers.length > 1 && (
            <div className="catalog-filter-group">
              <span className="catalog-filter-title">Майстерня:</span>
              <select
                className="catalog-select"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                aria-label="Фільтр за майстернею"
              >
                <option value="all">Усі майстерні</option>
                {providers.map((pr) => (
                  <option key={pr.handle} value={pr.handle}>
                    {pr.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Feature Toggles & Sorting */}
          <div className="catalog-feature-row">
            <div className="catalog-feature-toggles">
              <span className="catalog-filter-title">Ознаки:</span>
              <button
                type="button"
                className={`catalog-toggle-btn ${filterOrganic ? "catalog-toggle-btn--active" : ""}`}
                onClick={() => setFilterOrganic(!filterOrganic)}
                aria-pressed={filterOrganic}
              >
                🌿 Органічні
              </button>
              <button
                type="button"
                className={`catalog-toggle-btn ${filterCertified ? "catalog-toggle-btn--active" : ""}`}
                onClick={() => setFilterCertified(!filterCertified)}
                aria-pressed={filterCertified}
              >
                ★ Сертифіковані
              </button>
              <button
                type="button"
                className={`catalog-toggle-btn ${filterVerified ? "catalog-toggle-btn--active" : ""}`}
                onClick={() => setFilterVerified(!filterVerified)}
                aria-pressed={filterVerified}
              >
                ✓ Перевірений майстер
              </button>
            </div>

            <div className="catalog-sort-group">
              <label htmlFor="catalog-sort" className="catalog-filter-title">
                Сортування:
              </label>
              <select
                id="catalog-sort"
                className="catalog-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Сортування товарів"
              >
                <option value="default">За замовчуванням</option>
                <option value="name-asc">За назвою (А-Я)</option>
                <option value="price-asc">Спочатку дешевші</option>
                <option value="price-desc">Спочатку дорожчі</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Counter & Reset Button */}
        <div className="catalog-results-bar">
          <p className="catalog-results-count">
            Знайдено <strong>{filteredProducts.length}</strong>{" "}
            {filteredProducts.length === 1
              ? "виріб"
              : filteredProducts.length >= 2 && filteredProducts.length <= 4
                ? "вироби"
                : "виробів"}{" "}
            з {products.length}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="catalog-reset-btn"
              onClick={handleReset}
            >
              Скинути фільтри
            </button>
          )}
        </div>
      </div>

      {/* Grid or Empty State */}
      {filteredProducts.length > 0 ? (
        <div className="content-grid content-grid--cards">
          {filteredProducts.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="За вашим запитом нічого не знайдено"
          description="Спробуйте змінити пошуковий запит або скинути активні фільтри категорій чи ознак."
        />
      )}
    </div>
  );
}
