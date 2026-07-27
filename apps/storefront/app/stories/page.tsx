import type { Metadata } from "next";

import { SectionHeading, StoryCard } from "@/components";
import { stories } from "@/fixtures";

export const metadata: Metadata = {
  title: "Історії спільноти",
  description:
    "Короткі історії людей Life-MP у локальному демонстраційному прототипі.",
};

export default function StoriesPage() {
  return (
    <>
      <section className="page-section page-section--spacious">
        <div className="page-shell">
          <div className="page-intro">
            <p className="page-intro__eyebrow">Історії</p>
            <h1>Історії спільноти</h1>
            <p className="page-intro__lead">
              Короткі розповіді про досвіди, зв’язки та ідеї, з яких складається
              спільнота Life-MP.
            </p>
          </div>
          <aside className="notice" aria-label="Статус історій">
            <h2 className="notice__title">Локальні матеріали прототипу</h2>
            <p>
              Це заздалегідь підготовлені демонстраційні тексти. Коментарів,
              підписок, авторизації та зовнішнього поширення тут немає.
            </p>
          </aside>
        </div>
      </section>

      <section className="page-section--tint" aria-label="Перелік історій">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Читайте"
            title="Добірка історій"
            description="Відкрийте матеріал, щоб побачити пов’язані людину та тематичні позиції."
          />
          <div className="content-grid content-grid--wide-cards">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
