import type { Metadata } from "next";
import Link from "next/link";

import {
  CategoryCard,
  EventCard,
  PersonCard,
  ProductCard,
  SectionHeading,
  StoryCard,
} from "@/components";
import {
  categories,
  charityProjects,
  events,
  partners,
  people,
  products,
  stories,
} from "@/fixtures";

export const metadata: Metadata = {
  title: "Life-MP — люди, історії та спільнота",
  description:
    "Демонстраційна добірка людей, історій, подій і тематичних матеріалів Life-MP.",
};

export default function HomePage() {
  return (
    <>
      <section className="page-section page-section--spacious">
        <div className="page-shell">
          <div className="page-intro">
            <p className="page-intro__eyebrow">Life-MP</p>
            <h1>Місце, де історії людей поєднуються зі спільнотою</h1>
            <p className="page-intro__lead">
              Досліджуйте тематичні добірки, знайомтеся з людьми та дізнавайтеся
              про ініціативи, що створюють підтримку поруч.
            </p>
            <p>
              <Link href="/catalog">Переглянути тематичні добірки</Link>
            </p>
          </div>

          <aside className="notice" aria-label="Статус прототипу">
            <h2 className="notice__title">Це демонстраційний прототип</h2>
            <p>
              Life-MP показує лише структуру інформації. Тут немає кошика,
              оформлення замовлень, оплат, доставки, збору персональних даних чи
              партнерського відстеження.
            </p>
          </aside>
        </div>
      </section>

      <section className="page-section--tint" aria-label="Тематичні добірки">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Напрями"
            title="Почніть із того, що вам відгукується"
            description="Кожна добірка об’єднує матеріали та пов’язані історії."
            actionHref="/catalog"
            actionLabel="Усі добірки"
          />
          <div className="content-grid content-grid--cards">
            {categories.map((category) => (
              <CategoryCard category={category} key={category.id} />
            ))}
          </div>
        </div>
      </section>

      <section className="page-section" aria-label="Люди спільноти">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Люди"
            title="Ті, хто додає сенсу"
            description="Познайомтеся з учасниками та учасницями, чиї досвіди формують цю добірку."
            actionHref="/people"
            actionLabel="Усі люди"
          />
          <div className="content-grid content-grid--cards">
            {people.slice(0, 3).map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      </section>

      <section className="page-section--tint" aria-label="Тематичні матеріали">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Добірка"
            title="Матеріали для знайомства з напрямами"
            description="Це інформаційні позиції у демонстраційному каталозі, а не пропозиції для купівлі."
            actionHref="/catalog"
            actionLabel="Відкрити каталог"
          />
          <div className="content-grid content-grid--cards">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="page-section" aria-label="Найближчі події">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Події"
            title="Зустрічі та спільні моменти"
            description="Календар у прототипі має інформаційний характер і не містить реєстрації."
            actionHref="/events"
            actionLabel="Усі події"
          />
          <div className="content-grid content-grid--wide-cards">
            {events.slice(0, 3).map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        </div>
      </section>

      <section className="page-section--tint" aria-label="Історії спільноти">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Історії"
            title="Досвіди, якими хочеться ділитися"
            description="Читайте короткі історії про людей і те, що їх надихає."
            actionHref="/stories"
            actionLabel="Усі історії"
          />
          <div className="content-grid content-grid--wide-cards">
            {stories.slice(0, 3).map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>
      </section>

      <section className="page-section" aria-label="Ініціативи та партнери">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Підтримка"
            title="Ініціативи та коло партнерів"
            description="Знайомимо з напрямами співпраці без пожертв, заявок чи зовнішніх переходів."
          />
          <div className="content-grid content-grid--wide-cards">
            {charityProjects.slice(0, 2).map((project) => (
              <article className="card" key={project.id}>
                <p className="card__eyebrow">Ініціатива</p>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
                <Link href="/charity">Детальніше про ініціативи</Link>
              </article>
            ))}
            {partners.slice(0, 2).map((partner) => (
              <article className="card" key={partner.id}>
                <p className="card__eyebrow">Партнер</p>
                <h3>{partner.name}</h3>
                <p>{partner.summary}</p>
                <Link href="/partners">Познайомитися з партнерами</Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
