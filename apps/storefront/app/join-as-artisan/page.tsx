import type { Metadata } from "next";
import { ArtisanForm, SectionHeading } from "@/components";

export const metadata: Metadata = {
  title: "Стати майстром",
  description:
    "Приєднуйтесь до спільноти українських майстрів та ремісників Life-MP. Подайте заявку на розміщення виробів у каталозі.",
};

export default function JoinAsArtisanPage() {
  return (
    <div className="page-shell page-section page-section--spacious">
      <SectionHeading
        level="h1"
        eyebrow="Для майстрів та виробників"
        title="Стати частиною спільноти Life-MP"
        description="Ми об'єднуємо українських ремісників, крафтові майстерні та локальні виробництва натуральних товарів. Запрошуємо до простору, де цінують автентичність, якість та працю людини."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
          gap: "1.5rem",
          marginTop: "2rem",
          marginBottom: "3rem",
        }}
      >
        <div className="card" style={{ padding: "1.75rem" }}>
          <span style={{ fontSize: "2rem" }} role="img" aria-label="Рослина">
            🌿
          </span>
          <h3
            style={{
              fontSize: "1.2rem",
              marginTop: "0.75rem",
              marginBottom: "0.5rem",
              color: "var(--color-primary-strong)",
            }}
          >
            100% Локальність та склад
          </h3>
          <p
            style={{
              color: "var(--color-ink-subtle)",
              fontSize: "0.95rem",
              lineHeight: "1.5",
            }}
          >
            Ми підтримуємо українське крафтове виробництво: вироби з натуральної
            глини, льону, вовни, воску та органічних складників без шкідливих
            домішок.
          </p>
        </div>

        <div className="card" style={{ padding: "1.75rem" }}>
          <span style={{ fontSize: "2rem" }} role="img" aria-label="Люди">
            👥
          </span>
          <h3
            style={{
              fontSize: "1.2rem",
              marginTop: "0.75rem",
              marginBottom: "0.5rem",
              color: "var(--color-primary-strong)",
            }}
          >
            Впізнаваність та історія
          </h3>
          <p
            style={{
              color: "var(--color-ink-subtle)",
              fontSize: "0.95rem",
              lineHeight: "1.5",
            }}
          >
            Кожен майстер на Life-MP має власну персональну сторінку та розділ в
            історіях, щоб покупці бачили людину та філософію за кожним виробом.
          </p>
        </div>

        <div className="card" style={{ padding: "1.75rem" }}>
          <span style={{ fontSize: "2rem" }} role="img" aria-label="Щит">
            🛡️
          </span>
          <h3
            style={{
              fontSize: "1.2rem",
              marginTop: "0.75rem",
              marginBottom: "0.5rem",
              color: "var(--color-primary-strong)",
            }}
          >
            Дбайлива модерація
          </h3>
          <p
            style={{
              color: "var(--color-ink-subtle)",
              fontSize: "0.95rem",
              lineHeight: "1.5",
            }}
          >
            Ми перевіряємо вироби на відповідність критеріям якості, надаємо
            маркування «Органічні вироби» та «Перевірений майстер» для довіри
            покупців.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          maxWidth: "48rem",
          margin: "0 auto",
        }}
      >
        <ArtisanForm />
      </div>
    </div>
  );
}
