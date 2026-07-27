import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";
import { MARKETPLACE_MODULE } from "../modules/marketplace/constants.js";
import type { MarketplaceServiceType } from "../types/service-types.js";

export type ReviewVendorVerificationInput = {
  verificationId: string;
  targetStatus: "verified" | "rejected" | "suspended";
  reviewerId: string;
  notes?: string;
};

export const reviewVendorVerificationStep = createStep(
  "review-vendor-verification-step",
  async (input: ReviewVendorVerificationInput, { container }) => {
    const marketplaceService = container.resolve(
      MARKETPLACE_MODULE,
    ) as MarketplaceServiceType;

    const verification = await marketplaceService.retrieveVendorVerification(
      input.verificationId,
    );

    if (!verification) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Verification record ${input.verificationId} not found.`,
      );
    }

    const updated = await marketplaceService.updateVendorVerifications({
      id: verification["id"],
      verification_status: input.targetStatus,
      reviewed_by: input.reviewerId,
      reviewed_at: new Date(),
      notes: input.notes || null,
    });

    await marketplaceService.createAuditEvents({
      actor_id: input.reviewerId,
      actor_type: "staff",
      action: "review_vendor_verification",
      tenant_id: verification["vendor_id"],
      payload: {
        from_status: verification["verification_status"],
        to_status: input.targetStatus,
        notes: input.notes,
      },
    });

    return new StepResponse(updated, updated["id"] as string);
  },
);

export const reviewVendorVerificationWorkflow = createWorkflow(
  "review-vendor-verification-workflow",
  (input: ReviewVendorVerificationInput) => {
    const result = reviewVendorVerificationStep(input);
    return new WorkflowResponse(result);
  },
);
