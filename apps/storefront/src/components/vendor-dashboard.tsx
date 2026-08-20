"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  NOVA_POSHTA_STATUS_MAP,
  SandboxOrderEngine,
} from "@/sandbox/order-engine";
import type {
  NovaPoshtaTrackingStatus,
  SettlementBatchRecord,
  VendorChildOrder,
} from "@life/types";

const hryvniaFormatter = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
});

interface VendorProfile {
  handle: string;
  name: string;
  category: string;
  taxStatus: string;
  iban: string;
  rating: number;
  reviewCount: number;
}

const VENDOR_PROFILES: readonly VendorProfile[] = [
  {
    handle: "olena",
    name: "Майстерня Олени",
    category: "Гончарство та автентична кераміка",
    taxStatus: "ФОП 2-га група (ЄДРПОУ 31245678)",
    iban: "UA823052990000026001234567890",
    rating: 4.9,
    reviewCount: 18,
  },
  {
    handle: "berehynia",
    name: "Ткацтво Берегиня",
    category: "Ручне ткацтво та небілений льон",
    taxStatus: "ФОП 3-тя група (ЄДРПОУ 29876543)",
    iban: "UA553052990000026009876543210",
    rating: 5.0,
    reviewCount: 12,
  },
  {
    handle: "polissia",
    name: "Крафтова Різьба Полісся",
    category: "Вироби з сухостійного дуба та ясеня",
    taxStatus: "ФОП 2-га група (ЄДРПОУ 34567890)",
    iban: "UA123052990000026005556667778",
    rating: 4.8,
    reviewCount: 9,
  },
];

