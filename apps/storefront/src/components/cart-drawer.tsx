"use client";

import Link from "next/link";
import { useCart } from "@/context/cart-context";
import { formatHryvnia } from "@/formatters";

export function CartDrawer() {
  const {
    items,
    vendorGroups,
    totalItems,
    totalAmountUah,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  if (!isCartOpen) {
    return null;
  }

  return (
    <div
      className="cart-drawer-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeCart();
        }
      }}
    >
      <div
        className="cart-drawer-panel"
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#fff",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.15)",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--color-sand-200)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "var(--color-sand-100)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2
              id="cart-drawer-title"
              style={{
                margin: 0,
                fontSize: "1.25rem",
                color: "var(--color-ink-muted)",
              }}
            >
              Кошик покупок
            </h2>
            <span
              style={{
                fontSize: "0.85rem",
                backgroundColor: "var(--color-pine-900)",
                color: "#fff",
                padding: "0.15rem 0.5rem",
                borderRadius: "12px",
                fontWeight: 600,
              }}
            >
              {totalItems}
            </span>
          </div>

          <button
            type="button"
            onClick={closeCart}
            aria-label="Закрити кошик"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "var(--color-ink-muted)",
              lineHeight: 1,
              padding: "0.25rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.25rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1rem",
                color: "var(--color-ink-muted)",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧺</div>
              <h3 style={{ margin: "0 0 0.5rem 0" }}>Ваш кошик порожній</h3>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--color-ink-muted)",
                  marginBottom: "1.5rem",
                }}
              >
                Оберіть унікальні крафтові вироби від українських майстрів у
                каталозі.
              </p>
              <Link
                href="/catalog"
                onClick={closeCart}
                className="button button-primary"
                style={{ display: "inline-block" }}
              >
                Перейти до каталогу
              </Link>
            </div>
          ) : (
            vendorGroups.map((group) => (
              <div
                key={group.vendorHandle}
                style={{
                  border: "1px solid var(--color-sand-200)",
                  borderRadius: "var(--radius-md)",
                  padding: "1rem",
                  backgroundColor: "var(--color-sand-50)",
                }}
              >
                {/* Vendor Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.75rem",
                    borderBottom: "1px dashed var(--color-sand-200)",
                    paddingBottom: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>🌿</span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        color: "var(--color-pine-900)",
                      }}
                    >
                      {group.vendorName}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-ink-muted)",
                    }}
                  >
                    Пряма відправка
                  </span>
                </div>

                {/* Items in Vendor Group */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        backgroundColor: "#fff",
                        padding: "0.6rem 0.8rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-sand-200)",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link
                          href={`/catalog/${item.categorySlug}/${item.slug}`}
                          onClick={closeCart}
                          style={{
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            color: "var(--color-pine-900)",
                            textDecoration: "none",
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.name}
                        </Link>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--color-terracotta-500)",
                            fontWeight: 600,
                            marginTop: "2px",
                          }}
                        >
                          {formatHryvnia(item.priceUah)}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          aria-label={`Зменшити кількість ${item.name}`}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "4px",
                            border: "1px solid var(--color-sand-200)",
                            backgroundColor: "var(--color-sand-100)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                          }}
                        >
                          -
                        </button>
                        <span
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            minWidth: "16px",
                            textAlign: "center",
                          }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          aria-label={`Збільшити кількість ${item.name}`}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "4px",
                            border: "1px solid var(--color-sand-200)",
                            backgroundColor: "var(--color-sand-100)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                          }}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Видалити ${item.name}`}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--color-terracotta-500)",
                            cursor: "pointer",
                            fontSize: "1rem",
                            marginLeft: "0.25rem",
                            padding: "0.2rem",
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vendor Subtotal */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "0.75rem",
                    fontSize: "0.85rem",
                    color: "var(--color-ink-muted)",
                    paddingTop: "0.4rem",
                    borderTop: "1px dashed var(--color-sand-200)",
                  }}
                >
                  <span>Підсумок майстерні:</span>
                  <strong style={{ color: "var(--color-pine-900)" }}>
                    {formatHryvnia(group.subtotalUah)}
                  </strong>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with checkout action */}
        {items.length > 0 && (
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderTop: "1px solid var(--color-sand-200)",
              backgroundColor: "var(--color-sand-100)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "var(--color-ink-muted)",
                }}
              >
                Разом до сплати:
              </span>
              <span
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 700,
                  color: "var(--color-pine-900)",
                }}
              >
                {formatHryvnia(totalAmountUah)}
              </span>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="button button-primary"
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "0.75rem 1rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                  backgroundColor: "var(--color-terracotta-500)",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                Оформити замовлення →
              </Link>
              <button
                type="button"
                onClick={clearCart}
                title="Очистити кошик"
                style={{
                  padding: "0.75rem",
                  background: "transparent",
                  border: "1px solid var(--color-sand-200)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                Очистити
              </button>
            </div>

            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--color-ink-muted)",
                textAlign: "center",
                margin: "0.75rem 0 0 0",
              }}
            >
              🧪 Чернетка кошика: серверне замовлення, оплата й доставка не
              створюються
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
