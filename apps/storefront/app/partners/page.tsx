import type { Metadata } from "next";
import type { Partner } from "@life/types";

import { SectionHeading } from "@/components";
import { partners } from "@/fixtures";

export const metadata: Metadata = {
  title: "Демо-профілі організацій — Life-MP",
  description:
    "Приклади інтерфейсу каталогу Life-MP; картки не підтверджують реальні організації, партнерства чи надання послуг.",
};
export default function PartnersPage() {
  return (
    <>
      <section className="page-section page-section--spacious">
        <div className="page-shell">
          <div className="page-intro">
            <p className="page-intro__eyebrow">Демонстраційний каталог</p>
            <h1>Демонстраційні профілі</h1>
            <p className="page-intro__lead">
              Картки нижче — демонстраційні приклади, а не підтверджені описи
              реальних організацій.
            </p>
          </div>
          <aside className="notice" aria-label="Статус демонстраційних даних">
            <h2 className="notice__title">Не є переліком партнерів</h2>
            <p>
              Назви й описи не підтверджують партнерство, діяльність чи фактичне
              надання послуг.
            </p>
          </aside>
        </div>
      </section>

      <section
        className="page-section--tint"
        aria-label="Демонстраційні профілі"
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Приклади записів"
            title="Профілі для демонстрації"
            description="Приклади оформлення карток каталогу."
          />
          <div className="content-grid content-grid--cards partner-grid">
            {partners.map((partner: Partner) => (
              <article className="card partner-card" key={partner.id}>
                <div className="card__content partner-card__content">
                  <div className="partner-card__topline">
                    <p className="card__eyebrow">
                      {partner.categoryLabel || "Демонстраційний запис"}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.35rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {partner.videoDuration && (
                        <span
                          className="badge badge--demo"
                          style={{ fontSize: "0.75rem" }}
                        >
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
                    <p
                      className="partner-card__video-title"
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--color-ink)",
                        fontWeight: 600,
                        margin: "0.35rem 0",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <span aria-hidden="true">📹</span>
                      <span>Відео: {partner.videoTitle}</span>
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
