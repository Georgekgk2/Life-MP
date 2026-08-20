import type { Person } from "@life/types";
import Link from "next/link";

type PersonCardProps = Readonly<{
  person: Person;
}>;

export function PersonCard({ person }: PersonCardProps) {
  return (
    <article className="card person-card">
      <div
        className="card__visual person-card__visual"
        style={{
          position: "relative",
          overflow: "hidden",
          height: "220px",
          backgroundColor: "var(--color-sand-200)",
        }}
      >
        <img
          src={`/images/people/person-${person.slug}.webp`}
          alt={person.name}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        <span className="card__visual-label">{person.name}</span>
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
