import Link from "next/link";
import type { StorefrontCatalogProduct } from "@life/types";
import { SaveButton } from "./save-button";
import { AddToCartButton } from "./add-to-cart-button";
import { formatHryvnia } from "@/formatters";

type ProductCardProps = Readonly<{
  product: StorefrontCatalogProduct;
}>;

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="card product-card">
      <div
        className="card__visual product-card__visual"
        style={{
          position: "relative",
          overflow: "hidden",
          height: "220px",
          backgroundColor: "var(--color-sand-200)",
        }}
      >
        <img
          src={`/images/products/${product.slug}.webp`}
          alt={product.name}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        <span className="card__visual-label">{product.name}</span>
      </div>
      <div className="card__content">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "0.5rem",
          }}
        >
          <p className="card__eyebrow">
            {product.provider?.name
              ? `Майстер: ${product.provider.name}`
              : "Виріб спільноти"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <AddToCartButton product={product} size="sm" />
            <SaveButton product={product} size="sm" />
          </div>
        </div>
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
            {formatHryvnia(product.priceUah)}
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
