import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";
import { MARKETPLACE_MODULE } from "../modules/marketplace/constants.js";
import type { MarketplaceServiceType } from "../types/service-types.js";

export type ReviewComplianceDocumentInput = {
  documentId: string;
  targetStatus: "verified" | "rejected" | "expired";
  reviewerComment?: string;
  reviewerId: string;
};

export const reviewComplianceDocumentStep = createStep(
  "review-compliance-document-step",
  async (input: ReviewComplianceDocumentInput, { container }) => {
    const marketplaceService = container.resolve(
      MARKETPLACE_MODULE,
    ) as MarketplaceServiceType;

    const doc = await marketplaceService.retrieveComplianceDocument(
      input.documentId,
    );

    if (!doc) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Document ${input.documentId} not found.`,
      );
    }

    const updated = await marketplaceService.updateComplianceDocuments({
      id: doc["id"],
      status: input.targetStatus,
      reviewer_comment: input.reviewerComment || null,
    });

    await marketplaceService.createAuditEvents({
      actor_id: input.reviewerId,
      actor_type: "staff",
      action: "review_compliance_document",
      tenant_id: doc["vendor_id"],
      payload: {
        document_id: doc["id"],
        from_status: doc["status"],
        to_status: input.targetStatus,
        comment: input.reviewerComment,
      },
    });

    return new StepResponse(updated, updated["id"] as string);
  },
);

export const reviewComplianceDocumentWorkflow = createWorkflow(
  "review-compliance-document-workflow",
  (input: ReviewComplianceDocumentInput) => {
    const result = reviewComplianceDocumentStep(input);
    return new WorkflowResponse(result);
  },
);
