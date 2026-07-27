import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import {
  listingStates,
  MARKETPLACE_MODULE,
} from "../../../../../../modules/marketplace/constants";
import {
  assertStaffRole,
  assertReviewerMayDecide,
} from "../../../../../../modules/marketplace/authorization";
import { decideCatalogListingWorkflow } from "../../../../../../workflows/decide-catalog-listing";
import type {
  AuthenticatedReq,
  MarketplaceServiceType,
} from "../../../../../../types/service-types";

const moderationSchema = z
  .object({
    target_state: z.enum(listingStates),
    rationale: z.string().max(2000).optional(),
  })
  .strict();

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const reqWithAuth = req as unknown as AuthenticatedReq;
  const staffAssignment = await assertStaffRole(
    reqWithAuth.auth_context,
    "compliance_reviewer",
    req.scope,
  );

  const listingId = req.params["listing_id"] as string;
  const parseResult = moderationSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid moderation input: ${parseResult.error.message}`,
    );
  }

  const marketplaceService = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as MarketplaceServiceType;
  const listing = await marketplaceService.retrieveCatalogListing(listingId);
  if (!listing) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Listing ${listingId} not found.`,
    );
  }

  const typedListing = {
    id: listing["id"] as string,
    vendor_id: listing["vendor_id"] as string,
    state: listing["state"] as string,
  };

  await assertReviewerMayDecide(
    reqWithAuth.auth_context,
    typedListing,
    req.scope,
  );

  const reviewerId =
    reqWithAuth.auth_context?.actor_id ||
    reqWithAuth.auth_context?.auth_identity_id ||
    "usr_compliance_01";

  const { result } = await decideCatalogListingWorkflow(req.scope).run({
    input: {
      listingId: typedListing.id,
      reviewerId,
      reviewerRole: staffAssignment.role,
      targetState: parseResult.data.target_state,
      rationale: parseResult.data.rationale,
    },
  });

  res.status(200).json({
    listing: result.listing,
    decision: result.decision,
  });
}
