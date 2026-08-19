import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  EmptyState,
  EventCard,
  ProductCard,
  SectionHeading,
  StoryCard,
} from "@/components";
import { events, people, stories } from "@/fixtures";
import { getCatalogSnapshot } from "@/catalog/server";

type PersonPageProps = Readonly<{
  params: Promise<{
    slug: string;
  }>;
}>;

export function generateStaticParams() {
  return people.map((person) => ({ slug: person.slug }));
}

export async function generateMetadata({
  params,
}: PersonPageProps): Promise<Metadata> {
  const { slug } = await params;
  const person = people.find((entry) => entry.slug === slug);

  if (!person) {
    notFound();
  }

  return {
    title: `${person.name} — людина спільноти`,
    description: person.description,
  };
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { slug } = await params;
  const person = people.find((entry) => entry.slug === slug);

  if (!person) {
    notFound();
  }

  const catalogResult = await getCatalogSnapshot();
  const isCatalogReady = catalogResult.kind === "ready";
  const featuredProducts = isCatalogReady
    ? catalogResult.snapshot.products.filter(
        (p) =>
          (person.featuredProductSlugs as readonly string[]).includes(p.slug) ||
          (p.provider?.name &&
            (p.provider.name
              .toLowerCase()
              .includes(person.name.toLowerCase()) ||
              person.role
                .toLowerCase()
                .includes(p.provider.name.toLowerCase()) ||
              p.provider.handle.includes(person.slug))),
      )
    : [];
  const personStories = stories.filter(
    (story) => story.personSlug === person.slug,
  );
  const personEvents = events.filter(
    (event) => event.personSlug === person.slug,
  );

  return (
    <>
      <article className="page-section page-section--spacious">
        <div className="page-shell">
          <div className="page-intro">
            <p className="page-intro__eyebrow">Людина спільноти</p>
            <h1>{person.name}</h1>
            <p className="page-intro__lead">{person.description}</p>
            <dl className="data-list">
              <div className="data-list__item">
                <dt className="data-list__label">Роль у добірці</dt>
                <dd className="data-list__value">{person.role}</dd>
              </div>
            </dl>
          </div>
          <aside className="notice" aria-label="Статус профілю">
            <h2 className="notice__title">Інформаційний профіль</h2>
            <p>
              Цей профіль показує лише локально пов’язані матеріали. Зв’язок з
              людиною, реєстрація та будь-який збір даних недоступні.
            </p>
          </aside>
        </div>
      </article>

      <section
        className="page-section--tint"
        aria-label={`Історії: ${person.name}`}
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Історії"
            title={`Історії, пов’язані з ${person.name}`}
            description="Короткі матеріали, що розкривають контекст добірки."
          />
          {personStories.length > 0 ? (
            <div className="content-grid content-grid--wide-cards">
              {personStories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Пов’язаних історій поки немає"
              description="Перегляньте інші історії спільноти."
              href="/stories"
              linkLabel="До всіх історій"
            />
          )}
        </div>
      </section>

      <section
        className="page-section"
        aria-label={`Матеріали: ${person.name}`}
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Матеріали"
            title="Пов’язані тематичні матеріали"
            description="Інформаційні позиції наведено без можливості купівлі чи резервування."
          />
          {!isCatalogReady ? (
            <aside className="notice notice--warning">
              <p>Каталог тимчасово недоступний.</p>
            </aside>
          ) : featuredProducts.length > 0 ? (
            <div className="content-grid content-grid--cards">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Пов’язаних матеріалів поки немає"
              description="Перегляньте тематичні добірки, щоб дізнатися більше."
              href="/catalog"
              linkLabel="До тематичних добірок"
            />
          )}
        </div>
      </section>

      <section
        className="page-section--tint"
        aria-label={`Події: ${person.name}`}
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Події"
            title="Події за участі людини"
            description="Події показані як інформаційні записи без реєстрації."
          />
          {personEvents.length > 0 ? (
            <div className="content-grid content-grid--wide-cards">
              {personEvents.map((event) => (
                <EventCard event={event} key={event.id} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Пов’язаних подій поки немає"
              description="Ознайомтеся з іншими подіями у календарі прототипу."
              href="/events"
              linkLabel="До подій"
            />
          )}
        </div>
      </section>
    </>
  );
}
