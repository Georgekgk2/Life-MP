import type { Metadata } from "next";

import { SectionHeading } from "@/components";
import { partners } from "@/fixtures";

export const metadata: Metadata = {
  title: "Партнери Life-MP",
  description:
    "Інформаційна добірка партнерів Life-MP у локальному демонстраційному прототипі.",
};

export default function PartnersPage() {
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
            {partners.map((partner) => (
              <article className="card" key={partner.id}>
                <p className="card__eyebrow">Партнер</p>
                <h2>{partner.name}</h2>
                <p>{partner.summary}</p>
                <dl className="data-list">
                  <div className="data-list__item">
                    <dt className="data-list__label">Формат згадки</dt>
                    <dd className="data-list__value">{partner.websiteLabel}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
