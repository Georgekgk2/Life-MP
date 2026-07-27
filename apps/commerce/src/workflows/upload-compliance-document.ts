import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { MARKETPLACE_MODULE } from "../modules/marketplace/constants.js";
import type { MarketplaceServiceType } from "../types/service-types.js";

export type UploadComplianceDocumentInput = {
  vendorId: string;
  ownerType: "vendor" | "product";
  ownerId: string;
  documentType:
    | "quality_certificate"
    | "ses_conclusion"
    | "organic_certificate"
    | "declaration";
  documentNumber: string;
  issuer?: string;
  issuedAt?: string;
  expiresAt?: string;
  fileUrl: string;
  actorId: string;
};

export const uploadComplianceDocumentStep = createStep(
  "upload-compliance-document-step",
  async (input: UploadComplianceDocumentInput, { container }) => {
    const marketplaceService = container.resolve(
      MARKETPLACE_MODULE,
    ) as MarketplaceServiceType;

    const doc = await marketplaceService.createComplianceDocuments({
      vendor_id: input.vendorId,
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      document_type: input.documentType,
      document_number: input.documentNumber,
      issuer: input.issuer || null,
      issued_at: input.issuedAt ? new Date(input.issuedAt) : null,
      expires_at: input.expiresAt ? new Date(input.expiresAt) : null,
      file_url: input.fileUrl,
      status: "submitted",
    });

    await marketplaceService.createAuditEvents({
      actor_id: input.actorId,
      actor_type: "vendor_member",
      action: "upload_compliance_document",
      tenant_id: input.vendorId,
      payload: {
        document_id: doc["id"],
        document_type: input.documentType,
      },
    });

    return new StepResponse(doc, doc["id"] as string);
  },
);

export const uploadComplianceDocumentWorkflow = createWorkflow(
  "upload-compliance-document-workflow",
  (input: UploadComplianceDocumentInput) => {
    const result = uploadComplianceDocumentStep(input);
    return new WorkflowResponse(result);
  },
);
