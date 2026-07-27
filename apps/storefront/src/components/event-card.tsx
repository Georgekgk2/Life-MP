import type { Event } from "@life/types";

type EventCardProps = Readonly<{
  event: Event;
}>;

export function EventCard({ event }: EventCardProps) {
  return (
    <article className="card event-card">
      <div aria-hidden="true" className="card__visual event-card__visual">
        <span className="card__visual-label">{event.title}</span>
      </div>
      <div className="card__content">
        <p className="card__eyebrow">Подія</p>
        <h3 className="card__title">{event.title}</h3>
        <p className="card__description">{event.summary}</p>
        <div className="card__meta">
          <time>{event.dateLabel}</time>
          <span>{event.location}</span>
        </div>
      </div>
    </article>
  );
}
