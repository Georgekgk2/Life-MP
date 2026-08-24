import type { StorefrontCatalogCategory } from "@life/types";
import Link from "next/link";
import { CardImage } from "./card-image";

type CategoryCardProps = Readonly<{
  category: StorefrontCatalogCategory;
}>;

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <article className="card category-card">
      <div className="card__visual category-card__visual">
        <CardImage
          src={category.imageSrc}
          alt={`Ілюстрація категорії «${category.name}»`}
        />
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
