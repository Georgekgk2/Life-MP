import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading, VendorProductForm } from "@/components";

export const metadata: Metadata = {
  title: "Додати виріб до каталогу",
  description:
    "Форма додавання нового крафтового виробу для перевірених майстерень маркетплейсу Life-MP.",
};

export default function NewVendorProductPage() {
  return (
    <div className="page-shell page-section page-section--spacious">
      {/* Breadcrumbs */}
      <nav
        className="breadcrumbs"
        aria-label="Хлібні крихти"
        style={{ marginBottom: "1.5rem" }}
      >
        <ol
          style={{
            display: "flex",
            gap: "0.5rem",
            listStyle: "none",
            padding: 0,
            fontSize: "0.875rem",
          }}
        >
          <li>
            <Link href="/" style={{ color: "var(--color-primary)" }}>
              Головна
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/join-as-artisan"
              style={{ color: "var(--color-primary)" }}
            >
              Майстерні
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" style={{ color: "var(--color-ink-muted)" }}>
            Додати виріб
          </li>
        </ol>
      </nav>

      <SectionHeading
        level="h1"
        eyebrow="Для перевірених майстерень"
        title="Додати виріб до каталогу Life-MP"
        description="Заповніть інформацію про ваш новий крафтовий виріб, оберіть категорію та вкажіть особливості ремесла. Після перевірки модератором товар з'явиться на вітрині."
      />

      {/* Craft Tips Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
          gap: "1.25rem",
          marginTop: "2rem",
          marginBottom: "2.5rem",
        }}
      >
        <div className="card" style={{ padding: "1.25rem" }}>
          <span style={{ fontSize: "1.75rem" }} role="img" aria-label="Опис">
            📝
          </span>
          <h3
            style={{
              fontSize: "1.05rem",
              margin: "0.5rem 0 0.25rem 0",
              color: "var(--color-ink)",
            }}
          >
            Детальний опис
          </h3>
          <p
            style={{
              color: "var(--color-ink-subtle)",
              fontSize: "0.85rem",
              lineHeight: "1.5",
            }}
          >
            Вказуйте розміри, натуральні складники, технологію виготовлення та
            призначення виробу.
          </p>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <span style={{ fontSize: "1.75rem" }} role="img" aria-label="Органік">
            🌿
          </span>
          <h3
            style={{
              fontSize: "1.05rem",
              margin: "0.5rem 0 0.25rem 0",
              color: "var(--color-ink)",
            }}
          >
            Ознаки та бейджі
          </h3>
          <p
            style={{
              color: "var(--color-ink-subtle)",
              fontSize: "0.85rem",
              lineHeight: "1.5",
            }}
          >
            Позначайте органічний склад та сертифікацію — це підвищує довіру
            покупців у каталозі.
          </p>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <span
            style={{ fontSize: "1.75rem" }}
            role="img"
            aria-label="Модерація"
          >
            🛡️
          </span>
          <h3
            style={{
              fontSize: "1.05rem",
              margin: "0.5rem 0 0.25rem 0",
              color: "var(--color-ink)",
            }}
          >
            Прозора перевірка
          </h3>
          <p
            style={{
              color: "var(--color-ink-subtle)",
              fontSize: "0.85rem",
              lineHeight: "1.5",
            }}
          >
            Кожен новий товар перевіряється комплаєнс-модератором платформи
            перед публікацією.
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
        <VendorProductForm />
      </div>
    </div>
  );
}
