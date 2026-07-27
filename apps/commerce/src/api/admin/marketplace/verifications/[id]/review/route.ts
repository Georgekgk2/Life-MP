import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import { assertStaffRole } from "../../../../../../modules/marketplace/authorization.js";
import { reviewVendorVerificationWorkflow } from "../../../../../../workflows/review-vendor-verification.js";
import type { AuthenticatedReq } from "../../../../../../types/service-types.js";

export const VerificationReviewInput = z
  .object({
    target_status: z.enum(["verified", "rejected", "suspended"]),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export async function POST(req: MedusaRequest, res: MedusaResponse) {
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
      `Invalid review payload: ${JSON.stringify(parseResult.error.errors)}`,
    );
  }

  const { id } = req.params;

  const { result } = await reviewVendorVerificationWorkflow(req.scope).run({
    input: {
      verificationId: id as string,
      targetStatus: parseResult.data.target_status,
      reviewerId: reqWithAuth.auth_context?.actor_id || "compliance_reviewer",
      notes: parseResult.data.notes,
    },
  });

  res.status(200).json({ verification: result });
}
