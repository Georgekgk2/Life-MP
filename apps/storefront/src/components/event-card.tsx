import Link from "next/link";
import type { Event } from "@life/types";

type EventCardProps = Readonly<{
  event: Event;
}>;

export function EventCard({ event }: EventCardProps) {
  return (
    <article className="card event-card">
      <div
        className="card__visual event-card__visual"
        style={{
          position: "relative",
          overflow: "hidden",
          height: "200px",
          backgroundColor: "var(--color-sand-200)",
        }}
      >
        <img
          src={`/images/events/event-${event.slug}.webp`}
          alt={event.title}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        <span className="card__visual-label">{event.title}</span>
      </div>
      <div className="card__content">
        <p className="card__eyebrow">
          {event.typeLabel ? `Подія • ${event.typeLabel}` : "Подія спільноти"}
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
        <div
          style={{
            marginTop: "1rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <Link
            href={`/events/${event.slug}`}
            className="button button--secondary button--sm"
            style={{ width: "100%", textAlign: "center" }}
          >
            Детальніше про подію
          </Link>
        </div>
      </div>
    </article>
  );
}
