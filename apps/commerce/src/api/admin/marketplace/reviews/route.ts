import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  assertMarketplaceCoreLocalMode,
  assertStaffRole,
} from "../../../../modules/marketplace/authorization.js";
import { isSyntheticReviewsAllowed } from "../../../../modules/marketplace/customer-orders.js";
import { MARKETPLACE_MODULE } from "../../../../modules/marketplace/constants.js";
import type { AuthenticatedReq } from "../../../../types/service-types.js";

type ReviewService = {
  listProductReviews: (
    query: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<Record<string, unknown>[]>;
};
function mapModerationReview(
  review: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: review["id"],
    product_id: review["product_id"],
    vendor_id: review["vendor_id"],
    mode: review["mode"],
    rating: review["rating"],
    body: review["body"],
    display_name: review["display_name"],
    status: review["status"],
    moderator_id: review["moderator_id"],
    moderation_rationale: review["moderation_rationale"],
    reviewed_at: review["reviewed_at"],
    created_at: review["created_at"],
  };
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  assertMarketplaceCoreLocalMode();
  if (!isSyntheticReviewsAllowed()) {
    return res.status(503).json({
      type: "capability_unavailable",
      message: "Модерація синтетичних відгуків недоступна в цьому режимі.",
    });
  }
  const reqWithAuth = req as unknown as AuthenticatedReq;
  await assertStaffRole(
    reqWithAuth.auth_context,
    "compliance_reviewer",
    req.scope,
  );

  const service = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as unknown as ReviewService;
  const status =
    typeof req.query["status"] === "string" ? req.query["status"] : undefined;
  const reviews = await service.listProductReviews(
    status ? { status, mode: "synthetic" } : { mode: "synthetic" },
    { order: { created_at: "ASC" } },
  );

  return res.status(200).json({
    reviews: reviews.map(mapModerationReview),
  });
}
