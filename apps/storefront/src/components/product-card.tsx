import Link from "next/link";
import type { StorefrontCatalogProduct } from "@life/types";
import { SaveButton } from "./save-button";
import { AddToCartButton } from "./add-to-cart-button";
import { CardImage } from "./card-image";
import { formatHryvnia } from "@/formatters";

type ProductCardProps = Readonly<{
  product: StorefrontCatalogProduct;
}>;

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="card product-card">
      <div className="card__visual product-card__visual">
        <CardImage
          src={product.imageSrc}
          alt={`Фото виробу «${product.name}»`}
        />
      </div>
      <div className="card__content product-card__content">
        <div className="product-card__topline">
          <p className="card__eyebrow">
            {product.provider?.name
              ? `Майстер: ${product.provider.name}`
              : "Виріб спільноти"}
          </p>
          <div className="product-card__actions">
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
        <div className="card__meta product-card__meta">
          <data value={product.priceUah}>
            {formatHryvnia(product.priceUah)}
          </data>
          <div className="badge-group">
            {product.verifiedVendorBadge && (
              <span className="badge badge--verified">
                {product.verifiedVendorBadge}
              </span>
            )}
            {product.organicProductBadge && (
              <span className="badge badge--organic">
                {product.organicProductBadge}
              </span>
            )}
            <span className="badge badge--demo">
              {product.isSynthetic
                ? "Синтетичні локальні дані"
                : "Лише перегляд у демо"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
