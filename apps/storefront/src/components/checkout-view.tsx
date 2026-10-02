"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/cart-context";
import { formatHryvnia } from "@/formatters";

type CheckoutStep = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1 as CheckoutStep, label: "Отримувач (демо)" },
  { id: 2 as CheckoutStep, label: "Доставка (демо)" },
  { id: 3 as CheckoutStep, label: "Оплата (демо)" },
  { id: 4 as CheckoutStep, label: "Підсумок демо-кошика" },
];
const DEMO_CHECKOUT_DETAILS = {
  recipient: "Демо-покупець",
  destination: "Демо-локація; фактичну адресу не запитано",
} as const;

export function CheckoutView() {
  const router = useRouter();
  const { items, totalItems, totalAmountUah } = useCart();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);
  const [deliveryType, setDeliveryType] = useState<
    "branch" | "postomate" | "courier"
  >("branch");

  const goToStep = (step: CheckoutStep) => setCurrentStep(step);
  const handleDraftPreview = () => router.push("/checkout/success?mode=draft");

  if (items.length === 0) {
    return (
      <div
        className="section"
        style={{ textAlign: "center", padding: "4rem 1rem" }}
      >
        <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🧺</div>
        <h1 style={{ marginBottom: "0.5rem" }}>Кошик порожній</h1>
        <p style={{ color: "var(--color-ink-muted)", marginBottom: "2rem" }}>
          Для переходу до оформлення замовлення оберіть товари у каталозі
          майстерень.
        </p>
        <Link href="/catalog" className="button button--primary">
          Перейти до каталогу
        </Link>
      </div>
    );
  }

  return (
    <div
      className="section"
      style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1rem" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "2rem",
            color: "var(--color-pine-900)",
            margin: "0 0 0.5rem 0",
          }}
        >
          Демо-перегляд замовлення
        </h1>
        <p style={{ color: "var(--color-ink-muted)", margin: 0 }}>
          Лише демо-перегляд: замовлення, оплата та доставка не створюються. Не
          вводьте реальні контактні чи адресні дані.
        </p>
      </div>

      {/* Stepper Navigation Bar */}
      <nav
        aria-label="Етапи оформлення чернетки"
        className="checkout-stepper-nav"
      >
        {STEPS.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(step.id)}
              className={`checkout-step-pill ${
                isActive
                  ? "checkout-step-pill--active"
                  : isCompleted
                    ? "checkout-step-pill--completed"
                    : ""
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="checkout-step-pill__num">
                {isCompleted ? "✓" : step.id}
              </span>
              <span>{step.label}</span>
            </button>
          );
        })}
      </nav>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "2rem",
        }}
      >
        {/* Step 1: Synthetic contact preview */}
        {currentStep === 1 && (
          <div className="checkout-step-card">
            <div className="checkout-step-card__header">
              <h2 className="checkout-step-card__title">1. Отримувач (демо)</h2>
              <p className="checkout-step-card__desc">
                Контактні дані не потрібні для перегляду сценарію.
              </p>
            </div>

            <aside className="notice" role="note">
              <strong>Синтетичний отримувач:</strong>{" "}
              {DEMO_CHECKOUT_DETAILS.recipient}
              <p>
                Ім’я, телефон та email не запитуються, не зберігаються й не
                передаються.
              </p>
            </aside>

            <div className="checkout-step-actions">
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-ink-muted)",
                }}
              >
                Крок 1 з 4
              </span>
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="button button--primary"
              >
                Продовжити до доставки →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Delivery Details */}
        {currentStep === 2 && (
          <div className="checkout-step-card">
            <div className="checkout-step-card__header">
              <h2 className="checkout-step-card__title">
                2. Демо-сценарій доставки
              </h2>
              <p className="checkout-step-card__desc">
                Виберіть тип доставки для перегляду. Адреса не запитується, а
                накладна не створюється.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {/* Delivery format selector */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "1rem",
                    border: `2px solid ${
                      deliveryType === "branch"
                        ? "var(--color-primary)"
                        : "var(--color-border)"
                    }`,
                    borderRadius: "var(--radius-md)",
                    backgroundColor:
                      deliveryType === "branch"
                        ? "var(--color-surface-strong)"
                        : "var(--color-canvas)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={deliveryType === "branch"}
                      onChange={() => setDeliveryType("branch")}
                    />
                    <strong>Відділення</strong>
                  </div>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-ink-muted)",
                    }}
                  >
                    До 30 кг у відділення
                  </span>
                </label>

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "1rem",
                    border: `2px solid ${
                      deliveryType === "postomate"
                        ? "var(--color-primary)"
                        : "var(--color-border)"
                    }`,
                    borderRadius: "var(--radius-md)",
                    backgroundColor:
                      deliveryType === "postomate"
                        ? "var(--color-surface-strong)"
                        : "var(--color-canvas)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={deliveryType === "postomate"}
                      onChange={() => setDeliveryType("postomate")}
                    />
                    <strong>Поштомат</strong>
                  </div>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-ink-muted)",
                    }}
                  >
                    Цілодобове отримання
                  </span>
                </label>

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "1rem",
                    border: `2px solid ${
                      deliveryType === "courier"
                        ? "var(--color-primary)"
                        : "var(--color-border)"
                    }`,
                    borderRadius: "var(--radius-md)",
                    backgroundColor:
                      deliveryType === "courier"
                        ? "var(--color-surface-strong)"
                        : "var(--color-canvas)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={deliveryType === "courier"}
                      onChange={() => setDeliveryType("courier")}
                    />
                    <strong>Кур'єр</strong>
                  </div>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-ink-muted)",
                    }}
                  >
                    Доставка за адресою
                  </span>
                </label>
              </div>

              <aside className="notice" role="note">
                <strong>Демо-локація:</strong>{" "}
                {DEMO_CHECKOUT_DETAILS.destination}
                <p>Дані для доставки не запитуються й не зберігаються.</p>
              </aside>

              <div className="checkout-step-actions">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="button button--secondary"
                >
                  ← Назад до демо-контактів
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="button button--primary"
                >
                  Продовжити до сценарію оплати →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payment Scenario Preview */}
        {currentStep === 3 && (
          <div className="checkout-step-card">
            <div className="checkout-step-card__header">
              <h2 className="checkout-step-card__title">
                3. Платіжний сценарій (Демо-перевірка)
              </h2>
              <p className="checkout-step-card__desc">
                Це лише інформаційний сценарій. Платіж, холдування коштів і
                списання не виконуються.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.25rem",
                  border: "2px solid var(--color-primary)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-surface-strong)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "1.25rem" }} aria-hidden="true">
                    💳
                  </span>
                  <strong>Тестова оплата (Sandbox)</strong>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.75rem",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-primary)",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  >
                    Пісочниця
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--color-ink-muted)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Двостадійна авторизація оплати (Authorization Hold) у
                  тестовому режимі. Реальні кошти не списуються, а номер картки
                  не запитується.
                </p>
              </div>

              <aside className="notice" role="note">
                Коментарі та додаткові контактні дані у демо не збираються.
              </aside>

              <div className="checkout-step-actions">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="button button--secondary"
                >
                  ← Назад до доставки
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(4)}
                  className="button button--primary"
                >
                  Перейти до підсумку чернетки →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Summary & Draft Verification */}
        {currentStep === 4 && (
          <div className="checkout-step-card">
            <div className="checkout-step-card__header">
              <h2 className="checkout-step-card__title">
                4. Підсумок демо-кошика
              </h2>
              <p className="checkout-step-card__desc">
                Перегляньте синтетичний підсумок; справжні контактні дані не
                потрібні.
              </p>
            </div>

            {/* Summary of buyer & delivery */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
                padding: "1rem",
                backgroundColor: "var(--color-surface-muted)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Отримувач (демо)
                </strong>
                <div style={{ fontWeight: 600 }}>
                  {DEMO_CHECKOUT_DETAILS.recipient}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-ink-subtle)",
                  }}
                >
                  Контактні дані не запитуються
                </div>
              </div>

              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Спосіб доставки (демо)
                </strong>
                <div style={{ fontWeight: 600 }}>
                  {deliveryType === "branch"
                    ? "Відділення"
                    : deliveryType === "postomate"
                      ? "Поштомат"
                      : "Кур’єр"}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-ink-subtle)",
                  }}
                >
                  {DEMO_CHECKOUT_DETAILS.destination}
                </div>
              </div>
            </div>

            {/* Vendor Groups breakdown */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
                Вироби у чернетці ({totalItems})
              </h3>
              <table className="checkout-summary-table">
                <thead>
                  <tr>
                    <th>Найменування</th>
                    <th>Кількість</th>
                    <th style={{ textAlign: "right" }}>Ціна</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.quantity} шт.</td>
                      <td style={{ textAlign: "right" }}>
                        {formatHryvnia(item.priceUah * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={2}
                      style={{ fontWeight: 700, paddingTop: "1rem" }}
                    >
                      Разом до сплати (демо):
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        color: "var(--color-pine-900)",
                        textAlign: "right",
                        paddingTop: "1rem",
                      }}
                    >
                      {formatHryvnia(totalAmountUah)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Sandbox contained notice */}
            <div
              role="status"
              style={{
                padding: "1rem",
                backgroundColor: "#fff8e1",
                border: "1px solid #f1d48a",
                borderRadius: "var(--radius-sm)",
                color: "#6b4f00",
                fontSize: "0.85rem",
                lineHeight: 1.5,
                marginBottom: "1.5rem",
              }}
            >
              <strong>🧪 Демонстраційний режим:</strong> Замовлення, платіж,
              накладна Нової Пошти й виплата майстерні не створюються. Контактні
              та адресні дані не збираються й не передаються.
            </div>

            <div className="checkout-step-actions">
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="button button--secondary"
              >
                ← Назад до оплати
              </button>
              <button
                type="button"
                onClick={handleDraftPreview}
                className="button button--primary"
                style={{
                  padding: "0.85rem 1.75rem",
                  fontSize: "1rem",
                  fontWeight: 700,
                }}
              >
                Переглянути демонстраційний стан
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
