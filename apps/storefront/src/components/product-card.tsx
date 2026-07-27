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
        <h3 className="card__title">{product.name}</h3>
        <p className="card__description">{product.description}</p>
        <div className="card__meta">
          <data value={product.priceUah}>
            {hryvniaFormatter.format(product.priceUah)}
          </data>
          <span className="badge badge--demo">
            {product.isSynthetic
              ? "Синтетичні локальні дані"
              : "Лише перегляд у демо"}
          </span>
        </div>
      </div>
    </article>
  );
}
