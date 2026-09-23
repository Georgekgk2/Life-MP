import type { Metadata } from "next";
import Link from "next/link";

import { SectionHeading } from "@/components";
import { partners } from "@/fixtures";
import { getCatalogSnapshot } from "@/catalog/server";

export const metadata: Metadata = {
  title: "Організації та центри допомоги — Life-MP",
  description:
    "Ветеранські простори, центри реабілітації, майстерні та організації підтримки в демонстраційному прототипі Life-MP.",
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
            <p className="page-intro__eyebrow">Організації допомоги</p>
            <h1>Організації та центри підтримки</h1>
            <p className="page-intro__lead">
              Ветеранські простори, центри фізичної та психологічної реабілітації,
              майстерні відновлення та правовий супровід.
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
            eyebrow="Спільноти та центри"
            title="Організації, які допомагають"
            description="Простори взаємодопомоги, адаптації та реабілітації для ветеранів і спільноти."
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
                      <p className="card__eyebrow">{partner.categoryLabel || "Організація допомоги"}</p>
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        {partner.videoDuration && (
                          <span className="badge badge--demo" style={{ fontSize: "0.75rem" }}>
                            ▶ {partner.videoDuration}
                          </span>
                        )}
                        <span className="badge badge--demo">
                          {partner.websiteLabel}
                        </span>
                      </div>
                    </div>
                    <h2 className="card__title">{partner.name}</h2>
                    <p className="card__description">{partner.summary}</p>
                    {partner.videoTitle && (
                      <p style={{ fontSize: "0.8125rem", color: "var(--color-primary-strong)", margin: "0.25rem 0", fontWeight: 500 }}>
                        📹 Відео: {partner.videoTitle}
                      </p>
                    )}
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
      <div className="page-shell" style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--color-ink-muted)",
            lineHeight: 1.5,
            textAlign: "center",
            borderTop: "1px solid var(--color-border-subtle)",
            paddingTop: "1rem",
          }}
        >
          Інформаційне застереження: відомості про реабілітаційні, психологічні та оздоровчі центри мають виключно ознайомчий характер у демонстраційному прототипі та не є медичною або психологічною консультацією.
        </p>
      </div>
    </>
  );
}
