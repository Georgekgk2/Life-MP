import type { Category } from "@life/types";
import Link from "next/link";

type CategoryCardProps = Readonly<{
  category: Category;
}>;

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <article className="card category-card">
      <div aria-hidden="true" className="card__visual category-card__visual">
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