export function VendorDashboard() {
  const [selectedVendor, setSelectedVendor] = useState<string>("olena");
  const [activeTab, setActiveTab] = useState<
    "orders" | "finances" | "products" | "compliance"
  >("orders");
  const [ordersFilter, setOrdersFilter] = useState<string>("all");
  const [notification, setNotification] = useState<string | null>(null);

  const [allOrdersData, setAllOrdersData] = useState<{
    childOrders: VendorChildOrder[];
    settlements: SettlementBatchRecord[];
  }>({ childOrders: [], settlements: [] });

  const refreshData = () => {
    const parentOrders = SandboxOrderEngine.getAllOrders();
    const childOrders: VendorChildOrder[] = [];
    const settlements: SettlementBatchRecord[] = [];

    for (const parent of parentOrders) {
      const details = SandboxOrderEngine.getOrder(parent.orderNumber);
      childOrders.push(...details.childOrders);
      settlements.push(...details.settlements);
    }

    setAllOrdersData({ childOrders, settlements });
  };

  useEffect(() => {
    refreshData();
  }, []);

  const currentVendor =
    VENDOR_PROFILES.find((v) => v.handle === selectedVendor) ||
    VENDOR_PROFILES[0]!;

  // Filter child orders for the selected workshop
  const vendorOrders = useMemo(() => {
    return allOrdersData.childOrders.filter(
      (o) => o.vendorHandle === currentVendor.handle,
    );
  }, [allOrdersData.childOrders, currentVendor.handle]);

  // Filter settlements for the selected workshop
  const vendorSettlements = useMemo(() => {
    return allOrdersData.settlements.filter(
      (s) => s.vendorHandle === currentVendor.handle,
    );
  }, [allOrdersData.settlements, currentVendor.handle]);

  // Financial calculations
  const totalGmv = useMemo(
    () => vendorOrders.reduce((sum, o) => sum + o.subtotalUah, 0),
    [vendorOrders],
  );

  const totalCommission = useMemo(
    () => vendorOrders.reduce((sum, o) => sum + o.platformCommissionUah, 0),
    [vendorOrders],
  );

  const totalSettled = useMemo(
    () => vendorSettlements.reduce((sum, s) => sum + s.payoutAmountUah, 0),
    [vendorSettlements],
  );

  const totalInEscrow = useMemo(() => {
    return vendorOrders
      .filter((o) => o.status !== "delivered" && o.status !== "settled")
      .reduce((sum, o) => sum + o.vendorPayoutUah, 0);
  }, [vendorOrders]);

  const filteredOrders = useMemo(() => {
    if (ordersFilter === "pending")
      return vendorOrders.filter((o) => o.status === "pending");
    if (ordersFilter === "shipped")
      return vendorOrders.filter((o) => o.status === "shipped");
    if (ordersFilter === "delivered")
      return vendorOrders.filter(
        (o) => o.status === "delivered" || o.status === "settled",
      );
    return vendorOrders;
  }, [vendorOrders, ordersFilter]);

  const handleUpdateStatus = (
    childOrderId: string,
    newStatus: NovaPoshtaTrackingStatus,
  ) => {
    const res = SandboxOrderEngine.updateTrackingStatus(
      childOrderId,
      newStatus,
    );
    refreshData();

    if (newStatus === 9) {
      setNotification(
        `🎉 Посилку вручено покупцю! Автоматично нараховано виплату ${hryvniaFormatter.format(res.childOrder?.vendorPayoutUah || 0)} на IBAN ${currentVendor.iban}.`,
      );
    } else {
      setNotification(
        `Оновлено статус ТТН на: «${NOVA_POSHTA_STATUS_MAP[newStatus]}»`,
      );
    }
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div
      className="page-shell page-section"
      style={{ maxWidth: "1150px", margin: "0 auto", padding: "2rem 1rem" }}
    >
      {/* Header with Workshop Selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1.5rem",
          marginBottom: "2rem",
          backgroundColor: "#fff",
          padding: "1.5rem",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-sand-200)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.25rem",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>🌿</span>
            <h1
              style={{
                fontSize: "1.75rem",
                margin: 0,
                color: "var(--color-pine-900)",
              }}
            >
              Кабінет Майстра
            </h1>
            <span
              style={{
                padding: "0.25rem 0.6rem",
                borderRadius: "12px",
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor: "#e6f4ea",
                color: "#137333",
              }}
            >
              ✓ Перевірена майстерня
            </span>
          </div>
          <p
            style={{
              color: "var(--color-ink-muted)",
              margin: 0,
              fontSize: "0.95rem",
            }}
          >
            Керування замовленнями, ТТН Нової Пошти та прямими виплатами на IBAN
          </p>
        </div>

        {/* Workshop Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label
            htmlFor="vendor-selector"
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--color-ink-muted)",
            }}
          >
            Обрана майстерня:
          </label>
          <select
            id="vendor-selector"
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            style={{
              padding: "0.5rem 0.85rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-sand-200)",
              backgroundColor: "var(--color-sand-100)",
              fontWeight: 600,
              color: "var(--color-pine-900)",
              cursor: "pointer",
            }}
          >
            {VENDOR_PROFILES.map((v) => (
              <option key={v.handle} value={v.handle}>
                {v.name} ({v.category})
              </option>
            ))}
          </select>
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

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "2px solid var(--color-sand-200)",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          style={{
            padding: "0.75rem 1.25rem",
            fontWeight: 600,
            fontSize: "0.95rem",
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom:
              activeTab === "orders"
                ? "3px solid var(--color-pine-900)"
                : "3px solid transparent",
            color:
              activeTab === "orders"
                ? "var(--color-pine-900)"
                : "var(--color-ink-muted)",
          }}
        >
          📦 Замовлення та відправки ({vendorOrders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("finances")}
          style={{
            padding: "0.75rem 1.25rem",
            fontWeight: 600,
            fontSize: "0.95rem",
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom:
              activeTab === "finances"
                ? "3px solid var(--color-pine-900)"
                : "3px solid transparent",
            color:
              activeTab === "finances"
                ? "var(--color-pine-900)"
                : "var(--color-ink-muted)",
          }}
        >
          💰 Фінанси та виплати ({hryvniaFormatter.format(totalSettled)})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("products")}
          style={{
            padding: "0.75rem 1.25rem",
            fontWeight: 600,
            fontSize: "0.95rem",
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom:
              activeTab === "products"
                ? "3px solid var(--color-pine-900)"
                : "3px solid transparent",
            color:
              activeTab === "products"
                ? "var(--color-pine-900)"
                : "var(--color-ink-muted)",
          }}
        >
          🏺 Товари майстерні
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("compliance")}
          style={{
            padding: "0.75rem 1.25rem",
            fontWeight: 600,
            fontSize: "0.95rem",
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom:
              activeTab === "compliance"
                ? "3px solid var(--color-pine-900)"
                : "3px solid transparent",
            color:
              activeTab === "compliance"
                ? "var(--color-pine-900)"
                : "var(--color-ink-muted)",
          }}
        >
          📜 Комплаєнс та оферти
        </button>
      </div>

      {/* Tab 1: Orders & Logistics */}
      {activeTab === "orders" && (
        <div>
          {/* Sub-filter */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.4rem",
                backgroundColor: "var(--color-sand-100)",
                padding: "0.25rem",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <button
                type="button"
                onClick={() => setOrdersFilter("all")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.85rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor:
                    ordersFilter === "all" ? "#fff" : "transparent",
                  fontWeight: ordersFilter === "all" ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                Всі ({vendorOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setOrdersFilter("pending")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.85rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor:
                    ordersFilter === "pending" ? "#fff" : "transparent",
                  fontWeight: ordersFilter === "pending" ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                Очікують відправки
              </button>
              <button
                type="button"
                onClick={() => setOrdersFilter("shipped")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.85rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor:
                    ordersFilter === "shipped" ? "#fff" : "transparent",
                  fontWeight: ordersFilter === "shipped" ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                Прямують (НП)
              </button>
              <button
                type="button"
                onClick={() => setOrdersFilter("delivered")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.85rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor:
                    ordersFilter === "delivered" ? "#fff" : "transparent",
                  fontWeight: ordersFilter === "delivered" ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                Вручені покупцю
              </button>
            </div>

            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--color-ink-muted)",
              }}
            >
              Прямий договір з Новою Поштою:{" "}
              <strong>Підключено (API v2.0)</strong>
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div
              style={{
                backgroundColor: "#fff",
                padding: "3rem",
                textAlign: "center",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-sand-200)",
                color: "var(--color-ink-muted)",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
                📦
              </div>
              <h3>Немає замовлень у цій категорії</h3>
              <p style={{ fontSize: "0.9rem" }}>
                Нові замовлення покупців автоматично з'являтимуться тут.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {filteredOrders.map((order) => {
                const isDelivered =
                  order.status === "delivered" || order.status === "settled";

                return (
                  <div
                    key={order.id}
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-sand-200)",
                      padding: "1.5rem",
                      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        paddingBottom: "1rem",
                        borderBottom: "1px solid var(--color-sand-200)",
                        marginBottom: "1rem",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--color-ink-muted)",
                          }}
                        >
                          Відправлення #{order.id} • Замовлення клієнта:
                        </span>
                        <Link
                          href={`/orders/${order.parentOrderNumber}`}
                          style={{
                            fontWeight: 700,
                            color: "var(--color-pine-900)",
                            marginLeft: "0.4rem",
                            textDecoration: "none",
                          }}
                        >
                          #{order.parentOrderNumber}
                        </Link>
                      </div>

                      <span
                        style={{
                          padding: "0.3rem 0.75rem",
                          borderRadius: "12px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          backgroundColor: isDelivered ? "#e6f4ea" : "#fef7e0",
                          color: isDelivered ? "#137333" : "#b06000",
                        }}
                      >
                        {order.trackingStatusName}
                      </span>
                    </div>

                    {/* Content Items */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                        }}
                      >
                        {order.items.map((it) => (
                          <div
                            key={it.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.9rem",
                              padding: "0.4rem 0.6rem",
                              backgroundColor: "var(--color-sand-50)",
                              borderRadius: "var(--radius-sm)",
                            }}
                          >
                            <span>
                              <strong>{it.name}</strong> × {it.quantity}
                            </span>
                            <span style={{ fontWeight: 600 }}>
                              {hryvniaFormatter.format(
                                it.priceUah * it.quantity,
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial split */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "1rem",
                        padding: "0.75rem 1rem",
                        backgroundColor: "var(--color-sand-100)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.85rem",
                        marginBottom: "1rem",
                      }}
                    >
                      <div>
                        Сума посилки:{" "}
                        <strong>
                          {hryvniaFormatter.format(order.subtotalUah)}
                        </strong>
                      </div>
                      <div>
                        Комісія платформи (10%):{" "}
                        <span style={{ color: "var(--color-terracotta-500)" }}>
                          -
                          {hryvniaFormatter.format(order.platformCommissionUah)}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.95rem" }}>
                        До виплати майстру (90%):{" "}
                        <strong style={{ color: "var(--color-pine-900)" }}>
                          {hryvniaFormatter.format(order.vendorPayoutUah)}
                        </strong>
                      </div>
                    </div>

                    {/* Logistics & Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px dashed var(--color-sand-200)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span>🚚</span>
                        <span style={{ fontSize: "0.85rem" }}>
                          ТТН Нової Пошти:{" "}
                          <strong>{order.trackingNumber}</strong>
                        </span>
                      </div>

                      {/* Status management buttons */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, 4)}
                          disabled={order.trackingStatusCode >= 4}
                          className="button button--secondary"
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.8rem",
                            cursor:
                              order.trackingStatusCode >= 4
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          Передати перевізнику (4)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, 7)}
                          disabled={order.trackingStatusCode >= 7}
                          className="button button--secondary"
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.8rem",
                            cursor:
                              order.trackingStatusCode >= 7
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          Прибуло у відділення (7)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, 9)}
                          disabled={order.trackingStatusCode === 9}
                          className="button button--primary"
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.8rem",
                            backgroundColor:
                              order.trackingStatusCode === 9
                                ? "#137333"
                                : "var(--color-terracotta-500)",
                            color: "#fff",
                            cursor:
                              order.trackingStatusCode === 9
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {order.trackingStatusCode === 9
                            ? "✓ Вручено (Виплачено)"
                            : "Вручено покупцю (9)"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Finances & Settlement Ledger */}
      {activeTab === "finances" && (
        <div>
          {/* Financial Metric Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-sand-200)",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-ink-muted)",
                  marginBottom: "0.25rem",
                }}
              >
                Загальний виторг майстерні:
              </div>
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  color: "var(--color-pine-900)",
                }}
              >
                {hryvniaFormatter.format(totalGmv)}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fff",
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-sand-200)",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-ink-muted)",
                  marginBottom: "0.25rem",
                }}
              >
                Комісія маркетплейсу (10%):
              </div>
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  color: "var(--color-terracotta-500)",
                }}
              >
                {hryvniaFormatter.format(totalCommission)}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fff",
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-sand-200)",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-ink-muted)",
                  marginBottom: "0.25rem",
                }}
              >
                Виплачено на IBAN (Settled):
              </div>
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  color: "#137333",
                }}
              >
                {hryvniaFormatter.format(totalSettled)}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fff",
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-sand-200)",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-ink-muted)",
                  marginBottom: "0.25rem",
                }}
              >
                В Escrow-холді (очікує вручення):
              </div>
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  color: "#1a73e8",
                }}
              >
                {hryvniaFormatter.format(totalInEscrow)}
              </div>
            </div>
          </div>

          {/* Settlement Batches Table */}
          <div
            style={{
              backgroundColor: "#fff",
              padding: "1.5rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-sand-200)",
            }}
          >
            <h3
              style={{
                fontSize: "1.15rem",
                margin: "0 0 1rem 0",
                color: "var(--color-pine-900)",
              }}
            >
              Реєстр банківських виплат (Settlement Batches)
            </h3>

            {vendorSettlements.length === 0 ? (
              <p
                style={{
                  color: "var(--color-ink-muted)",
                  fontSize: "0.9rem",
                  margin: 0,
                }}
              >
                Ще немає завершених виплат. Виплати формуються автоматично при
                отриманні посилок покупцями.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {vendorSettlements.map((batch) => (
                  <div
                    key={batch.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.85rem 1rem",
                      backgroundColor: "#f6faf6",
                      border: "1px solid #ceead6",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        Виплата #{batch.id}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--color-ink-muted)",
                          marginTop: "2px",
                        }}
                      >
                        Одержувач: {batch.vendorName} • IBAN: {batch.iban}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "1.1rem",
                          color: "#137333",
                        }}
                      >
                        +{hryvniaFormatter.format(batch.payoutAmountUah)}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-ink-muted)",
                        }}
                      >
                        Комісія:{" "}
                        {hryvniaFormatter.format(batch.commissionAmountUah)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Products */}
      {activeTab === "products" && (
        <div
          style={{
            backgroundColor: "#fff",
            padding: "1.5rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-sand-200)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  margin: "0 0 0.25rem 0",
                  color: "var(--color-pine-900)",
                }}
              >
                Товари майстерні «{currentVendor.name}»
              </h3>
              <p
                style={{
                  color: "var(--color-ink-muted)",
                  margin: 0,
                  fontSize: "0.85rem",
                }}
              >
                Керуйте наявністю, переглядайте статус модерації та додавайте
                нові позиції
              </p>
            </div>

            <Link
              href="/vendor/products/new"
              className="button button-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                backgroundColor: "var(--color-terracotta-500)",
                color: "#fff",
                textDecoration: "none",
                padding: "0.6rem 1rem",
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
              }}
            >
              <span>+</span>
              <span>Додати новий виріб</span>
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            <div
              style={{
                border: "1px solid var(--color-sand-200)",
                borderRadius: "var(--radius-sm)",
                padding: "1rem",
                backgroundColor: "var(--color-sand-50)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "0.5rem",
                }}
              >
                <h4 style={{ margin: 0, color: "var(--color-pine-900)" }}>
                  Чашка «Ранок»
                </h4>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.5rem",
                    backgroundColor: "#e6f4ea",
                    color: "#137333",
                    borderRadius: "8px",
                    fontWeight: 600,
                  }}
                >
                  ✓ Опубліковано
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-ink-muted)",
                  marginBottom: "0.75rem",
                }}
              >
                Автентична керамічна чашка з молочінням
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong style={{ color: "var(--color-pine-900)" }}>
                  420 ₴
                </strong>
                <Link
                  href="/catalog/dim/chashka-ranok"
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-pine-900)",
                  }}
                >
                  Переглянути на вітрині →
                </Link>
              </div>
            </div>

            <div
              style={{
                border: "1px solid var(--color-sand-200)",
                borderRadius: "var(--radius-sm)",
                padding: "1rem",
                backgroundColor: "var(--color-sand-50)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "0.5rem",
                }}
              >
                <h4 style={{ margin: 0, color: "var(--color-pine-900)" }}>
                  Керамічна ваза «Гуцульська Ружа»
                </h4>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.5rem",
                    backgroundColor: "#fef7e0",
                    color: "#b06000",
                    borderRadius: "8px",
                    fontWeight: 600,
                  }}
                >
                  ⏳ На модерації
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-ink-muted)",
                  marginBottom: "0.75rem",
                }}
              >
                Рельєфна ваза ручного ліплення з карпатської глини
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong style={{ color: "var(--color-pine-900)" }}>
                  890 ₴
                </strong>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Очікує перевірки модератором
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Compliance */}
      {activeTab === "compliance" && (
        <div
          style={{
            backgroundColor: "#fff",
            padding: "1.5rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-sand-200)",
          }}
        >
          <h3
            style={{
              fontSize: "1.2rem",
              margin: "0 0 1rem 0",
              color: "var(--color-pine-900)",
            }}
          >
            Юридичні реквізити та комплаєнс-статус
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
            }}
          >
            <div
              style={{
                padding: "1rem",
                backgroundColor: "var(--color-sand-50)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-sand-200)",
              }}
            >
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>
                Податкова реєстрація
              </h4>
              <div style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
                <div>
                  Суб'єкт: <strong>{currentVendor.name}</strong>
                </div>
                <div>
                  Податковий статус: <strong>{currentVendor.taxStatus}</strong>
                </div>
                <div>
                  IBAN для виплат: <strong>{currentVendor.iban}</strong>
                </div>
                <div style={{ color: "#137333", marginTop: "4px" }}>
                  ✓ Ідентифікація пройдена
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "1rem",
                backgroundColor: "var(--color-sand-50)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-sand-200)",
              }}
            >
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>
                Агентський договір приєднання
              </h4>
              <div style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
                <div>
                  Модель: <strong>Комерційний повірений (ст. 295 ГКУ)</strong>
                </div>
                <div>
                  Ставка комісії: <strong>10% від вартості товару</strong>
                </div>
                <div>
                  Умови повернення:{" "}
                  <strong>14 днів (ЗУ «Про захист прав споживачів»)</strong>
                </div>
                <div style={{ color: "#137333", marginTop: "4px" }}>
                  ✓ Оферту акцептовано
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
