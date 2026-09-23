import type { Story } from "@life/types";
import Link from "next/link";
import { CardImage } from "./card-image";

type StoryCardProps = Readonly<{
  story: Story;
}>;

export function StoryCard({ story }: StoryCardProps) {
  return (
    <article className="card story-card">
      <Link
        href={`/stories/${story.slug}`}
        className="card__visual story-card__visual card__visual-link"
        tabIndex={-1}
        aria-hidden="true"
      >
        <CardImage
          src={story.imageSrc}
          fallbackSrc="/images/stories/story-politsia.webp"
          alt=""
        />
      </Link>
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
