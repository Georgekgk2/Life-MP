import type { Story } from "@life/types";
import Link from "next/link";

type StoryCardProps = Readonly<{
  story: Story;
}>;

export function StoryCard({ story }: StoryCardProps) {
  return (
    <article className="card story-card">
      <div aria-hidden="true" className="card__visual story-card__visual">
        <span className="card__visual-label">{story.title}</span>
      </div>
      <div className="card__content">
        <p className="card__eyebrow">Історія спільноти</p>
        <h3 className="card__title">
          <Link className="card__title-link" href={`/stories/${story.slug}`}>
            {story.title}
          </Link>
        </h3>
        <p className="card__description">{story.summary}</p>
        <div className="card__meta">
          <span>Пов’язані вироби: {story.relatedProductSlugs.length}</span>
        </div>
      </div>
    </article>
  );
}
