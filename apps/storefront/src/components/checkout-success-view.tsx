"use client";

import Link from "next/link";

export function CheckoutSuccessView() {
  return (
    <div
      className="section"
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "3rem 1rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🧪</div>

      <h1
        style={{
          fontSize: "2rem",
          color: "var(--color-pine-900)",
          marginBottom: "0.5rem",
        }}
      >
        Демо-перегляд кошика
      </h1>

      <p
        style={{
          fontSize: "1.1rem",
          color: "var(--color-ink-muted)",
          marginBottom: "2rem",
        }}
      >
        Це демонстраційний перегляд кошика. Замовлення на сервері не створено.
      </p>

      <div
        role="status"
        style={{
          backgroundColor: "#fff8e1",
          border: "1px solid #f1d48a",
          padding: "1.25rem 1.5rem",
          borderRadius: "var(--radius-md)",
          textAlign: "left",
          marginBottom: "2rem",
          color: "#6b4f00",
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          Серверне оформлення наразі недоступне
        </div>
        <div style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>
          Платіж, Escrow-холдинг, комісія, IBAN, ТТН і виплата майстерні не
          створюються. Контактні дані не запитуються, не зберігаються й не
          передаються.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/checkout"
          className="button button-primary"
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            fontWeight: 600,
            backgroundColor: "var(--color-terracotta-500)",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "var(--radius-sm)",
          }}
        >
          Повернутися до демо-кошика
        </Link>

        <Link
          href="/catalog"
          className="button button-secondary"
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
          }}
        >
          Повернутися до каталогу
        </Link>
      </div>
    </div>
  );
}
