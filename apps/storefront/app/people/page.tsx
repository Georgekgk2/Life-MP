import type { Metadata } from "next";

import { PersonCard, SectionHeading } from "@/components";
import { people } from "@/fixtures";

export const metadata: Metadata = {
  title: "Люди спільноти",
  description:
    "Знайомство з людьми Life-MP та темами, якими вони діляться у демонстраційному прототипі.",
};

export default function PeoplePage() {
  return (
    <>
      <section className="page-section page-section--spacious">
        <div className="page-shell">
          <div className="page-intro">
            <p className="page-intro__eyebrow">Люди</p>
            <h1>Люди спільноти</h1>
            <p className="page-intro__lead">
              Познайомтеся з учасниками й учасницями, чиї досвіди та інтереси
              допомагають побачити кожен напрям ближче.
            </p>
          </div>
          <aside className="notice" aria-label="Статус профілів">
            <h2 className="notice__title">
              Профілі мають демонстраційний характер
            </h2>
            <p>
              Сторінки створено для навігації за локальними даними. Контактів,
              облікових записів, повідомлень і збору персональних даних немає.
            </p>
          </aside>
        </div>
      </section>

      <section
        className="page-section--tint"
        aria-label="Перелік людей спільноти"
      >
        <div className="page-shell">
          <SectionHeading
            eyebrow="Знайомство"
            title="Учасники та учасниці"
            description="Відкрийте профіль, щоб побачити пов’язані історії, події та матеріали."
          />
          <div className="content-grid content-grid--cards">
            {people.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
