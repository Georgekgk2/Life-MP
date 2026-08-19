"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  NOVA_POSHTA_STATUS_MAP,
  SandboxOrderEngine,
} from "@/sandbox/order-engine";
import type {
  EscrowHoldRecord,
  NovaPoshtaTrackingStatus,
  ParentOrder,
  SettlementBatchRecord,
  VendorChildOrder,
} from "@life/types";

const hryvniaFormatter = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
});

interface OrderTrackerViewProps {
  orderNumber: string;
}

export function OrderTrackerView({ orderNumber }: OrderTrackerViewProps) {
  const [orderData, setOrderData] = useState<{
    parentOrder?: ParentOrder;
    childOrders: VendorChildOrder[];
    escrowHold?: EscrowHoldRecord;
    settlements: SettlementBatchRecord[];
  }>({ childOrders: [], settlements: [] });

  const [notification, setNotification] = useState<string | null>(null);

  const refreshOrder = () => {
    const data = SandboxOrderEngine.getOrder(orderNumber);
    setOrderData(data);
  };

  useEffect(() => {
    refreshOrder();
  }, [orderNumber]);

  const { parentOrder, childOrders, escrowHold, settlements } = orderData;

  const handleTrackingChange = (
    childOrderId: string,
    newStatus: NovaPoshtaTrackingStatus,
  ) => {
    const res = SandboxOrderEngine.updateTrackingStatus(
      childOrderId,
      newStatus,
    );
    refreshOrder();

    if (newStatus === 9) {
      setNotification(
        `🎉 Посилку вручено покупцю! Автоматично розблоковано виплату для ${res.childOrder?.vendorName} на суму ${hryvniaFormatter.format(res.childOrder?.vendorPayoutUah || 0)} (SettlementBatch створено).`,
      );
    } else {
      setNotification(
        `Оновлено статус доставки на: «${NOVA_POSHTA_STATUS_MAP[newStatus]}»`,
      );
    }

    setTimeout(() => setNotification(null), 6000);
  };

  if (!parentOrder) {
    return (
      <div
        className="section"
        style={{ textAlign: "center", padding: "4rem 1rem" }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
        <h2>Замовлення #{orderNumber} не знайдено</h2>
        <p style={{ color: "var(--color-ink-muted)", marginBottom: "2rem" }}>
          Перевірте правильність номера замовлення або поверніться до каталогу.
        </p>
        <Link href="/catalog" className="button button-primary">
          До каталогу
        </Link>
      </div>
    );
  }

  const allDelivered = childOrders.every(
    (c) => c.status === "delivered" || c.status === "settled",
  );

  return (
    <div
      className="section"
      style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1rem" }}
    >
      {/* Back button & Title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/catalog"
          style={{
            color: "var(--color-pine-900)",
            textDecoration: "none",
            fontSize: "0.9rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            marginBottom: "1rem",
          }}
        >
          ← До каталогу
        </Link>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.85rem",
                margin: "0 0 0.25rem 0",
                color: "var(--color-pine-900)",
              }}
            >
              Замовлення #{parentOrder.orderNumber}
            </h1>
            <p
              style={{
                color: "var(--color-ink-muted)",
                margin: 0,
                fontSize: "0.9rem",
              }}
            >
              Створено:{" "}
              {new Date(parentOrder.createdAt).toLocaleString("uk-UA")}
            </p>
          </div>

          {/* Status Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: "20px",
                fontWeight: 600,
                fontSize: "0.85rem",
                backgroundColor: allDelivered ? "#e6f4ea" : "#e8f0fe",
                color: allDelivered ? "#137333" : "#1a73e8",
              }}
            >
              {allDelivered ? "✓ Замовлення виконано" : "🔒 Escrow Захолдовано"}
            </span>
          </div>
        </div>
      </div>

      {notification && (
        <div
          role="status"
          style={{
            padding: "1rem 1.25rem",
            backgroundColor: "#e6f4ea",
            color: "#137333",
            borderRadius: "var(--radius-sm)",
            marginBottom: "1.5rem",
            fontWeight: 600,
            border: "1px solid #ceead6",
          }}
        >
          {notification}
        </div>
      )}

      {/* Escrow Banner */}
      <div
        style={{
          backgroundColor: "var(--color-pine-900)",
          color: "var(--color-sand-100)",
          padding: "1.25rem 1.5rem",
          borderRadius: "var(--radius-md)",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
            {escrowHold?.status === "captured"
              ? "✓ Кошти успішно виплачено майстрам"
              : "🛡️ Безпечний Escrow-холдинг активний"}
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: "rgba(250, 247, 242, 0.8)",
              marginTop: "4px",
            }}
          >
            Сума холду:{" "}
            <strong>
              {hryvniaFormatter.format(parentOrder.totalAmountUah)}
            </strong>{" "}
            • Провайдер: Sandbox Escrow (Phase 4C)
          </div>
        </div>

        <div style={{ fontSize: "0.85rem", textAlign: "right" }}>
          <div>
            Отримувач: <strong>{parentOrder.customer.fullName}</strong>
          </div>
          <div style={{ color: "rgba(250, 247, 242, 0.8)" }}>
            {parentOrder.customer.city}, {parentOrder.customer.novaPoshtaBranch}
          </div>
        </div>
      </div>

      {/* Child Orders Split by Vendor */}
      <h2
        style={{
          fontSize: "1.3rem",
          color: "var(--color-pine-900)",
          marginBottom: "1rem",
        }}
      >
        Розщеплені відправлення за майстернями ({childOrders.length} посилки)
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {childOrders.map((child, index) => {
          const settlement = settlements.find(
            (s) => s.childOrderId === child.id,
          );
          const isDelivered =
            child.status === "delivered" || child.status === "settled";

          return (
            <div
              key={child.id}
              style={{
                backgroundColor: "#fff",
                border: "1px solid var(--color-sand-200)",
                borderRadius: "var(--radius-md)",
                padding: "1.5rem",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--color-sand-200)",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--color-ink-muted)",
                    }}
                  >
                    Посилка #{index + 1} • {child.id}
                  </span>
                  <h3
                    style={{
                      margin: "0.2rem 0 0 0",
                      color: "var(--color-pine-900)",
                    }}
                  >
                    🌿 {child.vendorName}
                  </h3>
                </div>

                <span
                  style={{
                    padding: "0.3rem 0.65rem",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    backgroundColor: isDelivered ? "#e6f4ea" : "#fef7e0",
                    color: isDelivered ? "#137333" : "#b06000",
                  }}
                >
                  {isDelivered
                    ? "✓ Вручено отримувачу"
                    : child.trackingStatusName}
                </span>
              </div>

              {/* Items in this child order */}
              <div style={{ marginBottom: "1.25rem" }}>
                <h4
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--color-ink-muted)",
                    margin: "0 0 0.5rem 0",
                  }}
                >
                  Товари у відправленні:
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {child.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.9rem",
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "var(--color-sand-50)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <strong>
                        {hryvniaFormatter.format(item.priceUah * item.quantity)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial split breakdown */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "0.75rem",
                  padding: "0.85rem",
                  backgroundColor: "var(--color-sand-100)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <div style={{ color: "var(--color-ink-muted)" }}>
                    Вартість товарів:
                  </div>
                  <strong>{hryvniaFormatter.format(child.subtotalUah)}</strong>
                </div>
                <div>
                  <div style={{ color: "var(--color-ink-muted)" }}>
                    Комісія маркетплейсу (10%):
                  </div>
                  <strong style={{ color: "var(--color-terracotta-500)" }}>
                    - {hryvniaFormatter.format(child.platformCommissionUah)}
                  </strong>
                </div>
                <div>
                  <div style={{ color: "var(--color-ink-muted)" }}>
                    До виплати майстру (90%):
                  </div>
                  <strong style={{ color: "var(--color-pine-900)" }}>
                    {hryvniaFormatter.format(child.vendorPayoutUah)}
                  </strong>
                </div>
              </div>

              {/* Nova Poshta Tracking & Simulator */}
              <div
                style={{
                  padding: "1rem",
                  border: "1px solid var(--color-sand-200)",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span style={{ fontSize: "1.2rem" }}>🚚</span>
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-ink-muted)",
                        }}
                      >
                        Експрес-накладна Нової Пошти:
                      </div>
                      <strong
                        style={{ fontSize: "0.95rem", letterSpacing: "0.5px" }}
                      >
                        {child.trackingNumber}
                      </strong>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--color-pine-900)",
                    }}
                  >
                    {child.trackingStatusName}
                  </span>
                </div>

                {/* Simulator controls */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    paddingTop: "0.75rem",
                    borderTop: "1px dashed var(--color-sand-200)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-ink-muted)",
                      fontWeight: 600,
                    }}
                  >
                    🧪 Симулятор трекінгу:
                  </span>

                  <button
                    type="button"
                    onClick={() => handleTrackingChange(child.id, 4)}
                    disabled={child.trackingStatusCode === 4}
                    style={{
                      padding: "0.3rem 0.6rem",
                      fontSize: "0.75rem",
                      borderRadius: "4px",
                      border: "1px solid var(--color-sand-200)",
                      backgroundColor:
                        child.trackingStatusCode === 4
                          ? "var(--color-pine-900)"
                          : "#fff",
                      color:
                        child.trackingStatusCode === 4 ? "#fff" : "inherit",
                      cursor: "pointer",
                    }}
                  >
                    Прямує (4)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTrackingChange(child.id, 7)}
                    disabled={child.trackingStatusCode === 7}
                    style={{
                      padding: "0.3rem 0.6rem",
                      fontSize: "0.75rem",
                      borderRadius: "4px",
                      border: "1px solid var(--color-sand-200)",
                      backgroundColor:
                        child.trackingStatusCode === 7
                          ? "var(--color-pine-900)"
                          : "#fff",
                      color:
                        child.trackingStatusCode === 7 ? "#fff" : "inherit",
                      cursor: "pointer",
                    }}
                  >
                    Прибуло (7)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTrackingChange(child.id, 9)}
                    disabled={child.trackingStatusCode === 9}
                    style={{
                      padding: "0.3rem 0.6rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: "4px",
                      border: "1px solid #137333",
                      backgroundColor:
                        child.trackingStatusCode === 9 ? "#137333" : "#e6f4ea",
                      color:
                        child.trackingStatusCode === 9 ? "#fff" : "#137333",
                      cursor: "pointer",
                    }}
                  >
                    ✓ Вручено (9) ➔ Виплата
                  </button>
                </div>
              </div>

              {/* Settlement Payout confirmation badge if settled */}
              {settlement && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem 1rem",
                    backgroundColor: "#e6f4ea",
                    border: "1px solid #ceead6",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.85rem",
                    color: "#137333",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>
                      ✓ Виплату проведено (SettlementBatch #{settlement.id})
                    </strong>
                    <div style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                      IBAN: {settlement.iban} • Час:{" "}
                      {new Date(settlement.settledAt).toLocaleTimeString(
                        "uk-UA",
                      )}
                    </div>
                  </div>
                  <strong style={{ fontSize: "1rem" }}>
                    +{hryvniaFormatter.format(settlement.payoutAmountUah)}
                  </strong>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
