import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import { MARKETPLACE_MODULE } from "../../../../../modules/marketplace/constants";
import {
  resolveVendorMembershipFromAuthContext,
  assertVendorListingAccess,
} from "../../../../../modules/marketplace/authorization";
import type {
  AuthenticatedReq,
  MarketplaceServiceType,
} from "../../../../../types/service-types";

export const VendorListingUpdateInput = z
  .object({
    title: z.string().min(1).max(160).optional(),
    description: z.string().min(1).max(5000).optional(),
  })
  .strict();

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const reqWithAuth = req as unknown as AuthenticatedReq;
  const membership = await resolveVendorMembershipFromAuthContext(
    reqWithAuth.auth_context,
    req.scope,
  );

  const listingId = req.params["listing_id"] as string;
  const listing = await assertVendorListingAccess(
    membership,
    listingId,
    req.scope,
  );

  res.status(200).json({ listing });
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const reqWithAuth = req as unknown as AuthenticatedReq;
  const membership = await resolveVendorMembershipFromAuthContext(
    reqWithAuth.auth_context,
    req.scope,
  );

  const listingId = req.params["listing_id"] as string;
  const listing = await assertVendorListingAccess(
    membership,
    listingId,
    req.scope,
  );

  const parseResult = VendorListingUpdateInput.safeParse(req.body);
  if (!parseResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid listing update input: ${parseResult.error.message}`,
    );
  }

  const marketplaceService = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as MarketplaceServiceType;

  const updateData: Record<string, unknown> = { id: listing.id };
  if (parseResult.data.title !== undefined)
    updateData["title"] = parseResult.data.title;
  if (parseResult.data.description !== undefined)
    updateData["description"] = parseResult.data.description;

  const wasApprovedOrPublished =
    listing.state === "approved" || listing.state === "published";

  if (wasApprovedOrPublished) {
    updateData["state"] = "draft";
    updateData["published_at"] = null;
  }

  const updatedListing =
    await marketplaceService.updateCatalogListings(updateData);

  if (wasApprovedOrPublished) {
    await marketplaceService.createAuditEvents({
      actor_id:
        reqWithAuth.auth_context?.actor_id ||
        reqWithAuth.auth_context?.auth_identity_id,
      actor_type: "vendor_member",
      action: "content_changed_reset_to_draft",
      tenant_id: membership.vendor_id,
      listing_id: listing.id,
      payload: {
        from_state: listing.state,
        to_state: "draft",
      },
    });
  }

  res.status(200).json({ listing: updatedListing });
}
