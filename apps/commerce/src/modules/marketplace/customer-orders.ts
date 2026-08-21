import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import type {
  CustomerOrderDTO,
  CustomerOrderListDTO,
  CustomerOrderLineDTO,
  CustomerShipmentDTO,
  FulfillmentStatus,
  OrderLifecycleStatus,
  PaymentStatus,
  PayoutStatus,
  ProductReviewDTO,
  ProductReviewSummaryDTO,
  ProductReviewsDTO,
  TrackingEventDTO,
} from "@life/types";

export type MarketplaceRecord = Record<string, unknown>;

export const POSTGRES_INTEGER_MAX = 2_147_483_647;

const SyntheticOrderLineSchema = z
  .object({
    catalogListingId: z.string().min(1).max(128).nullable().optional(),
    productId: z.string().min(1).max(128),
    vendorId: z.string().min(1).max(128),
    productName: z.string().trim().min(1).max(200),
    unitPriceUah: z
      .number()
      .int()
      .nonnegative()
      .max(POSTGRES_INTEGER_MAX)
      .safe(),
    quantity: z.number().int().min(1).max(100),
  })
  .strict();

export const SyntheticOrderCreateInputSchema = z
  .object({
    customerId: z.string().min(1).max(128),
    orderNumber: z.string().regex(/^SYN-[A-Za-z0-9-]{3,100}$/),
    initialFulfillmentStatus: z.enum(["pending", "delivered"]).optional(),
    items: z.array(SyntheticOrderLineSchema).min(1).max(100),
  })
  .strict();

export type SyntheticOrderCreateInput = z.infer<
  typeof SyntheticOrderCreateInputSchema
>;

export type SyntheticOrderCreateResult = Readonly<{
  parentOrder: MarketplaceRecord;
  childOrders: readonly MarketplaceRecord[];
  orderLines: readonly MarketplaceRecord[];
}>;

export type CustomerOrderWriterService = {
  createParentOrders: (
    data: MarketplaceRecord,
    sharedContext?: unknown,
  ) => Promise<MarketplaceRecord>;
  createVendorChildOrders: (
    data: MarketplaceRecord,
    sharedContext?: unknown,
  ) => Promise<MarketplaceRecord>;
  createOrderLines: (
    data: MarketplaceRecord,
    sharedContext?: unknown,
  ) => Promise<MarketplaceRecord>;
  createShipments: (
    data: MarketplaceRecord,
    sharedContext?: unknown,
  ) => Promise<MarketplaceRecord>;
  createTrackingEvents: (
    data: MarketplaceRecord,
    sharedContext?: unknown,
  ) => Promise<MarketplaceRecord>;
  createAuditEvents: (
    data: MarketplaceRecord,
    sharedContext?: unknown,
  ) => Promise<MarketplaceRecord>;
};

