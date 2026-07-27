import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { MARKETPLACE_MODULE } from "../modules/marketplace/constants.js";
import type { MarketplaceServiceType } from "../types/service-types.js";

export type SubmitVendorVerificationInput = {
  vendorId: string;
  taxIdentifier: string;
  legalName: string;
  legalAddress?: string;
  actorId: string;
};

export const submitVendorVerificationStep = createStep(
  "submit-vendor-verification-step",
  async (input: SubmitVendorVerificationInput, { container }) => {
    const marketplaceService = container.resolve(
      MARKETPLACE_MODULE,
    ) as MarketplaceServiceType;

    const existing = await marketplaceService.listVendorVerifications({
      vendor_id: input.vendorId,
    });

    let verification;
    if (existing && existing.length > 0) {
      verification = await marketplaceService.updateVendorVerifications({
        id: existing[0]["id"],
        tax_identifier: input.taxIdentifier,
        legal_name: input.legalName,
        legal_address: input.legalAddress || null,
        verification_status: "pending",
        reviewed_by: null,
        reviewed_at: null,
      });
    } else {
      verification = await marketplaceService.createVendorVerifications({
        vendor_id: input.vendorId,
        tax_identifier: input.taxIdentifier,
        legal_name: input.legalName,
        legal_address: input.legalAddress || null,
        verification_status: "pending",
      });
    }

    await marketplaceService.createAuditEvents({
      actor_id: input.actorId,
      actor_type: "vendor_member",
      action: "submit_vendor_verification",
      tenant_id: input.vendorId,
      payload: {
        tax_identifier: input.taxIdentifier,
        legal_name: input.legalName,
      },
    });

    return new StepResponse(verification, verification["id"] as string);
  },
);

export const submitVendorVerificationWorkflow = createWorkflow(
  "submit-vendor-verification-workflow",
  (input: SubmitVendorVerificationInput) => {
    const result = submitVendorVerificationStep(input);
    return new WorkflowResponse(result);
  },
);
