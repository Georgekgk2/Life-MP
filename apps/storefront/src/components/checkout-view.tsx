"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/cart-context";
import type { CheckoutCustomerInput } from "@life/types";
import { formatHryvnia } from "@/formatters";

export function CheckoutView() {
  const router = useRouter();
  const { items, vendorGroups, totalItems, totalAmountUah } = useCart();

  const [formData, setFormData] = useState<CheckoutCustomerInput>({
    fullName: "",
    phone: "",
    email: "",
    city: "",
    novaPoshtaBranch: "",
    paymentMethod: "sandbox_escrow",
    comment: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError("Кошик порожній. Додайте вироби перед оформленням.");
      return;
    }

    if (!formData.fullName.trim() || !formData.phone.trim()) {
      setError("Будь ласка, вкажіть ваше ім'я та контактний номер телефону.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

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
        <Link href="/catalog" className="button button-primary">
          Перейти до каталогу
        </Link>
      </div>
    );
  }

  return (
    <div
      className="section"
      style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1rem" }}
    >
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
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "2rem",
          }}
        >
          {/* Left Column: Customer & Delivery Details */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {/* 1. Contact Info */}
            <div
              style={{
                backgroundColor: "#fff",
                padding: "1.5rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-sand-200)",
              }}
            >
              <h2
                style={{
                  fontSize: "1.2rem",
                  margin: "0 0 1.25rem 0",
                  color: "var(--color-pine-900)",
                }}
              >
                1. Контактні дані отримувача
              </h2>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
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
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-sand-200)",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
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
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.8rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-sand-200)",
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
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.8rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-sand-200)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Delivery */}
            <div
              style={{
                backgroundColor: "#fff",
                padding: "1.5rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-sand-200)",
              }}
            >
              <h2
                style={{
                  fontSize: "1.2rem",
                  margin: "0 0 1.25rem 0",
                  color: "var(--color-pine-900)",
                }}
              >
                2. Доставка Новою Поштою
              </h2>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
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
                    Населений пункт *
                  </label>
                  <input
                    id="city"
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-sand-200)",
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
                    Відділення або поштомат *
                  </label>
                  <input
                    id="novaPoshtaBranch"
                    type="text"
                    required
                    value={formData.novaPoshtaBranch}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        novaPoshtaBranch: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-sand-200)",
                    }}
                  />
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
                    rows={2}
                    value={formData.comment}
                    onChange={(e) =>
                      setFormData({ ...formData, comment: e.target.value })
                    }
                    placeholder="Побажання щодо пакування або доставки"
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-sand-200)",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Payment Method */}
            <div
              style={{
                backgroundColor: "#fff",
                padding: "1.5rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-sand-200)",
              }}
            >
              <h2
                style={{
                  fontSize: "1.2rem",
                  margin: "0 0 1.25rem 0",
                  color: "var(--color-pine-900)",
                }}
              >
                3. Тестовий спосіб оплати
              </h2>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    borderRadius: "var(--radius-sm)",
                    border:
                      formData.paymentMethod === "sandbox_escrow"
                        ? "2px solid var(--color-pine-900)"
                        : "1px solid var(--color-sand-200)",
                    backgroundColor:
                      formData.paymentMethod === "sandbox_escrow"
                        ? "var(--color-sand-100)"
                        : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="sandbox_escrow"
                    checked={formData.paymentMethod === "sandbox_escrow"}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        paymentMethod: "sandbox_escrow",
                      })
                    }
                    style={{ marginTop: "0.25rem" }}
                  />
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--color-pine-900)",
                      }}
                    >
                      Тестова онлайн-оплата (не виконується)
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--color-ink-muted)",
                        marginTop: "2px",
                      }}
                    >
                      Платіж, Escrow-холдинг і виплата майстерням не створюються
                      у режимі чернетки
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    borderRadius: "var(--radius-sm)",
                    border:
                      formData.paymentMethod === "card_on_delivery"
                        ? "2px solid var(--color-pine-900)"
                        : "1px solid var(--color-sand-200)",
                    backgroundColor:
                      formData.paymentMethod === "card_on_delivery"
                        ? "var(--color-sand-100)"
                        : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card_on_delivery"
                    checked={formData.paymentMethod === "card_on_delivery"}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        paymentMethod: "card_on_delivery",
                      })
                    }
                    style={{ marginTop: "0.25rem" }}
                  />
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--color-pine-900)",
                      }}
                    >
                      Оплата при отриманні (лише чернетка)
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--color-ink-muted)",
                        marginTop: "2px",
                      }}
                    >
                      Реальна оплата та відправлення не створюються
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Vendor Order Breakdown & Summary */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                padding: "1.5rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-sand-200)",
                position: "sticky",
                top: "2rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1.2rem",
                  margin: "0 0 1rem 0",
                  color: "var(--color-pine-900)",
                }}
              >
                Склад чернетки ({totalItems} тов.)
              </h2>

              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--color-ink-muted)",
                  marginBottom: "1rem",
                }}
              >
                У чернетці товари згруповано за майстернями (
                {vendorGroups.length}
                груп). Відправлення не створюються:
              </p>

              {/* Vendor Groups Summary */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                {vendorGroups.map((group, idx) => (
                  <div
                    key={group.vendorHandle}
                    style={{
                      border: "1px solid var(--color-sand-200)",
                      borderRadius: "var(--radius-sm)",
                      padding: "0.85rem",
                      backgroundColor: "var(--color-sand-50)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color: "var(--color-pine-900)",
                        }}
                      >
                        Посилка #{idx + 1}: {group.vendorName}
                      </span>
                      <strong style={{ fontSize: "0.9rem" }}>
                        {formatHryvnia(group.subtotalUah)}
                      </strong>
                    </div>

                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "1.2rem",
                        fontSize: "0.85rem",
                        color: "var(--color-ink-muted)",
                      }}
                    >
                      {group.items.map((it) => (
                        <li key={it.id}>
                          {it.name} × {it.quantity} (
                          {formatHryvnia(it.priceUah)})
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div
                style={{
                  borderTop: "1px solid var(--color-sand-200)",
                  paddingTop: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                  }}
                >
                  <span>Вартість товарів:</span>
                  <span>{formatHryvnia(totalAmountUah)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  <span>Доставка Новою Поштою:</span>
                  <span>За тарифами перевізника</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--color-pine-900)",
                    marginTop: "0.75rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px dashed var(--color-sand-200)",
                  }}
                >
                  <span>Сума чернетки:</span>
                  <span>{formatHryvnia(totalAmountUah)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="button button-primary"
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                  backgroundColor: "var(--color-terracotta-500)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting
                  ? "Відкриття стану чернетки..."
                  : `Переглянути стан чернетки (${formatHryvnia(totalAmountUah)})`}
              </button>

              <div
                style={{
                  marginTop: "1rem",
                  fontSize: "0.75rem",
                  color: "var(--color-ink-muted)",
                  textAlign: "center",
                  lineHeight: 1.4,
                }}
              >
                ⚠️ Серверне створення замовлення недоступне: кошти, комісія,
                IBAN, Escrow, ТТН і виплати не створюються. Дані форми не
                передаються на сервер і не показуються на сторінці стану.
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