export type CustomerOrderReaderService = {
  listParentOrders: (
    query: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<MarketplaceRecord[]>;
  listVendorChildOrders: (
    query: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<MarketplaceRecord[]>;
  listOrderLines: (
    query: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<MarketplaceRecord[]>;
  listShipments: (
    query: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<MarketplaceRecord[]>;
  listTrackingEvents: (
    query: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<MarketplaceRecord[]>;
  listProductReviews: (
    query: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<MarketplaceRecord[]>;
  retrieveVendor: (id: string) => Promise<MarketplaceRecord | null>;
};

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

function lifecycleStatus(record: MarketplaceRecord): OrderLifecycleStatus {
  const value = asString(record["lifecycle_status"] || record["status"]);
  if (value === "processing" || value === "paid") return "processing";
  if (value === "partially_fulfilled") return "partially_fulfilled";
  if (value === "completed") return "completed";
  if (value === "cancelled" || value === "canceled" || value === "refunded") {
    return "cancelled";
  }
  return "pending";
}

function paymentStatus(record: MarketplaceRecord): PaymentStatus {
  const value = asString(record["payment_status"]);
  if (
    value === "pending" ||
    value === "authorized" ||
    value === "captured" ||
    value === "refunded"
  ) {
    return value;
  }
  return "not_applicable";
}

function payoutStatus(record: MarketplaceRecord): PayoutStatus {
  const value = asString(record["payout_status"]);
  if (value === "pending" || value === "settled" || value === "reversed") {
    return value;
  }
  return "not_applicable";
}

function fulfillmentStatus(record: MarketplaceRecord): FulfillmentStatus {
  const value = asString(record["fulfillment_status"] || record["status"]);
  if (value === "accepted") return "accepted";
  if (value === "shipped") return "shipped";
  if (value === "delivered" || value === "settled") return "delivered";
  if (value === "returned") return "returned";
  if (value === "cancelled" || value === "canceled") return "cancelled";
  return "pending";
}

function trackingStatus(record: MarketplaceRecord): TrackingEventDTO["status"] {
  const value = asString(record["normalized_status"]);
  if (
    value === "in_transit" ||
    value === "delivered" ||
    value === "returned" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "created";
}

function mapTrackingEvent(record: MarketplaceRecord): TrackingEventDTO {
  return {
    id: asString(record["id"]),
    status: trackingStatus(record),
    label: asString(record["label"], "Статус відправлення оновлено"),
    occurredAt: asString(record["occurred_at"], new Date(0).toISOString()),
    source: record["source"] === "provider" ? "provider" : "synthetic",
  };
}

function mapLine(
  record: MarketplaceRecord,
  child: MarketplaceRecord,
  hasReview: boolean,
): CustomerOrderLineDTO {
  const childStatus = fulfillmentStatus(child);
  const eligible = childStatus === "delivered" && !hasReview;

  return {
    orderLineId: asString(record["id"]),
    productId: asString(record["product_id"]),
    ...(record["catalog_listing_id"]
      ? { catalogListingId: asString(record["catalog_listing_id"]) }
      : {}),
    vendorId: asString(record["vendor_id"] || child["vendor_id"]),
    productName: asString(record["product_name_snapshot"], "Виріб"),
    quantity: asNumber(record["quantity"], 1),
    unitPriceUah: asNumber(record["unit_price_uah"]),
    lineTotalUah: asNumber(record["line_total_uah"]),
    reviewEligibility: eligible
      ? { eligible: true }
      : {
          eligible: false,
          reason: hasReview ? "review_exists" : "not_delivered",
        },
  };
}

export async function readCustomerOrders(
  service: CustomerOrderReaderService,
  customerId: string,
): Promise<CustomerOrderListDTO> {
  const parents = (
    await service.listParentOrders(
      { customer_id: customerId, mode: "synthetic" },
      { order: { created_at: "DESC" } },
    )
  ).filter((parent) => parent["mode"] === "synthetic");
  const orders: CustomerOrderDTO[] = [];

  for (const parent of parents) {
    const parentId = asString(parent["id"]);
    const childOrders = await service.listVendorChildOrders({
      parent_order_id: parentId,
    });
    const shipments: CustomerShipmentDTO[] = [];

    for (const child of childOrders) {
      const childId = asString(child["id"]);
      const vendorId = asString(child["vendor_id"]);
      const vendor = vendorId ? await service.retrieveVendor(vendorId) : null;
      const lines = await service.listOrderLines({ child_order_id: childId });
      const childShipments = await service.listShipments({
        child_order_id: childId,
        source: "synthetic",
      });
      const mappedLines: CustomerOrderLineDTO[] = [];

      for (const line of lines) {
        const reviews = await service.listProductReviews({
          order_line_id: asString(line["id"]),
        });
        mappedLines.push(mapLine(line, child, reviews.length > 0));
      }

      if (childShipments.length === 0) {
        shipments.push({
          childOrderId: childId,
          vendor: {
            id: vendorId,
            name: asString(vendor?.["name"], "Майстерня"),
          },
          fulfillmentStatus: fulfillmentStatus(child),
          tracking: {
            carrier: "nova_poshta",
            status: "created",
            ttnNumber: child["ttn_number"]
              ? asString(child["ttn_number"])
              : null,
            events: [],
          },
          lines: mappedLines,
        });
      }

      for (const shipment of childShipments) {
        const shipmentId = asString(shipment["id"]);
        const events = await service.listTrackingEvents({
          shipment_id: shipmentId,
          source: "synthetic",
        });
        const mappedEvents = events
          .map(mapTrackingEvent)
          .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
        const lastEvent = mappedEvents.at(-1);

        shipments.push({
          childOrderId: childId,
          vendor: {
            id: vendorId,
            name: asString(vendor?.["name"], "Майстерня"),
          },
          fulfillmentStatus: fulfillmentStatus(child),
          tracking: {
            carrier: "nova_poshta",
            ttnNumber: shipment["ttn_number"]
              ? asString(shipment["ttn_number"])
              : null,
            status: lastEvent?.status || "created",
            events: mappedEvents,
          },
          lines: mappedLines,
        });
      }
    }

    orders.push({
      id: parentId,
      mode: "synthetic",
      orderNumber: asString(parent["order_number"], parentId),
      lifecycleStatus: lifecycleStatus(parent),
      paymentStatus: paymentStatus(parent),
      payoutStatus: payoutStatus(parent),
      createdAt: asString(parent["created_at"], new Date(0).toISOString()),
      totalUah: asNumber(parent["total_amount_uah"]),
      shipments,
    });
  }

  return { orders, nextCursor: null };
}

export async function createSyntheticOrder(
  service: CustomerOrderWriterService,
  input: SyntheticOrderCreateInput,
  sharedContext?: unknown,
): Promise<SyntheticOrderCreateResult> {
  assertSyntheticOrderCreationAllowed();
  const parsed = SyntheticOrderCreateInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Синтетичне замовлення має містити коректні позиції каталогу.",
    );
  }

  const groups = new Map<string, (typeof parsed.data.items)[number][]>();
  const initialFulfillmentStatus =
    parsed.data.initialFulfillmentStatus || "pending";
  const isDelivered = initialFulfillmentStatus === "delivered";
  let totalAmountUah = 0;
  for (const item of parsed.data.items) {
    const lineTotalUah = item.unitPriceUah * item.quantity;
    if (
      !Number.isSafeInteger(lineTotalUah) ||
      lineTotalUah > POSTGRES_INTEGER_MAX
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Сума позиції синтетичного замовлення перевищує ліміт сховища.",
      );
    }
    totalAmountUah += lineTotalUah;
    if (
      !Number.isSafeInteger(totalAmountUah) ||
      totalAmountUah > POSTGRES_INTEGER_MAX
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Загальна сума синтетичного замовлення перевищує ліміт сховища.",
      );
    }
    const vendorItems = groups.get(item.vendorId) || [];
    vendorItems.push(item);
    groups.set(item.vendorId, vendorItems);
  }

  const parentOrder = await service.createParentOrders(
    {
      customer_id: parsed.data.customerId,
      order_number: parsed.data.orderNumber,
      mode: "synthetic",
      status: "pending",
      lifecycle_status: isDelivered ? "completed" : "pending",
      payment_status: "not_applicable",
      payout_status: "not_applicable",
      total_amount_uah: totalAmountUah,
      payment_transaction_id: null,
    },
    sharedContext,
  );
  const parentOrderId = asString(parentOrder["id"]);
  if (!parentOrderId) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Не вдалося створити батьківське синтетичне замовлення.",
    );
  }

  const childOrders: MarketplaceRecord[] = [];
  const orderLines: MarketplaceRecord[] = [];
  for (const [vendorId, items] of groups) {
    const grossAmountUah = items.reduce(
      (sum, item) => sum + item.unitPriceUah * item.quantity,
      0,
    );
    const childOrder = await service.createVendorChildOrders(
      {
        parent_order_id: parentOrderId,
        vendor_id: vendorId,
        gross_amount_uah: grossAmountUah,
        commission_amount_uah: 0,
        net_payable_uah: 0,
        status: isDelivered ? "delivered" : "pending",
        ttn_number: null,
        fulfillment_status: isDelivered ? "delivered" : "pending",
        payout_status: "not_applicable",
      },
      sharedContext,
    );
    const childOrderId = asString(childOrder["id"]);
    if (!childOrderId) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Не вдалося створити дочірнє синтетичне замовлення.",
      );
    }
    childOrders.push(childOrder);

    for (const item of items) {
      orderLines.push(
        await service.createOrderLines(
          {
            child_order_id: childOrderId,
            parent_order_id: parentOrderId,
            vendor_id: item.vendorId,
            product_id: item.productId,
            catalog_listing_id: item.catalogListingId || null,
            product_name_snapshot: item.productName,
            unit_price_uah: item.unitPriceUah,
            quantity: item.quantity,
            line_total_uah: item.unitPriceUah * item.quantity,
          },
          sharedContext,
        ),
      );
    }

    const shipment = await service.createShipments(
      {
        child_order_id: childOrderId,
        carrier: "nova_poshta",
        external_reference: null,
        ttn_number: null,
        source: "synthetic",
        normalized_status: isDelivered ? "delivered" : "created",
        last_synced_at: new Date(),
      },
      sharedContext,
    );
    const shipmentId = asString(shipment["id"]);
    if (!shipmentId) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Не вдалося створити синтетичний запис доставки.",
      );
    }
    await service.createTrackingEvents(
      {
        shipment_id: shipmentId,
        provider_status_code: null,
        normalized_status: isDelivered ? "delivered" : "created",
        label: isDelivered
          ? "Синтетичну доставку завершено"
          : "Синтетичне замовлення створено",
        occurred_at: new Date(),
        source: "synthetic",
        payload_hash: null,
      },
      sharedContext,
    );
  }

  await service.createAuditEvents(
    {
      actor_id: parsed.data.customerId,
      actor_type: "customer",
      action: "order.synthetic_created",
      tenant_id: null,
      listing_id: null,
      correlation_id: null,
      payload: {
        order_id: parentOrderId,
        item_count: parsed.data.items.length,
        vendor_count: groups.size,
        initial_fulfillment_status: initialFulfillmentStatus,
      },
    },
    sharedContext,
  );

  return { parentOrder, childOrders, orderLines };
}

