import type { Metadata } from "next";

import { CategoryCard, ProductCard, SectionHeading } from "@/components";
import { getCatalogSnapshot } from "@/catalog/server";

export const metadata: Metadata = {
  title: "Тематичні добірки",
  description:
    "Інформаційний каталог тематичних матеріалів Life-MP у демонстраційному прототипі.",
};

export default async function CatalogPage() {
  const catalogResult = await getCatalogSnapshot();

  const isCatalogReady = catalogResult.kind === "ready";
  const categories = isCatalogReady ? catalogResult.snapshot.categories : [];
  const products = isCatalogReady ? catalogResult.snapshot.products : [];

  return (
    <>
      <section className="page-section page-section--spacious">
        <div className="page-shell">
          <div className="page-intro">
            <p className="page-intro__eyebrow">Каталог</p>
            <h1>Тематичні добірки</h1>
            <p className="page-intro__lead">
              Оберіть напрям, щоб переглянути пов’язані інформаційні матеріали.
            </p>
          </div>
          <aside className="notice" aria-label="Статус каталогу">
            <h2 className="notice__title">Каталог лише для перегляду</h2>
            <p>
              Ціни та доступність подано як частину локальної демонстраційної
              структури. Пошуку, кошика, замовлень і оплат у прототипі немає.
            </p>
          </aside>
        </div>
      </section>

      {!isCatalogReady ? (
        <section
          className="page-section--tint"
          aria-label="Статус доступу до каталогу"
        >
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
      ) : (
        <>
          <section
            className="page-section--tint"
            aria-label="Категорії каталогу"
          >
            <div className="page-shell">
              <SectionHeading
                eyebrow="Напрями"
                title="Оберіть добірку"
                description="Кожен напрям відкривається окремою сторінкою."
              />
              <div className="content-grid content-grid--cards">
                {categories.map((category) => (
                  <CategoryCard category={category} key={category.id} />
                ))}
              </div>
            </div>
          </section>

          <section className="page-section" aria-label="Усі матеріали каталогу">
            <div className="page-shell">
              <SectionHeading
                eyebrow="Усі матеріали"
                title="Добірка для огляду"
                description="Скористайтеся категоріями вище, щоб звузити перелік за напрямом."
              />
              <div className="content-grid content-grid--cards">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
