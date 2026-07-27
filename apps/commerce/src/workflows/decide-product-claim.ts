import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";
import { MARKETPLACE_MODULE } from "../modules/marketplace/constants.js";
import type { MarketplaceServiceType } from "../types/service-types.js";

export type DecideProductClaimInput = {
  claimId: string;
  targetStatus: "approved" | "rejected" | "expired" | "revoked";
  reviewerId: string;
};

export const decideProductClaimStep = createStep(
  "decide-product-claim-step",
  async (input: DecideProductClaimInput, { container }) => {
    const marketplaceService = container.resolve(
      MARKETPLACE_MODULE,
    ) as MarketplaceServiceType;

    const claim = await marketplaceService.retrieveProductClaim(input.claimId);

    if (!claim) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Claim ${input.claimId} not found.`,
      );
    }

    const claimType = claim["claim_type"] as string;
    const evidenceDocId = claim["evidence_document_id"] as string | undefined;

    // Safety rule: organic and medical claims require an evidence document
    if (
      input.targetStatus === "approved" &&
      (claimType === "organic" || claimType === "medical")
    ) {
      if (!evidenceDocId) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Cannot approve ${claimType} claim without a verified evidence document.`,
        );
      }

      const doc =
        await marketplaceService.retrieveComplianceDocument(evidenceDocId);

      if (!doc || doc["status"] !== "verified") {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Evidence document for ${claimType} claim must be in 'verified' status.`,
        );
      }
    }

    const isPublic = input.targetStatus === "approved";
    const updated = await marketplaceService.updateProductClaims({
      id: claim["id"],
      review_status: input.targetStatus,
      public_visibility: isPublic,
    });

    await marketplaceService.createAuditEvents({
      actor_id: input.reviewerId,
      actor_type: "staff",
      action: "decide_product_claim",
      listing_id: claim["catalog_listing_id"],
      payload: {
        claim_id: claim["id"],
        claim_type: claimType,
        from_status: claim["review_status"],
        to_status: input.targetStatus,
        public_visibility: isPublic,
      },
    });

    return new StepResponse(updated, updated["id"] as string);
  },
);

export const decideProductClaimWorkflow = createWorkflow(
  "decide-product-claim-workflow",
  (input: DecideProductClaimInput) => {
    const result = decideProductClaimStep(input);
    return new WorkflowResponse(result);
  },
);
