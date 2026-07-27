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
            eyebrow="Ініціативи"
            title="Напрями підтримки"
            description="Кожна ініціатива пов’язана з людиною та згаданими партнерами у локальних даних."
          />
          <div className="content-grid content-grid--wide-cards">
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
                <article className="card" key={project.id}>
                  <p className="card__eyebrow">Ініціатива підтримки</p>
                  <h2>{project.title}</h2>
                  <p>{project.summary}</p>
                  <dl className="data-list">
                    <div className="data-list__item">
                      <dt className="data-list__label">Статус</dt>
                      <dd className="data-list__value">
                        Лише інформація в демо-прототипі
                      </dd>
                    </div>
                    {beneficiary ? (
                      <div className="data-list__item">
                        <dt className="data-list__label">Пов’язана людина</dt>
                        <dd className="data-list__value">
                          <Link href={`/people/${beneficiary.slug}`}>
                            {beneficiary.name}
                          </Link>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {projectPartners.length > 0 ? (
                    <div>
                      <p>Згадані партнери</p>
                      <ul className="chip-list">
                        {projectPartners.map((partner) => (
                          <li className="chip" key={partner.id}>
                            {partner.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
