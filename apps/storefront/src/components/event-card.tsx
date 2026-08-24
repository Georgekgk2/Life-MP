import Link from "next/link";
import type { Event } from "@life/types";
import { CardImage } from "./card-image";

type EventCardProps = Readonly<{
  event: Event;
}>;

export function EventCard({ event }: EventCardProps) {
  return (
    <article className="card event-card">
      <div className="card__visual event-card__visual">
        <CardImage
          src={event.imageSrc}
          alt={`Ілюстрація події «${event.title}»`}
        />
      </div>
      <div className="card__content">
        <p className="card__eyebrow">
          {event.typeLabel ? `Подія · ${event.typeLabel}` : "Подія спільноти"}
        </p>
        <h3 className="card__title">
          <Link href={`/events/${event.slug}`} className="card__title-link">
            {event.title}
          </Link>
        </h3>
        <p className="card__description">{event.summary}</p>
        <div className="card__meta">
          <time>
            {event.dateLabel}
            {event.timeLabel ? `, ${event.timeLabel}` : ""}
          </time>
          <span>{event.location}</span>
        </div>
        <Link
          href={`/events/${event.slug}`}
          className="button button--secondary button--sm card__action"
        >
          Детальніше про подію
        </Link>
      </div>
    </article>
  );
}
