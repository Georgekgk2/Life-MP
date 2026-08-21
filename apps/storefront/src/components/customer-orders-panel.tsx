"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import type { CustomerOrderDTO } from "@life/types";
import { formatHryvnia } from "@/formatters";

const CustomerOrderLineSchema = z
  .object({
    orderLineId: z.string().min(1),
    productId: z.string().min(1),
    catalogListingId: z.string().min(1).optional(),
    vendorId: z.string().min(1),
    productName: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPriceUah: z.number().int().nonnegative(),
    lineTotalUah: z.number().int().nonnegative(),
    reviewEligibility: z.union([
      z.object({ eligible: z.literal(true) }).strict(),
      z
        .object({
          eligible: z.literal(false),
          reason: z.enum([
            "not_delivered",
            "review_exists",
            "not_authenticated",
            "unavailable",
          ]),
        })
        .strict(),
    ]),
  })
  .strict();

const TrackingEventSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum([
      "created",
      "in_transit",
      "delivered",
      "returned",
      "cancelled",
    ]),
    label: z.string().min(1),
    occurredAt: z.string().min(1),
    source: z.enum(["synthetic", "provider"]),
  })
  .strict();

const CustomerShipmentSchema = z
  .object({
    childOrderId: z.string().min(1),
    vendor: z
      .object({ id: z.string().min(1), name: z.string().min(1) })
      .strict(),
    fulfillmentStatus: z.enum([
      "pending",
      "accepted",
      "shipped",
      "delivered",
      "returned",
      "cancelled",
    ]),
    tracking: z
      .object({
        carrier: z.literal("nova_poshta"),
        ttnNumber: z.string().min(1).nullable(),
        status: z.enum([
          "created",
          "in_transit",
          "delivered",
          "returned",
          "cancelled",
        ]),
        events: z.array(TrackingEventSchema),
      })
      .strict(),
    lines: z.array(CustomerOrderLineSchema),
  })
  .strict();

const CustomerOrderSchema = z
  .object({
    id: z.string().min(1),
    orderNumber: z.string().min(1),
    mode: z.literal("synthetic"),
    lifecycleStatus: z.enum([
      "pending",
      "processing",
      "partially_fulfilled",
      "completed",
      "cancelled",
    ]),
    paymentStatus: z.enum([
      "not_applicable",
      "pending",
      "authorized",
      "captured",
      "refunded",
    ]),
    payoutStatus: z.enum(["not_applicable", "pending", "settled", "reversed"]),
    createdAt: z.string().min(1),
    totalUah: z.number().int().nonnegative(),
    shipments: z.array(CustomerShipmentSchema),
  })
  .strict();

const CustomerOrderResponseSchema = z
  .object({
    orders: z.array(CustomerOrderSchema),
    next_cursor: z.string().nullable(),
  })
  .strict();

type ParsedCustomerOrder = z.infer<typeof CustomerOrderSchema>;

type OrdersState =
  | { kind: "loading" }
  | { kind: "ready"; orders: readonly ParsedCustomerOrder[] }
  | { kind: "unauthenticated" }
  | { kind: "unavailable" };

const statusLabels: Readonly<
  Record<CustomerOrderDTO["lifecycleStatus"], string>
> = {
  pending: "Очікує обробки",
  processing: "В обробці",
  partially_fulfilled: "Виконується частково",
  completed: "Завершено",
  cancelled: "Скасовано",
};

const fulfillmentLabels: Readonly<
  Record<CustomerOrderDTO["shipments"][number]["fulfillmentStatus"], string>
> = {
  pending: "Очікує відправлення",
  accepted: "Прийнято майстернею",
  shipped: "Відправлено",
  delivered: "Доставлено",
  returned: "Повернено",
  cancelled: "Скасовано",
};

function getBackendUrl(): string | null {
  const configuredValue = process.env["NEXT_PUBLIC_MEDUSA_API_URL"]?.trim();
  const value =
    configuredValue ||
    (process.env["NODE_ENV"] === "development"
      ? "http://127.0.0.1:9000"
      : null);
  return value ? value.replace(/\/+$/, "") : null;
}

