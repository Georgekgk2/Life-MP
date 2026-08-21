import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import {
  assertMarketplaceCoreLocalMode,
  assertReviewerMayDecide,
  assertStaffRole,
} from "../../../../../../modules/marketplace/authorization.js";
import { isSyntheticReviewsAllowed } from "../../../../../../modules/marketplace/customer-orders.js";
import { MARKETPLACE_MODULE } from "../../../../../../modules/marketplace/constants.js";
import type { AuthenticatedReq } from "../../../../../../types/service-types.js";
import { moderateProductReviewWorkflow } from "../../../../../../workflows/moderate-product-review.js";

const ReviewDecisionInput = z
  .object({
    target_status: z.enum(["approved", "rejected"]),
    rationale: z.string().trim().min(3).max(1000),
  })
  .strict();

type RecordValue = Record<string, unknown>;

type ReviewService = {
  listProductReviews: (
    query: Record<string, unknown>,
  ) => Promise<RecordValue[]>;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
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
  const parsed = ReviewDecisionInput.safeParse(req.body);
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Рішення модератора має містити статус і пояснення.",
    );
  }

  const service = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as unknown as ReviewService;
  const reviewId = req.params.review_id;
  const [review] = await service.listProductReviews({ id: reviewId });
  if (!review || review["mode"] !== "synthetic") {
    return res.status(404).json({
      type: "not_found",
      message: "Синтетичний відгук не знайдено.",
    });
  }

  if (review["status"] !== "pending") {
    return res.status(409).json({
      type: "invalid_state",
      message: "Рішення для цього відгуку вже прийнято.",
    });
  }

  const reviewerId = reqWithAuth.auth_context?.actor_id;
  if (!reviewerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Відсутній автентифікований контекст працівника.",
    );
  }
  await assertReviewerMayDecide(
    reqWithAuth.auth_context,
    {
      id: reviewId,
      vendor_id: asString(review["vendor_id"]),
      state: "review",
    },
    req.scope,
  );

  const correlationId =
    typeof req.headers["x-correlation-id"] === "string"
      ? req.headers["x-correlation-id"]
      : null;
  const { result } = await moderateProductReviewWorkflow(req.scope).run({
    input: {
      reviewId,
      reviewerId,
      targetStatus: parsed.data.target_status,
      rationale: parsed.data.rationale,
      correlationId,
    },
  });

  if (!("review" in result)) {
    return res.status(409).json({
      type: "invalid_state",
      message: "Рішення для цього відгуку вже прийнято.",
    });
  }

  return res.status(200).json({ review: result.review });
}
