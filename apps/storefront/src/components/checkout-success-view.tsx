"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SandboxOrderEngine } from "@/sandbox/order-engine";

const hryvniaFormatter = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
});

export function CheckoutSuccessView() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber") || "LF-20260819-1001";

  const { childOrders } = SandboxOrderEngine.getOrder(orderNumber);

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
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>

      <h1
        style={{
          fontSize: "2rem",
          color: "var(--color-pine-900)",
          marginBottom: "0.5rem",
        }}
      >
        Дякуємо! Ваше замовлення прийнято
      </h1>

      <p
        style={{
          fontSize: "1.1rem",
          color: "var(--color-ink-muted)",
          marginBottom: "2rem",
        }}
      >
        Номер замовлення: <strong>#{orderNumber}</strong>
      </p>

      {/* Escrow banner */}
      <div
        style={{
          backgroundColor: "#e6f4ea",
          border: "1px solid #ceead6",
          padding: "1.25rem 1.5rem",
          borderRadius: "var(--radius-md)",
          textAlign: "left",
          marginBottom: "2rem",
          color: "#137333",
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: "1rem",
            marginBottom: "0.25rem",
          }}
        >
          🔒 Оплата захолдована у безпечному Escrow
        </div>
        <div style={{ fontSize: "0.85rem", lineHeight: 1.4 }}>
          Кошти надійно зарезервовані. Кожна майстерня отримає оплату
          автоматично після того, як ви отримаєте посилку у відділенні Нової
          Пошти.
        </div>
      </div>

      {/* Split overview */}
      {childOrders.length > 0 && (
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid var(--color-sand-200)",
            borderRadius: "var(--radius-md)",
            padding: "1.5rem",
            textAlign: "left",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.15rem",
              margin: "0 0 1rem 0",
              color: "var(--color-pine-900)",
            }}
          >
            Сформовані посилки за майстернями ({childOrders.length}):
          </h2>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {childOrders.map((child, idx) => (
              <div
                key={child.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  backgroundColor: "var(--color-sand-50)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-sand-200)",
                  fontSize: "0.9rem",
                }}
              >
                <div>
                  <strong>
                    Посилка #{idx + 1}: {child.vendorName}
                  </strong>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-ink-muted)",
                      marginTop: "2px",
                    }}
                  >
                    ТТН: {child.trackingNumber} • {child.items.length} тов.
                  </div>
                </div>
                <strong style={{ color: "var(--color-pine-900)" }}>
                  {hryvniaFormatter.format(child.subtotalUah)}
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={`/orders/${orderNumber}`}
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
          🚚 Відстежувати посилки в реальному часі →
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
