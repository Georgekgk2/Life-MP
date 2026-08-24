import type { Person } from "@life/types";
import Link from "next/link";
import { CardImage } from "./card-image";

type PersonCardProps = Readonly<{
  person: Person;
}>;

export function PersonCard({ person }: PersonCardProps) {
  return (
    <article className="card person-card">
      <div className="card__visual person-card__visual">
        <CardImage
          src={person.imageSrc}
          alt={`Портрет учасника спільноти: ${person.name}`}
        />
      </div>
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