function getPublishableKey(): string | null {
  const value = process.env["NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"]?.trim();
  return value || null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Дата недоступна"
    : new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(date);
}

export function CustomerOrdersPanel() {
  const [state, setState] = useState<OrdersState>({ kind: "loading" });

  useEffect(() => {
    const backendUrl = getBackendUrl();
    if (!backendUrl) {
      setState({ kind: "unavailable" });
      return;
    }

    const controller = new AbortController();
    const headers: Record<string, string> = {};
    const publishableKey = getPublishableKey();
    if (publishableKey) {
      headers["x-publishable-api-key"] = publishableKey;
    }

    void fetch(`${backendUrl}/store/customer/orders`, {
      credentials: "include",
      headers,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          setState({ kind: "unauthenticated" });
          return;
        }
        if (!response.ok) {
          setState({ kind: "unavailable" });
          return;
        }

        const parsed = CustomerOrderResponseSchema.safeParse(
          await response.json(),
        );
        if (!parsed.success) {
          setState({ kind: "unavailable" });
          return;
        }
        setState({ kind: "ready", orders: parsed.data.orders });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ kind: "unavailable" });
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <section
      aria-labelledby="customer-orders-title"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div>
        <h3
          id="customer-orders-title"
          style={{ fontSize: "1.2rem", margin: 0 }}
        >
          Моя серверна історія замовлень
        </h3>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "0.9rem" }}>
          Дані завантажуються лише з API, що перевіряє обліковий запис покупця.
          Чернетки браузера не є джерелом історії замовлень.
        </p>
      </div>

      {state.kind === "loading" && (
        <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
          <p>Завантаження серверної історії…</p>
        </div>
      )}

      {state.kind === "unauthenticated" && (
        <div className="notice" role="status">
          <p>
            Увійдіть до облікового запису покупця, щоб переглянути свої
            замовлення. Номер замовлення сам по собі не надає доступу.
          </p>
        </div>
      )}

      {state.kind === "unavailable" && (
        <div className="notice" role="status">
          <p>
            Серверна історія замовлень недоступна в цьому sandbox-режимі. Дані з
            локального сховища браузера тут не відображаються.
          </p>
        </div>
      )}

      {state.kind === "ready" && state.orders.length === 0 && (
        <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
          <p>Авторизованих замовлень поки немає.</p>
        </div>
      )}

      {state.kind === "ready" && state.orders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {state.orders.map((order) => (
            <article
              className="card"
              key={order.id}
              style={{ padding: "1.25rem" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                }}
              >
                <div>
                  <h4 style={{ margin: 0 }}>Замовлення #{order.orderNumber}</h4>
                  <p
                    style={{
                      color: "var(--color-ink-muted)",
                      margin: "0.25rem 0 0",
                    }}
                  >
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong>{formatHryvnia(order.totalUah)}</strong>
                  <p
                    style={{
                      color: "var(--color-ink-muted)",
                      margin: "0.25rem 0 0",
                    }}
                  >
                    {statusLabels[order.lifecycleStatus]}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  marginTop: "1rem",
                }}
              >
                {order.shipments.map((shipment) => (
                  <div
                    key={shipment.childOrderId}
                    style={{
                      borderTop: "1px solid var(--color-border)",
                      paddingTop: "0.75rem",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>{shipment.vendor.name}</strong> ·{" "}
                      {fulfillmentLabels[shipment.fulfillmentStatus]}
                    </p>
                    <ul
                      style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}
                    >
                      {shipment.lines.map((line) => (
                        <li key={line.orderLineId}>
                          {line.productName} × {line.quantity}
                          {line.reviewEligibility.eligible && (
                            <span
                              style={{
                                color: "var(--color-primary-strong)",
                                marginLeft: "0.5rem",
                              }}
                            >
                              Доступний відгук
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {shipment.tracking.events.length > 0 && (
                      <p
                        style={{
                          color: "var(--color-ink-muted)",
                          margin: "0.5rem 0 0",
                          fontSize: "0.85rem",
                        }}
                      >
                        Останній статус доставки:{" "}
                        {shipment.tracking.events.at(-1)?.label}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
