import Link from "next/link";
import type { StorefrontCatalogProduct } from "@life/types";

const hryvniaFormatter = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
});

type ProductCardProps = Readonly<{
  product: StorefrontCatalogProduct;
}>;

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="card product-card">
      <div aria-hidden="true" className="card__visual product-card__visual">
        <span className="card__visual-label">{product.name}</span>
      </div>
      <div className="card__content">
        <p className="card__eyebrow">
          {product.provider?.name
            ? `Майстер: ${product.provider.name}`
            : "Виріб спільноти"}
        </p>
        <h3 className="card__title">
          <Link
            className="card__title-link"
            href={`/catalog/${product.categorySlug}/${product.slug}`}
          >
            {product.name}
          </Link>
        </h3>
        <p className="card__description">{product.description}</p>
        <div className="card__meta">
          <data value={product.priceUah}>
            {hryvniaFormatter.format(product.priceUah)}
          </data>
          <div
            className="badge-group"
            style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}
          >
            <span className="badge badge--demo">
              {product.isSynthetic
                ? "Синтетичні локальні дані"
                : "Лише перегляд у демо"}
            </span>
            {product.verifiedVendorBadge && (
              <span
                className="badge badge--verified"
                style={{ background: "#e6f4ea", color: "#137333" }}
              >
                ✓ {product.verifiedVendorBadge}
              </span>
            )}
            {product.certifiedProductBadge && (
              <span
                className="badge badge--certified"
                style={{ background: "#e8f0fe", color: "#1a73e8" }}
              >
                ★ {product.certifiedProductBadge}
              </span>
            )}
            {product.organicProductBadge && (
              <span
                className="badge badge--organic"
                style={{ background: "#fef7e0", color: "#b06000" }}
              >
                🌿 {product.organicProductBadge}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