export function mapApprovedProductReviews(
  records: readonly MarketplaceRecord[],
): ProductReviewsDTO {
  const approved = records.filter(
    (record) =>
      record["status"] === "approved" && record["mode"] === "synthetic",
  );
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;

  const reviews: ProductReviewDTO[] = approved.map((record) => {
    const rating = Math.min(
      5,
      Math.max(1, Math.round(asNumber(record["rating"], 1))),
    ) as 1 | 2 | 3 | 4 | 5;
    breakdown[rating] += 1;
    total += rating;
    return {
      id: asString(record["id"]),
      productId: asString(record["product_id"]),
      vendorId: asString(record["vendor_id"]),
      displayName: asString(record["display_name"], "Перевірений покупець"),
      rating,
      body: asString(record["body"]),
      verifiedPurchase: true,
      status: "approved",
      createdAt: asString(record["created_at"], new Date(0).toISOString()),
    };
  });

  const summary: ProductReviewSummaryDTO = {
    averageRating:
      reviews.length > 0
        ? Math.round((total / reviews.length) * 10) / 10
        : null,
    totalReviews: reviews.length,
    ratingBreakdown: breakdown,
  };

  return { reviews, summary };
}

export function assertSyntheticOrderCreationAllowed(): void {
  if (!isSyntheticDataAllowed()) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Створення синтетичних замовлень дозволене лише в development/test із явним прапорцем.",
    );
  }
}

export function isSyntheticDataAllowed(): boolean {
  const env = process.env["NODE_ENV"];
  return (
    (env === "development" || env === "test") &&
    process.env["ALLOW_SYNTHETIC_ORDERS"] === "true"
  );
}

export function isReviewBodySafe(body: string): boolean {
  return (
    body.trim().length >= 3 &&
    body.trim().length <= 5000 &&
    !/<script\b/i.test(body)
  );
}

export function isFinitePositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isSyntheticReviewsAllowed(): boolean {
  const env = process.env["NODE_ENV"];
  return (
    (env === "development" || env === "test") &&
    process.env["ALLOW_SYNTHETIC_REVIEWS"] === "true"
  );
}
