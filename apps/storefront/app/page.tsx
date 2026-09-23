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
import { charityProjects, events, partners, people, stories } from "@/fixtures";
import { getCatalogSnapshot } from "@/catalog/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Life-MP — демонстраційна вітрина спільноти",
  description:
    "Демонстраційна вітрина Life-MP: знайомтеся з майстрами, виробами та історіями локальної спільноти.",
};

export default async function HomePage() {
  const catalogResult = await getCatalogSnapshot();

  const isCatalogReady = catalogResult.kind === "ready";
  const categories = isCatalogReady ? catalogResult.snapshot.categories : [];
  const products = isCatalogReady ? catalogResult.snapshot.products : [];

  return (
    <>
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="page-shell hero-section__layout">
          <div className="hero-section__copy page-intro">
            <p className="page-intro__eyebrow">Life-MP · локальне поруч</p>
            <h1 id="hero-title">
              Речі з історією. Люди, яких хочеться підтримати.
            </h1>
            <p className="page-intro__lead">
              Знаходьте українські вироби, знайомтеся з майстрами та долучайтеся
              до спільноти, що створює тепло навколо.
            </p>
            <div className="hero-section__actions">
              <Link
                href="/catalog"
                className="button button--primary button--lg"
              >
                Переглянути вироби
              </Link>
              <Link
                href="/people"
                className="button button--secondary button--lg"
              >
                Познайомитися з майстрами
              </Link>
            </div>
          </div>
          <div className="hero-section__media">
            <img
              src="/images/hero/hero-marketplace.webp"
              alt="Українські крафтові вироби на дерев’яному столі в горах"
              width="1584"
              height="672"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      <section
        className="page-section page-section--notice"
        aria-label="Статус вітрини"
      >
        <div className="page-shell">
          <aside className="notice prototype-disclosure" role="status">
            <div>
              <p className="notice__eyebrow">Статус вітрини</p>
              <h2 className="notice__title">Демонстраційний режим</h2>
              <p>
                У цій версії використано синтетичні дані для перевірки структури
                та інтерфейсу. Каталог, кошик і оформлення працюють у sandbox-
                режимі; оплату, доставку, виплати майстрам і збір персональних
                даних не виконують.
              </p>
            </div>
            <Link
              className="button button--secondary button--sm"
              href="/catalog"
            >
              Переглянути вітрину
            </Link>
          </aside>
        </div>
      </section>

      <section
        className="page-section page-section--muted"
        aria-label="Тематичні добірки"
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Напрями"
            title="Почніть саме з того, в чому маєте потребу"
            description="Добірки, які допомагають швидко знайти своє."
            actionHref="/catalog"
            actionLabel="Усі категорії"
          />
          {!isCatalogReady ? (
            <aside className="notice notice--warning" role="status">
              <p>Каталог тимчасово недоступний.</p>
            </aside>
          ) : (
            <div className="content-grid content-grid--cards category-grid">
              {categories.map((category) => (
                <CategoryCard category={category} key={category.id} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="page-section" aria-label="Популярні вироби">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Вітрина"
            title="Речі, якими варто володіти"
            description="Вибрані крафтові вироби, натуральні смаколики та продукція від майстрів."
            actionHref="/catalog"
            actionLabel="Відкрити каталог"
          />
          {!isCatalogReady ? (
            <aside className="notice notice--warning" role="status">
              <p>Вітрина тимчасово недоступна.</p>
            </aside>
          ) : (
            <div className="content-grid content-grid--cards product-grid">
              {products.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section
        className="page-section page-section--muted"
        aria-label="Люди спільноти"
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Майстри"
            title="Ті, хто додає сенсу"
            description="Познайомтеся з людьми, чиї руки та досвіди формують цю спільноту."
            actionHref="/people"
            actionLabel="Усі майстри"
          />
          <div className="content-grid content-grid--wide-cards people-grid">
            {people.slice(0, 3).map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      </section>

      <section className="page-section" aria-label="Найближчі події">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Події"
            title="Зустрічі та спільні моменти"
            description="Календар зустрічей, майстерень і розмов для спільноти."
            actionHref="/events"
            actionLabel="Усі події"
          />
          <div className="content-grid content-grid--wide-cards event-grid">
            {events.slice(0, 3).map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        </div>
      </section>

      <section
        className="page-section page-section--muted"
        aria-label="Історії спільноти"
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Історії"
            title="Досвіди, якими хочеться ділитися"
            description="Читайте короткі історії про людей і те, що їх надихає."
            actionHref="/stories"
            actionLabel="Усі історії"
          />
          <div className="content-grid content-grid--wide-cards story-grid">
            {stories.slice(0, 3).map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>
      </section>

      <section
        className="page-section page-section--accent"
        aria-label="Ініціативи та партнери"
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Організації та центри допомоги"
            title="Люди та спільноти, які допомагають"
            description="Простори ветеранської адаптації, центри реабілітації, майстерні та організації взаємопідтримки."
            actionHref="/partners"
            actionLabel="Усі організації"
          />
          <div className="content-grid content-grid--wide-cards partner-grid">
            {charityProjects.slice(0, 2).map((project) => (
              <article className="card partner-card" key={project.id}>
                <div className="card__content">
                  <p className="card__eyebrow">Ініціатива</p>
                  <h3 className="card__title">{project.title}</h3>
                  <p className="card__description">{project.summary}</p>
                  <Link href="/charity" className="text-link">
                    Детальніше про ініціативи
                  </Link>
                </div>
              </article>
            ))}
            {partners.slice(0, 2).map((partner) => (
              <article className="card partner-card" key={partner.id}>
                <div className="card__content">
                  <div className="partner-card__topline">
                    <p className="card__eyebrow">
                      {partner.categoryLabel || "Організація допомоги"}
                    </p>
                    {partner.videoDuration && (
                      <span
                        className="badge badge--demo"
                        style={{ fontSize: "0.75rem" }}
                      >
                        ▶ Відео · {partner.videoDuration}
                      </span>
                    )}
                  </div>
                  <h3 className="card__title">{partner.name}</h3>
                  <p className="card__description">{partner.summary}</p>
                  {partner.videoTitle && (
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--color-primary-quiet)",
                        margin: "0.25rem 0",
                      }}
                    >
                      📹 {partner.videoTitle}
                    </p>
                  )}
                  <Link href="/partners" className="text-link">
                    Познайомитися з організаціями
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <p
            style={{
              marginTop: "2rem",
              fontSize: "0.8125rem",
              color: "#c9e2d0",
              opacity: 0.95,
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            Інформаційне застереження: відомості про реабілітаційні,
            психологічні та оздоровчі центри мають виключно ознайомчий характер
            у демонстраційному прототипі та не є медичною консультацією.
          </p>
        </div>
      </section>
    </>
  );
}
