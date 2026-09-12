import type { Metadata } from "next";
import Link from "next/link";

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
          <div className="content-grid content-grid--cards partner-grid">
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
                <article className="card partner-card" key={partner.id}>
                  <div className="card__content partner-card__content">
                    <div className="partner-card__topline">
                      <p className="card__eyebrow">Майстерня / Партнер</p>
                      <span className="badge badge--demo">
                        {partner.websiteLabel}
                      </span>
                    </div>
                    <h2 className="card__title">{partner.name}</h2>
                    <p className="card__description">{partner.summary}</p>
                    {partnerProducts.length > 0 && (
                      <div className="partner-card__products">
                        <p className="partner-card__products-title">
                          Вироби в каталозі ({partnerProducts.length}):
                        </p>
                        <ul className="partner-card__products-list">
                          {partnerProducts.slice(0, 3).map((prod) => (
                            <li key={prod.id}>
                              <Link
                                href={`/catalog/${prod.categorySlug}/${prod.slug}`}
                                className="partner-card__product-link"
                              >
                                <span>{prod.name}</span>
                                <span
                                  aria-hidden="true"
                                  className="partner-card__arrow"
                                >
                                  →
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
