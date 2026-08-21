import Link from "next/link";

interface OrderTrackerViewProps {
  orderNumber: string;
}

export function OrderTrackerView({ orderNumber }: OrderTrackerViewProps) {
  return (
    <main
      className="section"
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "3rem 1rem",
      }}
    >
      <Link
        href="/catalog"
        style={{
          color: "var(--color-pine-900)",
          textDecoration: "none",
          fontSize: "0.9rem",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          marginBottom: "1.5rem",
        }}
      >
        ← До каталогу
      </Link>

      <section
        aria-labelledby="order-tracking-unavailable-title"
        style={{
          padding: "2rem 1.5rem",
          textAlign: "center",
          backgroundColor: "#fff",
          border: "1px solid var(--color-sand-200)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛡️</div>
        <h1
          id="order-tracking-unavailable-title"
          style={{
            margin: "0 0 0.75rem",
            color: "var(--color-pine-900)",
            fontSize: "1.7rem",
          }}
        >
          Відстеження замовлення #{orderNumber}
        </h1>
        <p
          style={{
            margin: "0 auto 1.5rem",
            maxWidth: "620px",
            color: "var(--color-ink-muted)",
            lineHeight: 1.6,
          }}
        >
          Дані замовлення тимчасово недоступні. У поточному sandbox-режимі
          відображення персональних даних, статусів доставки та виплат вимкнено.
        </p>

        <aside
          role="status"
          style={{
            padding: "1rem 1.25rem",
            textAlign: "left",
            backgroundColor: "var(--color-sand-100)",
            border: "1px solid var(--color-sand-200)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-ink)",
            lineHeight: 1.6,
          }}
        >
          <strong>Безпечний sandbox:</strong> цей маршрут не читає дані з
          локального сховища браузера й не змінює статуси доставки або виплати.
          Захищене відстеження з’явиться після підключення server-authenticated
          API та автентифікації клієнта.
        </aside>
      </section>
    </main>
  );
}
