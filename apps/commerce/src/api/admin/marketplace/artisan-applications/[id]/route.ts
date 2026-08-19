import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { assertStaffRole } from "../../../../../modules/marketplace/authorization.js";
import { MARKETPLACE_MODULE } from "../../../../../modules/marketplace/constants.js";
import type { AuthenticatedReq } from "../../../../../types/service-types.js";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const reqWithAuth = req as unknown as AuthenticatedReq;
  await assertStaffRole(
    reqWithAuth.auth_context,
    "compliance_reviewer",
    req.scope,
  );

  const { id } = req.params;

  const marketplaceService = req.scope.resolve(MARKETPLACE_MODULE) as {
    retrieveArtisanApplication: (
      id: string,
    ) => Promise<Record<string, unknown>>;
  };

  const application = await marketplaceService.retrieveArtisanApplication(
    id as string,
  );

  res.status(200).json({
    artisan_application: application,
  });
}
