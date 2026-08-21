import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import { MARKETPLACE_MODULE } from "../../../../../../modules/marketplace/constants.js";
import {
  assertMarketplaceCoreLocalMode,
  resolveAuthenticatedActorId,
} from "../../../../../../modules/marketplace/authorization.js";
import {
  isReviewBodySafe,
  isSyntheticReviewsAllowed,
} from "../../../../../../modules/marketplace/customer-orders.js";
import type { AuthenticatedReq } from "../../../../../../types/service-types.js";

const ReviewCreateInput = z
  .object({
    rating: z.number().int().min(1).max(5),
    body: z.string().trim().min(3).max(5000),
    display_name: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

type RecordValue = Record<string, unknown>;

type ReviewService = {
  listOrderLines: (query: Record<string, unknown>) => Promise<RecordValue[]>;
  listParentOrders: (query: Record<string, unknown>) => Promise<RecordValue[]>;
  listVendorChildOrders: (
    query: Record<string, unknown>,
  ) => Promise<RecordValue[]>;
  listProductReviews: (
    query: Record<string, unknown>,
  ) => Promise<RecordValue[]>;
  createProductReviews: (data: Record<string, unknown>) => Promise<RecordValue>;
  createAuditEvents: (data: Record<string, unknown>) => Promise<RecordValue>;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  assertMarketplaceCoreLocalMode();

  if (!isSyntheticReviewsAllowed()) {
    return res.status(503).json({
      type: "capability_unavailable",
      message: "Надсилання відгуків недоступне в цьому режимі.",
    });
  }

  const authContext = (req as unknown as AuthenticatedReq).auth_context;
  const customerId = resolveAuthenticatedActorId(authContext);
  const parsed = ReviewCreateInput.safeParse(req.body);
  if (!parsed.success || !isReviewBodySafe(parsed.data?.body || "")) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Відгук має містити оцінку від 1 до 5 та текст від 3 до 5000 символів.",
    );
  }

  const service = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as unknown as ReviewService;
  const [line] = await service.listOrderLines({
    id: req.params.order_line_id,
  });

  if (!line) {
    return res.status(404).json({
      type: "not_found",
      message: "Позицію замовлення не знайдено.",
    });
  }

  const parentId = asString(line["parent_order_id"]);
  const childId = asString(line["child_order_id"]);
  const [parent] = await service.listParentOrders({
    id: parentId,
    customer_id: customerId,
    mode: "synthetic",
  });
  const [child] = await service.listVendorChildOrders({ id: childId });

  if (!parent || !child || parent["mode"] !== "synthetic") {
    return res.status(404).json({
      type: "not_found",
      message: "Позицію замовлення не знайдено.",
    });
  }
  const childParentId = asString(child["parent_order_id"]);
  const lineVendorId = asString(line["vendor_id"]);
  const childVendorId = asString(child["vendor_id"]);
  if (
    childParentId !== parentId ||
    asString(line["child_order_id"]) !== childId ||
    !lineVendorId ||
    !childVendorId ||
    lineVendorId !== childVendorId
  ) {
    return res.status(404).json({
      type: "not_found",
      message: "Позицію замовлення не знайдено.",
    });
  }

  const fulfillmentStatus = asString(
    child["fulfillment_status"] || child["status"],
  );
  if (fulfillmentStatus !== "delivered" && fulfillmentStatus !== "settled") {
    return res.status(409).json({
      type: "review_not_eligible",
      message: "Відгук можна залишити після вручення замовлення.",
    });
  }

  const existing = await service.listProductReviews({
    order_line_id: req.params.order_line_id,
  });
  if (existing.length > 0) {
    return res.status(409).json({
      type: "review_exists",
      message: "Для цієї позиції вже є відгук.",
    });
  }

  const review = await service.createProductReviews({
    customer_id: customerId,
    order_line_id: req.params.order_line_id,
    parent_order_id: parentId,
    child_order_id: childId,
    product_id: asString(line["product_id"]),
    vendor_id: asString(line["vendor_id"] || child["vendor_id"]),
    mode: "synthetic",
    rating: parsed.data.rating,
    body: parsed.data.body,
    display_name: parsed.data.display_name || null,
    status: "pending",
    moderator_id: null,
    moderation_rationale: null,
    reviewed_at: null,
  });

  await service.createAuditEvents({
    actor_id: customerId,
    actor_type: "customer",
    action: "review.submitted",
    tenant_id: asString(line["vendor_id"] || child["vendor_id"]),
    listing_id: null,
    correlation_id: req.headers["x-correlation-id"] || null,
    payload: {
      review_id: review["id"],
      order_line_id: req.params.order_line_id,
    },
  });

  return res.status(201).json({
    review: {
      id: review["id"],
      status: "pending",
      message: "Дякуємо! Відгук надіслано на перевірку модератором.",
    },
  });
}
