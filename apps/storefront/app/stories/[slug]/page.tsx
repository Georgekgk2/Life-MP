import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  EmptyState,
  PersonCard,
  ProductCard,
  SectionHeading,
} from "@/components";
import { people, stories } from "@/fixtures";
import { getCatalogProductsBySlugs } from "@/catalog/server";

type StoryPageProps = Readonly<{
  params: Promise<{
    slug: string;
  }>;
}>;

export function generateStaticParams() {
  return stories.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({
  params,
}: StoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = stories.find((entry) => entry.slug === slug);

  if (!story) {
    notFound();
  }

  return {
    title: story.title,
    description: story.summary,
  };
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { slug } = await params;
  const story = stories.find((entry) => entry.slug === slug);

  if (!story) {
    notFound();
  }

  const relatedPerson = people.find(
    (person) => person.slug === story.personSlug,
  );

  const catalogResult = await getCatalogProductsBySlugs(
    story.relatedProductSlugs,
  );

  const isCatalogReady = catalogResult.kind === "ready";
  const relatedProducts = isCatalogReady ? catalogResult.snapshot.products : [];

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
                <Link href="/stories" style={{ color: "var(--color-primary)" }}>
                  Історії
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li
                aria-current="page"
                style={{ color: "var(--color-ink-muted)" }}
              >
                {story.title}
              </li>
            </ol>
          </nav>

          <div className="page-intro">
            <p className="page-intro__eyebrow">Історія спільноти</p>
            <h1>{story.title}</h1>
            <p className="page-intro__lead">{story.summary}</p>
          </div>

          <aside
            className="notice"
            aria-label="Статус історії"
            style={{ marginTop: "2rem" }}
          >
            <h2 className="notice__title">Матеріал для ознайомлення</h2>
            <p>
              Історія показана як локальний демонстраційний матеріал спільноти
              Life-MP. Реакції, коментарі, реєстрація та комерційний збір даних
              перебувають на етапі погодження.
            </p>
          </aside>
        </div>
      </article>

      {/* Linked Products Section */}
      <section
        className="page-section"
        aria-label="Вироби майстра з цієї історії"
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Крафтові вироби"
            title="Вироби майстра з цієї історії"
            description="Автентичні вироби та матеріали, створені в контексті цієї історії. Додавайте до збережених (❤️) або переходьте до каталогу."
          />
          {!isCatalogReady ? (
            <aside className="notice notice--warning">
              <p>Каталог тимчасово недоступний.</p>
            </aside>
          ) : relatedProducts.length > 0 ? (
            <div className="content-grid content-grid--cards">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Пов’язаних матеріалів поки немає"
              description="Перегляньте всі тематичні добірки у каталозі."
              href="/catalog"
              linkLabel="До каталогу"
            />
          )}
        </div>
      </section>

      {/* Linked Person Section */}
      <section
        className="page-section--tint"
        aria-label="Людина, пов’язана з історією"
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Герой історії"
            title="Познайомтеся з майстром"
            description="Історія розповідає про шлях, натхнення та цінності учасника спільноти."
          />
          {relatedPerson ? (
            <div className="content-grid content-grid--cards">
              <PersonCard person={relatedPerson} />
            </div>
          ) : (
            <EmptyState
              title="Пов’язаний профіль не знайдено"
              description="Перегляньте інших людей спільноти."
              href="/people"
              linkLabel="До людей"
            />
          )}
        </div>
      </section>
    </>
  );
}
