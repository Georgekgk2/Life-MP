import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  EventCard,
  PersonCard,
  ProductCard,
  SectionHeading,
} from "@/components";
import { events, people } from "@/fixtures";
import { getCatalogProductsBySlugs } from "@/catalog/server";

type EventPageProps = Readonly<{
  params: Promise<{
    slug: string;
  }>;
}>;

export function generateStaticParams() {
  return events.map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = events.find((entry) => entry.slug === slug);

  if (!event) {
    notFound();
  }

  return {
    title: event.title,
    description: event.summary,
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = events.find((entry) => entry.slug === slug);

  if (!event) {
    notFound();
  }

  const hostPerson = people.find((person) => person.slug === event.personSlug);

  const catalogResult = await getCatalogProductsBySlugs(
    event.relatedProductSlugs ?? [],
  );

  const isCatalogReady = catalogResult.kind === "ready";
  const relatedProducts = isCatalogReady ? catalogResult.snapshot.products : [];

  const otherEvents = events.filter((e) => e.slug !== event.slug).slice(0, 2);

  return (
    <>
      <article className="page-section page-section--spacious">
        <div className="page-shell">
          {/* Breadcrumbs */}
          <nav
            className="breadcrumbs"
            aria-label="Хлібні крихти"
            style={{ marginBottom: "1.5rem" }}
          >
            <ol
              style={{
                display: "flex",
                gap: "0.5rem",
                listStyle: "none",
                padding: 0,
                fontSize: "0.875rem",
              }}
            >
              <li>
                <Link href="/" style={{ color: "var(--color-primary)" }}>
                  Головна
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/events" style={{ color: "var(--color-primary)" }}>
                  Події
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li
                aria-current="page"
                style={{ color: "var(--color-ink-muted)" }}
              >
                {event.title}
              </li>
            </ol>
          </nav>

          <div className="page-intro">
            <p className="page-intro__eyebrow">
              {event.typeLabel
                ? `Подія • ${event.typeLabel}`
                : "Подія спільноти"}
            </p>
            <h1>{event.title}</h1>
            <p className="page-intro__lead">{event.summary}</p>
          </div>

          {/* Event Key Info Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
              gap: "1.25rem",
              marginTop: "2rem",
              marginBottom: "2rem",
            }}
          >
            <div className="card" style={{ padding: "1.25rem" }}>
              <p className="card__eyebrow">📅 Дата та час</p>
              <h3
                style={{
                  fontSize: "1.1rem",
                  margin: "0.25rem 0",
                  color: "var(--color-ink)",
                }}
              >
                {event.dateLabel}
              </h3>
              {event.timeLabel && (
                <p
                  style={{
                    color: "var(--color-ink-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  {event.timeLabel}
                </p>
              )}
            </div>

            <div className="card" style={{ padding: "1.25rem" }}>
              <p className="card__eyebrow">📍 Локація</p>
              <h3
                style={{
                  fontSize: "1.1rem",
                  margin: "0.25rem 0",
                  color: "var(--color-ink)",
                }}
              >
                {event.location}
              </h3>
              <p
                style={{ color: "var(--color-ink-muted)", fontSize: "0.9rem" }}
              >
                Формат відкритої зустрічі
              </p>
            </div>

            {hostPerson && (
              <div className="card" style={{ padding: "1.25rem" }}>
                <p className="card__eyebrow">👤 Ведучий майстер</p>
                <h3 style={{ fontSize: "1.1rem", margin: "0.25rem 0" }}>
                  <Link
                    href={`/people/${hostPerson.slug}`}
                    style={{ color: "var(--color-primary-strong)" }}
                  >
                    {hostPerson.name}
                  </Link>
                </h3>
                <p
                  style={{
                    color: "var(--color-ink-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  {hostPerson.role}
                </p>
              </div>
            )}
          </div>

          {/* Event Full Description */}
          {event.description && (
            <div
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "1.75rem",
                marginBottom: "2rem",
                lineHeight: "1.65",
              }}
            >
              <h2
                style={{
                  fontSize: "1.25rem",
                  marginBottom: "0.75rem",
                  color: "var(--color-ink)",
                }}
              >
                Про подію та формат участі
              </h2>
              <p style={{ color: "var(--color-ink-subtle)" }}>
                {event.description}
              </p>
            </div>
          )}

          {/* Agenda Timeline */}
          {event.agenda && event.agenda.length > 0 && (
            <div style={{ marginBottom: "2.5rem" }}>
              <h2
                style={{
                  fontSize: "1.35rem",
                  marginBottom: "1.25rem",
                  color: "var(--color-ink)",
                }}
              >
                Програма зустрічі
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {event.agenda.map((item, index) => (
                  <div
                    key={index}
                    className="card"
                    style={{
                      padding: "1.25rem",
                      display: "flex",
                      gap: "1.25rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        padding: "0.35rem 0.65rem",
                        backgroundColor: "var(--color-primary-quiet)",
                        color: "var(--color-primary-strong)",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                        borderRadius: "var(--radius-sm)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.time}
                    </span>
                    <div>
                      <h3
                        style={{
                          fontSize: "1.05rem",
                          marginBottom: "0.25rem",
                          color: "var(--color-ink)",
                        }}
                      >
                        {item.title}
                      </h3>
                      <p
                        style={{
                          color: "var(--color-ink-subtle)",
                          fontSize: "0.9rem",
                        }}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Notice */}
          <aside className="notice" aria-label="Статус події">
            <h2 className="notice__title">Демонстраційний анонс події</h2>
            <p>
              Подія представлена як локальний демонстраційний анонс спільноти
              Life-MP. Квитки, онлайн-бронювання та платна реєстрація
              перебувають на стадії погодження юридичних і комерційних моделей.
            </p>
          </aside>
        </div>
      </article>

      {/* Linked Products Section */}
      {relatedProducts.length > 0 && (
        <section
          className="page-section"
          aria-label="Матеріали та вироби, з якими знайомимося на події"
        >
          <div className="page-shell">
            <SectionHeading
              eyebrow="Практичні матеріали"
              title="Вироби та ремесло цієї події"
              description="Вироби, матеріали та набори, що використовуються або презентуються під час зустрічі. Можна додати до збережених (❤️)."
            />
            <div className="content-grid content-grid--cards">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Host Person Profile Section */}
      {hostPerson && (
        <section
          className="page-section--tint"
          aria-label="Ведучий майстер події"
        >
          <div className="page-shell">
            <SectionHeading
              eyebrow="Організатор"
              title="Познайомтеся з ведучим"
              description="Майстер або автор, який ділиться досвідом та проводить цю подію."
            />
            <div className="content-grid content-grid--cards">
              <PersonCard person={hostPerson} />
            </div>
          </div>
        </section>
      )}

      {/* Other Events */}
      {otherEvents.length > 0 && (
        <section className="page-section" aria-label="Інші події спільноти">
          <div className="page-shell">
            <SectionHeading
              eyebrow="Календар"
              title="Інші події та зустрічі"
              description="Ознайомтеся з іншими анонсами у календарі спільноти."
              actionHref="/events"
              actionLabel="Усі події"
            />
            <div className="content-grid content-grid--cards">
              {otherEvents.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
