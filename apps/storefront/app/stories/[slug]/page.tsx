import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  EmptyState,
  PersonCard,
  ProductCard,
  SectionHeading,
} from "@/components";
import { people, products, stories } from "@/fixtures";

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
    title: `${story.title} — історії Life-MP`,
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
  const relatedProducts = products.filter((product) =>
    story.relatedProductSlugs.some(
      (productSlug) => productSlug === product.slug,
    ),
  );

  return (
    <>
      <article className="page-section page-section--spacious">
        <div className="page-shell">
          <div className="page-intro">
            <p className="page-intro__eyebrow">Історія спільноти</p>
            <h1>{story.title}</h1>
            <p className="page-intro__lead">{story.summary}</p>
            <p>
              <Link href="/stories">Повернутися до всіх історій</Link>
            </p>
          </div>
          <aside className="notice" aria-label="Статус історії">
            <h2 className="notice__title">Матеріал для ознайомлення</h2>
            <p>
              Історія показана як локальний демонстраційний матеріал. Реакції,
              коментарі, облікові записи та збір даних не підтримуються.
            </p>
          </aside>
        </div>
      </article>

      <section
        className="page-section--tint"
        aria-label="Людина, пов’язана з історією"
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Людина"
            title="Познайомтеся ближче"
            description="Історія пов’язана з профілем учасника або учасниці спільноти."
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

      <section
        className="page-section"
        aria-label="Матеріали, пов’язані з історією"
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Матеріали"
            title="Пов’язані тематичні позиції"
            description="Позиції наведено для контексту історії та недоступні для купівлі."
          />
          {relatedProducts.length > 0 ? (
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
    </>
  );
}
