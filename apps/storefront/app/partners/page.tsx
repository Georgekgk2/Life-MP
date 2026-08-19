import type { Metadata } from "next";

import { SectionHeading } from "@/components";
import { partners } from "@/fixtures";
import { getCatalogSnapshot } from "@/catalog/server";

export const metadata: Metadata = {
  title: "Партнери Life-MP",
  description:
    "Інформаційна добірка партнерів Life-MP у локальному демонстраційному прототипі.",
};

export default async function PartnersPage() {
  const catalogResult = await getCatalogSnapshot();
  const allProducts =
    catalogResult.kind === "ready" ? catalogResult.snapshot.products : [];
  return (
    <>
      <section className="page-section page-section--spacious">
        <div className="page-shell">
          <div className="page-intro">
            <p className="page-intro__eyebrow">Партнери</p>
            <h1>Коло партнерів</h1>
            <p className="page-intro__lead">
              Тут зібрано інформаційні згадки про організації, з якими
              перетинаються ініціативи та історії Life-MP.
            </p>
          </div>
          <aside className="notice" aria-label="Статус партнерської сторінки">
            <h2 className="notice__title">
              Без зовнішніх переходів і відстеження
            </h2>
            <p>
              Сторінка не містить партнерських посилань, реклами, заявок на
              співпрацю чи інструментів відстеження. Це лише локальна
              демонстрація інформаційної архітектури.
            </p>
          </aside>
        </div>
      </section>

      <section className="page-section--tint" aria-label="Перелік партнерів">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Співпраця"
            title="Згадані партнери"
            description="Формат згадки збережено як текст без зовнішнього посилання."
          />
          <div className="content-grid content-grid--cards">
            {partners.map((partner) => {
              const partnerProducts = allProducts.filter(
                (p) =>
                  p.provider?.name
                    ?.toLowerCase()
                    .includes(partner.name.toLowerCase()) ||
                  partner.name
                    .toLowerCase()
                    .includes(p.provider?.name?.toLowerCase() || "") ||
                  p.provider?.handle.includes(partner.slug),
              );

              return (
                <article className="card" key={partner.id}>
                  <p className="card__eyebrow">Майстерня / Партнер</p>
                  <h2>{partner.name}</h2>
                  <p>{partner.summary}</p>
                  <dl className="data-list" style={{ marginBottom: "1rem" }}>
                    <div className="data-list__item">
                      <dt className="data-list__label">Формат згадки</dt>
                      <dd className="data-list__value">
                        {partner.websiteLabel}
                      </dd>
                    </div>
                  </dl>
                  {partnerProducts.length > 0 && (
                    <div
                      style={{
                        marginTop: "1rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid var(--color-border)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "var(--color-ink)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Вироби в каталозі ({partnerProducts.length}):
                      </p>
                      <ul
                        style={{
                          listStyle: "none",
                          padding: 0,
                          fontSize: "0.875rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                        }}
                      >
                        {partnerProducts.slice(0, 3).map((prod) => (
                          <li key={prod.id}>
                            <a
                              href={`/catalog/${prod.categorySlug}/${prod.slug}`}
                              style={{
                                color: "var(--color-primary)",
                                textDecoration: "underline",
                              }}
                            >
                              {prod.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
