import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";
import { MARKETPLACE_MODULE } from "../modules/marketplace/constants.js";
import type { MarketplaceServiceType } from "../types/service-types.js";

export type SubmitCatalogListingInput = {
  listingId: string;
  vendorId: string;
  actorId: string;
};

export const submitCatalogListingStep = createStep(
  "submit-catalog-listing-step",
  async (input: SubmitCatalogListingInput, { container }) => {
    const marketplaceService = container.resolve(
      MARKETPLACE_MODULE,
    ) as MarketplaceServiceType;
    const listing = await marketplaceService.retrieveCatalogListing(
      input.listingId,
    );

    if (!listing || listing["vendor_id"] !== input.vendorId) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Listing ${input.listingId} not found for vendor.`,
      );
    }

    if (
      listing["state"] !== "draft" &&
      listing["state"] !== "changes_requested"
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Listing in state ${listing["state"]} cannot be submitted for moderation.`,
      );
    }

    const updatedListing = await marketplaceService.updateCatalogListings({
      id: listing["id"],
      state: "submitted",
      submitted_at: new Date(),
    });

    await marketplaceService.createAuditEvents({
      actor_id: input.actorId,
      actor_type: "vendor_member",
      action: "submit_catalog_listing",
      tenant_id: input.vendorId,
      listing_id: listing["id"],
      payload: {
        from_state: listing["state"],
        to_state: "submitted",
      },
    });

    return new StepResponse(updatedListing, {
      listingId: listing["id"] as string,
      previousState: listing["state"] as string,
      previousSubmittedAt: listing["submitted_at"] as Date | null,
    });
  },
  async (compensationData, { container }) => {
    if (!compensationData) return;
    const marketplaceService = container.resolve(
      MARKETPLACE_MODULE,
    ) as MarketplaceServiceType;
    await marketplaceService.updateCatalogListings({
      id: compensationData.listingId,
      state: compensationData.previousState,
      submitted_at: compensationData.previousSubmittedAt,
    });
  },
);

export const submitCatalogListingWorkflow = createWorkflow(
  "submit-catalog-listing-workflow",
  (input: SubmitCatalogListingInput) => {
    const result = submitCatalogListingStep(input);
    return new WorkflowResponse(result);
  },
);
