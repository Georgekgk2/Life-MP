import type { Metadata } from "next";
import Link from "next/link";

import { SectionHeading } from "@/components";
import { charityProjects, partners, people } from "@/fixtures";

export const metadata: Metadata = {
  title: "Ініціативи підтримки",
  description:
    "Інформаційна добірка ініціатив підтримки Life-MP у демонстраційному прототипі.",
};

export default function CharityPage() {
  return (
    <>
      <section className="page-section page-section--spacious">
        <div className="page-shell">
          <div className="page-intro">
            <p className="page-intro__eyebrow">Підтримка</p>
            <h1>Ініціативи, що об’єднують</h1>
            <p className="page-intro__lead">
              Знайомтеся з напрямами підтримки, людьми та партнерськими
              зв’язками в межах інформаційного прототипу Life-MP.
            </p>
          </div>
          <aside className="notice" aria-label="Статус ініціатив">
            <h2 className="notice__title">Без пожертв і заявок</h2>
            <p>
              Ця сторінка не приймає кошти, заявки чи персональні дані. Вона
              лише пояснює структуру демонстраційних ініціатив і пов’язаних
              матеріалів.
            </p>
          </aside>
        </div>
      </section>

      <section className="page-section--tint" aria-label="Ініціативи підтримки">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Демо-ініціативи"
            title="Приклади ініціатив"
            description="Картки, пов’язані профілі та зв’язки в цьому розділі — дані для демонстрації; вони не підтверджують реальну діяльність чи партнерство."
          />
          <div className="charity-grid">
            {charityProjects.map((project) => {
              const beneficiary = people.find(
                (person) => person.slug === project.beneficiaryPersonSlug,
              );
              const projectPartners = partners.filter((partner) =>
                project.partnerIds.some(
                  (partnerId) => partnerId === partner.id,
                ),
              );

              return (
                <article className="card charity-card" key={project.id}>
                  <div className="card__content charity-card__content">
                    <div className="charity-card__header">
                      <div className="charity-card__topline">
                        <span className="badge badge--demo">
                          Демонстраційний запис
                        </span>
                        <span className="badge badge--demo">
                          Лише інформація в демо-прототипі
                        </span>
                      </div>
                      <h2 className="charity-card__title">{project.title}</h2>
                      <p className="charity-card__summary">{project.summary}</p>
                    </div>

                    <div className="charity-card__meta">
                      {beneficiary ? (
                        <div className="charity-card__curator-block">
                          <span className="charity-card__meta-label">
                            Демо-профіль людини
                          </span>
                          <Link
                            href={`/people/${beneficiary.slug}`}
                            className="charity-card__curator-link"
                          >
                            <span
                              className="charity-card__curator-avatar"
                              aria-hidden="true"
                            >
                              {beneficiary.name.slice(0, 1)}
                            </span>
                            <span>
                              <strong>{beneficiary.name}</strong>
                              <span className="charity-card__curator-role">
                                {" "}
                                · {beneficiary.role}
                              </span>
                            </span>
                          </Link>
                        </div>
                      ) : null}

                      {projectPartners.length > 0 ? (
                        <div className="charity-card__partners-block">
                          <span className="charity-card__meta-label">
                            Демо-профілі у прикладі
                          </span>
                          <ul className="chip-list">
                            {projectPartners.map((partner) => (
                              <li className="chip" key={partner.id}>
                                {partner.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
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
