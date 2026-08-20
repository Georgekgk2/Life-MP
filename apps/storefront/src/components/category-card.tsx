import type { StorefrontCatalogCategory } from "@life/types";
import Link from "next/link";

type CategoryCardProps = Readonly<{
  category: StorefrontCatalogCategory;
}>;

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <article className="card category-card">
      <div
        className="card__visual category-card__visual"
        style={{
          position: "relative",
          overflow: "hidden",
          height: "180px",
          backgroundColor: "var(--color-sand-200)",
        }}
      >
        <img
          src={`/images/categories/category-${category.slug}.webp`}
          alt={category.name}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        <span className="card__visual-label">{category.name}</span>
      </div>
      <div className="card__content">
        <p className="card__eyebrow">Категорія</p>
        <h3 className="card__title">
          <Link className="card__title-link" href={`/catalog/${category.slug}`}>
            {category.name}
          </Link>
        </h3>
        <p className="card__description">{category.description}</p>
      </div>
    </article>
  );
}
