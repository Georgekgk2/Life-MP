import type { Metadata } from "next";

import { EventCard, SectionHeading } from "@/components";
import { events } from "@/fixtures";

export const metadata: Metadata = {
  title: "Події спільноти",
  description:
    "Інформаційний календар подій Life-MP у локальному демонстраційному прототипі.",
};

export default function EventsPage() {
  return (
    <>
      <section className="page-section page-section--spacious">
        <div className="page-shell">
          <div className="page-intro">
            <p className="page-intro__eyebrow">Події</p>
            <h1>Зустрічі та спільні моменти</h1>
            <p className="page-intro__lead">
              Переглядайте інформацію про заплановані формати зустрічей у
              спільноті Life-MP.
            </p>
          </div>
          <aside className="notice" aria-label="Статус календаря">
            <h2 className="notice__title">Календар лише для ознайомлення</h2>
            <p>
              Події подано як локальні демонстраційні записи. Реєстрація,
              квитки, нагадування та передавання контактних даних недоступні.
            </p>
          </aside>
        </div>
      </section>

      <section className="page-section--tint" aria-label="Календар подій">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Календар"
            title="Найближчі формати"
            description="Дата й місце допомагають зорієнтуватися в демонстраційній інформаційній структурі."
          />
          <div className="content-grid content-grid--wide-cards">
            {events.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
