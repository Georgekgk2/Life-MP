import type { Person } from "@life/types";
import Link from "next/link";
import { CardImage } from "./card-image";

type PersonCardProps = Readonly<{
  person: Person;
}>;

export function PersonCard({ person }: PersonCardProps) {
  return (
    <article className="card person-card">
      <Link
        href={`/people/${person.slug}`}
        className="card__visual person-card__visual card__visual-link"
        tabIndex={-1}
        aria-hidden="true"
      >
        <CardImage
          src={person.imageSrc}
          fallbackSrc="/images/people/person-olena.webp"
          alt=""
        />
      </Link>
      <div className="card__content">
        <p className="card__eyebrow">{person.role}</p>
        <h3 className="card__title">
          <Link className="card__title-link" href={`/people/${person.slug}`}>
            {person.name}
          </Link>
        </h3>
        <p className="card__description">{person.description}</p>
        <div className="card__meta">
          <span>Виробів у добірці: {person.featuredProductSlugs.length}</span>
        </div>
      </div>
    </article>
  );
}
