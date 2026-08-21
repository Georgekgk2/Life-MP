import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import {
  assertMarketplaceCoreLocalMode,
  assertReviewerMayDecide,
  assertStaffRole,
} from "../../../../../../modules/marketplace/authorization.js";
import { MARKETPLACE_MODULE } from "../../../../../../modules/marketplace/constants.js";
import { reviewVendorVerificationWorkflow } from "../../../../../../workflows/review-vendor-verification.js";
import type {
  AuthenticatedReq,
  MarketplaceServiceType,
} from "../../../../../../types/service-types.js";

export const VerificationReviewInput = z
  .object({
    target_status: z.enum(["verified", "rejected", "suspended"]),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  assertMarketplaceCoreLocalMode();
  const reqWithAuth = req as unknown as AuthenticatedReq;
  await assertStaffRole(
    reqWithAuth.auth_context,
    "compliance_reviewer",
    req.scope,
  );

  const parseResult = VerificationReviewInput.safeParse(req.body);
  if (!parseResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Дані рішення щодо верифікації некоректні.",
    );
  }
  const { id } = req.params;
  const marketplaceService = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as unknown as MarketplaceServiceType;
  const verification = await marketplaceService.retrieveVendorVerification(id);
  if (!verification) {
    return res.status(404).json({
      type: "not_found",
      message: "Верифікацію майстерні не знайдено.",
    });
  }

  const currentStatus = verification["verification_status"];
  const allowedTransitions: Record<string, readonly string[]> = {
    pending: ["verified", "rejected", "suspended"],
    verified: ["suspended"],
    rejected: [],
    suspended: [],
  };
  if (
    typeof currentStatus !== "string" ||
    !allowedTransitions[currentStatus]?.includes(parseResult.data.target_status)
  ) {
    return res.status(409).json({
      type: "invalid_state",
      message: "Цей перехід статусу верифікації недоступний.",
    });
  }

  await assertReviewerMayDecide(
    reqWithAuth.auth_context,
    {
      id,
      vendor_id: String(verification["vendor_id"] || ""),
      state: currentStatus,
    },
    req.scope,
  );
  const reviewerId = reqWithAuth.auth_context?.actor_id;
  if (!reviewerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Відсутній автентифікований контекст працівника.",
    );
  }

  const { result } = await reviewVendorVerificationWorkflow(req.scope).run({
    input: {
      verificationId: id as string,
      targetStatus: parseResult.data.target_status,
      reviewerId,
      notes: parseResult.data.notes,
    },
  });

  res.status(200).json({ verification: result });
}
