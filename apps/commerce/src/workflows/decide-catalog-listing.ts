import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";
import { MARKETPLACE_MODULE } from "../modules/marketplace/constants.js";
import type { ListingState } from "../modules/marketplace/constants.js";
import type { MarketplaceServiceType } from "../types/service-types.js";

export type DecideCatalogListingInput = {
  listingId: string;
  reviewerId: string;
  reviewerRole: "platform_admin" | "compliance_reviewer";
  targetState: ListingState;
  rationale?: string | undefined;
};

export const decideCatalogListingStep = createStep(
  "decide-catalog-listing-step",
  async (input: DecideCatalogListingInput, { container }) => {
    const marketplaceService = container.resolve(
      MARKETPLACE_MODULE,
    ) as MarketplaceServiceType;
    const listing = await marketplaceService.retrieveCatalogListing(
      input.listingId,
    );

    if (!listing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Listing ${input.listingId} not found.`,
      );
    }

    const currentState = listing["state"] as string;
    const vendorId = listing["vendor_id"] as string;

    const validTransitions: Record<string, ListingState[]> = {
      submitted: ["under_review", "rejected"],
      under_review: ["changes_requested", "approved", "rejected"],
      approved: ["published", "rejected"],
    };

    const allowed = validTransitions[currentState] || [];
    if (!allowed.includes(input.targetState)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Cannot transition listing from state '${currentState}' to '${input.targetState}'.`,
      );
    }

    if (
      input.targetState === "published" &&
      input.reviewerRole !== "compliance_reviewer"
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Only compliance_reviewer role may transition a listing to 'published'.",
      );
    }

    const updateData: Record<string, unknown> = {
      id: listing["id"],
      state: input.targetState,
    };

    if (input.targetState === "published") {
      updateData["published_at"] = new Date();
      updateData["visibility"] = "local_demo";
      updateData["synthetic"] = true;
    }

    const updatedListing =
      await marketplaceService.updateCatalogListings(updateData);

    const decision = await marketplaceService.createModerationDecisions({
      listing_id: listing["id"],
      reviewer_id: input.reviewerId,
      from_state: currentState,
      to_state: input.targetState,
      rationale: input.rationale || null,
    });

    await marketplaceService.createAuditEvents({
      actor_id: input.reviewerId,
      actor_type: "staff_user",
      action: `moderation_decision_${input.targetState}`,
      tenant_id: vendorId,
      listing_id: listing["id"],
      payload: {
        from_state: currentState,
        to_state: input.targetState,
        rationale: input.rationale || null,
      },
    });

    return new StepResponse({ listing: updatedListing, decision });
  },
);

export const decideCatalogListingWorkflow = createWorkflow(
  "decide-catalog-listing-workflow",
  (input: DecideCatalogListingInput) => {
    const result = decideCatalogListingStep(input);
    return new WorkflowResponse(result);
  },
);
