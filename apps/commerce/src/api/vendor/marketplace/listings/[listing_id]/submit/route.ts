import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  resolveVendorMembershipFromAuthContext,
  assertVendorListingAccess,
} from "../../../../../../modules/marketplace/authorization";
import { submitCatalogListingWorkflow } from "../../../../../../workflows/submit-catalog-listing";
import type { AuthenticatedReq } from "../../../../../../types/service-types";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
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

  const actorId =
    reqWithAuth.auth_context?.actor_id ||
    reqWithAuth.auth_context?.auth_identity_id ||
    "";

  const { result } = await submitCatalogListingWorkflow(req.scope).run({
    input: {
      listingId: listing.id,
      vendorId: membership.vendor_id,
      actorId,
    },
  });

  res.status(200).json({ listing: result });
}
