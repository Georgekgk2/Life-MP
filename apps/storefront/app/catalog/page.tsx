import type { Metadata } from "next";

import { CategoryCard, ProductCard, SectionHeading } from "@/components";
import { categories, products } from "@/fixtures";

export const metadata: Metadata = {
  title: "Тематичні добірки",
  description:
    "Інформаційний каталог тематичних матеріалів Life-MP у демонстраційному прототипі.",
};

export default function CatalogPage() {
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

      <section className="page-section--tint" aria-label="Категорії каталогу">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Напрями"
            title="Оберіть добірку"
            description="Кожен напрям відкривається окремою статичною сторінкою."
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
            description="Скористайтеся категоріями вище, щоб статично звузити перелік за напрямом."
          />
          <div className="content-grid content-grid--cards">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
