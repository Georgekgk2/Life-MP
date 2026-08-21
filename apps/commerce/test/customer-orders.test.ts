import { afterEach, describe, expect, it, vi } from "vitest";
import {
  POSTGRES_INTEGER_MAX,
  createSyntheticOrder,
  isReviewBodySafe,
  isSyntheticDataAllowed,
  isSyntheticReviewsAllowed,
  mapApprovedProductReviews,
  readCustomerOrders,
  type CustomerOrderReaderService,
  type CustomerOrderWriterService,
} from "../src/modules/marketplace/customer-orders";

describe("customer order and review contracts", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalOrdersFlag = process.env.ALLOW_SYNTHETIC_ORDERS;
  const originalReviewsFlag = process.env.ALLOW_SYNTHETIC_REVIEWS;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalOrdersFlag === undefined) {
      delete process.env.ALLOW_SYNTHETIC_ORDERS;
    } else {
      process.env.ALLOW_SYNTHETIC_ORDERS = originalOrdersFlag;
    }
    if (originalReviewsFlag === undefined) {
      delete process.env.ALLOW_SYNTHETIC_REVIEWS;
    } else {
      process.env.ALLOW_SYNTHETIC_REVIEWS = originalReviewsFlag;
    }
  });

  it("fails closed for synthetic orders outside development/test", () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_SYNTHETIC_ORDERS = "true";
    expect(isSyntheticDataAllowed()).toBe(false);

    process.env.NODE_ENV = "test";
    expect(isSyntheticDataAllowed()).toBe(true);
  });

  it("does not write synthetic orders in production even when a flag leaks", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_SYNTHETIC_ORDERS = "true";
    const createParentOrders = vi.fn();
    const service = {
      createParentOrders,
      createVendorChildOrders: vi.fn(),
      createOrderLines: vi.fn(),
      createShipments: vi.fn(),
      createTrackingEvents: vi.fn(),
      createAuditEvents: vi.fn(),
    } satisfies CustomerOrderWriterService;

    await expect(
      createSyntheticOrder(service, {
        customerId: "customer-1",
        orderNumber: "SYN-PRODUCTION-1",
        items: [
          {
            catalogListingId: "listing-1",
            productId: "product-1",
            vendorId: "vendor-1",
            productName: "Виріб",
            unitPriceUah: 100,
            quantity: 1,
          },
        ],
      }),
    ).rejects.toThrow("лише в development/test");
    expect(createParentOrders).not.toHaveBeenCalled();
  });

  it("відхиляє суми, що не вміщуються у PostgreSQL integer, до запису", async () => {
    process.env.NODE_ENV = "test";
    process.env.ALLOW_SYNTHETIC_ORDERS = "true";
    const createParentOrders = vi.fn();
    const service = {
      createParentOrders,
      createVendorChildOrders: vi.fn(),
      createOrderLines: vi.fn(),
      createShipments: vi.fn(),
      createTrackingEvents: vi.fn(),
      createAuditEvents: vi.fn(),
    } satisfies CustomerOrderWriterService;

    await expect(
      createSyntheticOrder(service, {
        customerId: "customer-overflow",
        orderNumber: "SYN-OVERFLOW-1",
        items: [
          {
            productId: "product-overflow",
            vendorId: "vendor-overflow",
            productName: "Велика позиція",
            unitPriceUah: POSTGRES_INTEGER_MAX,
            quantity: 2,
          },
        ],
      }),
    ).rejects.toThrow("ліміт сховища");
    expect(createParentOrders).not.toHaveBeenCalled();
  });

  it("creates one parent, one child per vendor, immutable line snapshots, and an audit event", async () => {
    process.env.NODE_ENV = "test";
    process.env.ALLOW_SYNTHETIC_ORDERS = "true";

    let sequence = 0;
    const createParentOrders = vi.fn(async () => ({ id: "parent-1" }));
    const createVendorChildOrders = vi.fn(
      async (input: Record<string, unknown>) => ({
        id: `child-${++sequence}`,
        ...input,
      }),
    );
    const createOrderLines = vi.fn(async (input: Record<string, unknown>) => ({
      id: `line-${++sequence}`,
      ...input,
    }));
    const createShipments = vi.fn(async () => ({ id: "shipment-1" }));
    const createTrackingEvents = vi.fn(
      async (input: Record<string, unknown>) => ({
        id: "tracking-1",
        ...input,
      }),
    );
    const createAuditEvents = vi.fn(async (input: Record<string, unknown>) => ({
      id: "audit-1",
      ...input,
    }));
    const service = {
      createParentOrders,
      createVendorChildOrders,
      createOrderLines,
      createShipments,
      createTrackingEvents,
      createAuditEvents,
    } satisfies CustomerOrderWriterService;

    const result = await createSyntheticOrder(service, {
      customerId: "customer-1",
      orderNumber: "SYN-ORDER-1",
      items: [
        {
          catalogListingId: "listing-a",
          productId: "product-a",
          vendorId: "vendor-a",
          productName: "Чай",
          unitPriceUah: 240,
          quantity: 2,
        },
        {
          catalogListingId: "listing-b",
          productId: "product-b",
          vendorId: "vendor-b",
          productName: "Чашка",
          unitPriceUah: 380,
          quantity: 1,
        },
        {
          catalogListingId: "listing-c",
          productId: "product-c",
          vendorId: "vendor-a",
          productName: "Мед",
          unitPriceUah: 310,
          quantity: 1,
        },
      ],
    });

    expect(createParentOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "customer-1",
        order_number: "SYN-ORDER-1",
        mode: "synthetic",
        total_amount_uah: 1170,
        payment_status: "not_applicable",
        payout_status: "not_applicable",
      }),
      undefined,
    );
    expect(createVendorChildOrders).toHaveBeenCalledTimes(2);
    expect(createVendorChildOrders).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        parent_order_id: "parent-1",
        vendor_id: "vendor-a",
        gross_amount_uah: 790,
      }),
      undefined,
    );
    expect(createVendorChildOrders).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        parent_order_id: "parent-1",
        vendor_id: "vendor-b",
        gross_amount_uah: 380,
      }),
      undefined,
    );
    expect(createOrderLines).toHaveBeenCalledTimes(3);
    expect(createOrderLines).toHaveBeenCalledWith(
      expect.objectContaining({
        catalog_listing_id: "listing-a",
        product_name_snapshot: "Чай",
        unit_price_uah: 240,
        quantity: 2,
        line_total_uah: 480,
      }),
      undefined,
    );
    expect(createShipments).toHaveBeenCalledTimes(2);
    expect(createShipments).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        child_order_id: "child-1",
        carrier: "nova_poshta",
        source: "synthetic",
        normalized_status: "created",
        ttn_number: null,
      }),
      undefined,
    );
    expect(createTrackingEvents).toHaveBeenCalledTimes(2);
    expect(createTrackingEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        shipment_id: "shipment-1",
        normalized_status: "created",
        source: "synthetic",
      }),
      undefined,
    );
    expect(createAuditEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: "customer-1",
        actor_type: "customer",
        action: "order.synthetic_created",
        tenant_id: null,
      }),
      undefined,
    );
    expect(result.parentOrder).toEqual({ id: "parent-1" });
    expect(result.childOrders).toHaveLength(2);
    expect(result.orderLines).toHaveLength(3);
  });

  it("uses a separate explicit guard for synthetic reviews", () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_SYNTHETIC_REVIEWS = "false";
    expect(isSyntheticReviewsAllowed()).toBe(false);
    process.env.ALLOW_SYNTHETIC_REVIEWS = "true";
    expect(isSyntheticReviewsAllowed()).toBe(true);
  });

  it("maps only approved reviews and keeps an empty summary honest", () => {
    expect(mapApprovedProductReviews([]).summary).toEqual({
      averageRating: null,
      totalReviews: 0,
      ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });

    const result = mapApprovedProductReviews([
      {
        id: "review-pending",
        product_id: "product-1",
        vendor_id: "vendor-1",
        rating: 5,
        body: "Не має бути public",
        status: "pending",
      },
      {
        id: "review-approved",
        product_id: "product-1",
        vendor_id: "vendor-1",
        rating: 4,
        body: "Гарний виріб",
        display_name: "Олена",
        mode: "synthetic",
        status: "approved",
        created_at: "2026-08-21T00:00:00.000Z",
      },
    ]);

    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0]?.verifiedPurchase).toBe(true);
    expect(result.summary.averageRating).toBe(4);
  });

  it("excludes unknown/live provenance and keeps lines visible without a shipment", async () => {
    const service: CustomerOrderReaderService = {
      listParentOrders: async () => [
        {
          id: "live-order",
          customer_id: "customer-1",
          mode: "live",
          order_number: "LIVE-1",
        },
        {
          id: "synthetic-order",
          customer_id: "customer-1",
          mode: "synthetic",
          order_number: "SYN-1",
          total_amount_uah: 250,
        },
      ],
      listVendorChildOrders: async () => [
        {
          id: "child-1",
          parent_order_id: "synthetic-order",
          vendor_id: "vendor-1",
          fulfillment_status: "pending",
        },
      ],
      listOrderLines: async () => [
        {
          id: "line-1",
          child_order_id: "child-1",
          product_id: "product-1",
          vendor_id: "vendor-1",
          product_name_snapshot: "Виріб",
          quantity: 1,
          unit_price_uah: 250,
          line_total_uah: 250,
        },
      ],
      listShipments: async () => [],
      listTrackingEvents: async () => [],
      listProductReviews: async () => [],
      retrieveVendor: async () => ({ id: "vendor-1", name: "Майстерня" }),
    };

    const result = await readCustomerOrders(service, "customer-1");

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]?.mode).toBe("synthetic");
    expect(result.orders[0]?.shipments[0]?.lines).toHaveLength(1);
    expect(result.orders[0]?.shipments[0]?.tracking.events).toEqual([]);
  });

  it("rejects empty and script-bearing review bodies", () => {
    expect(isReviewBodySafe("  ")).toBe(false);
    expect(isReviewBodySafe("<script>alert(1)</script>")).toBe(false);
    expect(isReviewBodySafe("Добрий виріб")).toBe(true);
  });
});
