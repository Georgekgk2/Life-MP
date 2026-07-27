import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState, ProductCard, SectionHeading } from "@/components";
import { getCatalogSnapshot } from "@/catalog/server";
import { categories as fixtureCategories } from "@/fixtures";

export const dynamic = "force-dynamic";

type CategoryPageProps = Readonly<{
  params: Promise<{
    category: string;
  }>;
}>;

export function generateStaticParams() {
  const source = process.env["CATALOG_SOURCE"] || "fixtures";
  if (source === "fixtures") {
    return fixtureCategories.map((category) => ({ category: category.slug }));
  }
  return [];
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const catalogResult = await getCatalogSnapshot();

  if (catalogResult.kind === "unavailable") {
    return {
      title: "Каталог тимчасово недоступний",
    };
  }

  const category = catalogResult.snapshot.categories.find(
    ({ slug }) => slug === categorySlug,
  );

  if (!category) {
    notFound();
  }

  return {
    title: `${category.name} — тематична добірка`,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const catalogResult = await getCatalogSnapshot();

  if (catalogResult.kind === "unavailable") {
    return (
      <section className="page-section page-section--spacious">
        <div className="page-shell">
          <aside className="notice notice--warning">
            <h2 className="notice__title">Каталог тимчасово недоступний</h2>
            <p>
              Не вдалося завантажити актуальні дані каталогу з сервісу Medusa.
              Будь ласка, перевірте з'єднання або спробуйте пізніше.
            </p>
          </aside>
        </div>
      </section>
    );
  }

  const category = catalogResult.snapshot.categories.find(
    ({ slug }) => slug === categorySlug,
  );

  if (!category) {
    notFound();
  }

  const categoryProducts = catalogResult.snapshot.products.filter(
    (product) => product.categorySlug === category.slug,
  );

  return (
    <>
      <section className="page-section page-section--spacious">
        <div className="page-shell">
          <div className="page-intro">
            <p className="page-intro__eyebrow">Тематична добірка</p>
            <h1>{category.name}</h1>
            <p className="page-intro__lead">{category.description}</p>
            <p>
              <Link href="/catalog">Повернутися до всіх добірок</Link>
            </p>
          </div>
          <aside className="notice" aria-label="Статус матеріалів">
            <h2 className="notice__title">Матеріали тільки для огляду</h2>
            <p>
              Це відфільтрований перелік у демонстраційному прототипі. Жодної
              покупки, резервування чи оформлення тут немає.
            </p>
          </aside>
        </div>
      </section>

      <section
        className="page-section--tint"
        aria-label={`Матеріали: ${category.name}`}
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Матеріали"
            title={`Усі матеріали напряму «${category.name}»`}
            description="Перелік сформовано за обраною категорією."
          />
          {categoryProducts.length > 0 ? (
            <div className="content-grid content-grid--cards">
              {categoryProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="У цій добірці поки немає матеріалів"
              description="Оберіть інший напрям, щоб продовжити знайомство з прототипом."
              href="/catalog"
              linkLabel="До всіх добірок"
            />
          )}
        </div>
      </section>
    </>
  );
}
