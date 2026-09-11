"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/cart-context";
import type { CheckoutCustomerInput } from "@life/types";
import { formatHryvnia } from "@/formatters";

type CheckoutStep = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1 as CheckoutStep, label: "Контакти" },
  { id: 2 as CheckoutStep, label: "Доставка" },
  { id: 3 as CheckoutStep, label: "Оплата" },
  { id: 4 as CheckoutStep, label: "Підсумок чернетки" },
];

export function CheckoutView() {
  const router = useRouter();
  const { items, totalItems, totalAmountUah } = useCart();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);
  const [deliveryType, setDeliveryType] = useState<
    "branch" | "postomate" | "courier"
  >("branch");

  const [formData, setFormData] = useState<CheckoutCustomerInput>({
    fullName: "",
    phone: "",
    email: "",
    city: "",
    novaPoshtaBranch: "",
    paymentMethod: "sandbox_escrow",
    comment: "",
  });

  const [error, setError] = useState<string | null>(null);

  const validateStep1 = (): boolean => {
    if (!formData.fullName.trim()) {
      setError("Будь ласка, вкажіть ваше прізвище та ім'я.");
      return false;
    }
    if (!formData.phone.trim()) {
      setError("Будь ласка, вкажіть контактний номер телефону.");
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Будь ласка, вкажіть коректну адресу електронної пошти.");
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formData.city.trim()) {
      setError("Будь ласка, вкажіть місто для доставки.");
      return false;
    }
    if (!formData.novaPoshtaBranch.trim()) {
      setError("Будь ласка, вкажіть номер відділення або адресу поштомату.");
      return false;
    }
    setError(null);
    return true;
  };

  const goToStep = (step: CheckoutStep) => {
    if (step === 2 && !validateStep1()) return;
    if (step === 3) {
      if (!validateStep1() || !validateStep2()) return;
    }
    if (step === 4) {
      if (!validateStep1() || !validateStep2()) return;
    }
    setError(null);
    setCurrentStep(step);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError("Кошик порожній. Додайте вироби перед оформленням.");
      return;
    }

    if (!validateStep1() || !validateStep2()) {
      return;
    }

    // The server-side order writer is not available yet. Keep the cart draft
    // intact and show an explicit non-authoritative sandbox state instead of
    // writing customer data or payment/order records to localStorage.
    router.push("/checkout/success?mode=draft");
  };

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
          Оформлення замовлення
        </h1>
        <p style={{ color: "var(--color-ink-muted)", margin: 0 }}>
          Лише тестова чернетка: серверне замовлення, оплата та доставка не
          створюються.
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

      {error && (
        <div
          role="alert"
          style={{
            padding: "1rem",
            backgroundColor: "#fce8e6",
            color: "#c5221f",
            borderRadius: "var(--radius-sm)",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      <form method="post" onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "2rem",
          }}
        >
          {/* Step 1: Contact Details */}
          {currentStep === 1 && (
            <div className="checkout-step-card">
              <div className="checkout-step-card__header">
                <h2 className="checkout-step-card__title">
                  1. Контактні дані отримувача
                </h2>
                <p className="checkout-step-card__desc">
                  Вкажіть контакти для демонстраційного оформлення
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div>
                  <label
                    htmlFor="fullName"
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                    }}
                  >
                    Прізвище та ім'я *
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    placeholder="Наприклад: Олена Коваленко"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-border)",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "1.25rem",
                  }}
                >
                  <div>
                    <label
                      htmlFor="phone"
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        marginBottom: "0.35rem",
                      }}
                    >
                      Телефон *
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      placeholder="+380 00 000 00 00"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border)",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        marginBottom: "0.35rem",
                      }}
                    >
                      Email *
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="olena@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border)",
                      }}
                    />
                  </div>
                </div>

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
            </div>
          )}

          {/* Step 2: Delivery Details */}
          {currentStep === 2 && (
            <div className="checkout-step-card">
              <div className="checkout-step-card__header">
                <h2 className="checkout-step-card__title">
                  2. Доставка (Нова Пошта)
                </h2>
                <p className="checkout-step-card__desc">
                  Оберіть зручний спосіб доставки виробів від майстерень
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

                <div>
                  <label
                    htmlFor="city"
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                    }}
                  >
                    Населений пункт (місто / село) *
                  </label>
                  <input
                    id="city"
                    type="text"
                    required
                    placeholder="Київ, Львів, Полтава тощо"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-border)",
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="novaPoshtaBranch"
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                    }}
                  >
                    {deliveryType === "courier"
                      ? "Адреса доставки (вулиця, будинок, квартира) *"
                      : "Номер відділення або поштомату Нової Пошти *"}
                  </label>
                  <input
                    id="novaPoshtaBranch"
                    type="text"
                    required
                    placeholder={
                      deliveryType === "courier"
                        ? "вул. Хрещатик, 1, кв. 10"
                        : "Відділення №1 (вул. Спаська, 12)"
                    }
                    value={formData.novaPoshtaBranch}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        novaPoshtaBranch: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-border)",
                    }}
                  />
                </div>

                <div className="checkout-step-actions">
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="button button--secondary"
                  >
                    ← Назад до контактів
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="button button--primary"
                  >
                    Продовжити до оплати →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Payment Method Preview */}
          {currentStep === 3 && (
            <div className="checkout-step-card">
              <div className="checkout-step-card__header">
                <h2 className="checkout-step-card__title">
                  3. Демонстраційний спосіб оплати
                </h2>
                <p className="checkout-step-card__desc">
                  Вибір тестового методу оплати в середовищі пісочниці
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
                    тестовому режимі. Реальні кошти не списуються, а номер
                    картки не запитується.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="comment"
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                    }}
                  >
                    Коментар до замовлення (необов'язково)
                  </label>
                  <textarea
                    id="comment"
                    rows={3}
                    placeholder="Побажання щодо пакування, зручний час тощо"
                    value={formData.comment}
                    onChange={(e) =>
                      setFormData({ ...formData, comment: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-border)",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

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
                    Перейти до підсумку →
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
                  4. Перегляд чернетки замовлення
                </h2>
                <p className="checkout-step-card__desc">
                  Перевірте введені дані перед переходом до демонстраційного
                  стану
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
                    Отримувач
                  </strong>
                  <div style={{ fontWeight: 600 }}>
                    {formData.fullName || "—"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--color-ink-subtle)",
                    }}
                  >
                    {formData.phone} • {formData.email}
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
                    Доставка
                  </strong>
                  <div style={{ fontWeight: 600 }}>
                    Нова Пошта (
                    {deliveryType === "branch"
                      ? "Відділення"
                      : deliveryType === "postomate"
                        ? "Поштомат"
                        : "Кур'єр"}
                    )
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--color-ink-subtle)",
                    }}
                  >
                    {formData.city}, {formData.novaPoshtaBranch}
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
                <strong>🧪 Демонстраційний режим:</strong> Серверне оформлення,
                банківський платіж, формування накладної Нової Пошти та виплата
                майстерні не активні. Дані використовуються виключно для
                клієнтської візуалізації процесу замовлення.
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
                  type="submit"
                  className="button button--primary"
                  style={{
                    padding: "0.85rem 1.75rem",
                    fontSize: "1rem",
                    fontWeight: 700,
                  }}
                >
                  Переглянути стан чернетки
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
