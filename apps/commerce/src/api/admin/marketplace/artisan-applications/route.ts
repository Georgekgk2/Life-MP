import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { assertStaffRole } from "../../../../modules/marketplace/authorization.js";
import { MARKETPLACE_MODULE } from "../../../../modules/marketplace/constants.js";
import type { AuthenticatedReq } from "../../../../types/service-types.js";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const reqWithAuth = req as unknown as AuthenticatedReq;
  await assertStaffRole(
    reqWithAuth.auth_context,
    "compliance_reviewer",
    req.scope,
  );

  const marketplaceService = req.scope.resolve(MARKETPLACE_MODULE) as {
    listAndCountArtisanApplications: (
      filter: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<[Record<string, unknown>[], number]>;
  };

  const status = req.query["status"] as string | undefined;
  const filter: Record<string, unknown> = {};
  if (status) {
    filter["status"] = status;
  }

  const [applications, count] =
    await marketplaceService.listAndCountArtisanApplications(filter, {
      order: { created_at: "DESC" },
    });

  res.status(200).json({
    artisan_applications: applications,
    count,
  });
}
