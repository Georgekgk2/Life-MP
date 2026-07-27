import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import { MARKETPLACE_MODULE } from "../../../../modules/marketplace/constants";
import { assertStaffRole } from "../../../../modules/marketplace/authorization";
import type {
  AuthenticatedReq,
  MarketplaceServiceType,
} from "../../../../types/service-types";

const createVendorSchema = z
  .object({
    handle: z.string().min(2).max(80),
    name: z.string().min(2).max(200),
  })
  .strict();

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const reqWithAuth = req as unknown as AuthenticatedReq;
  await assertStaffRole(reqWithAuth.auth_context, "platform_admin", req.scope);

  const parseResult = createVendorSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid vendor input: ${parseResult.error.message}`,
    );
  }

  const marketplaceService = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as MarketplaceServiceType;
  const vendor = await marketplaceService.createVendors({
    handle: parseResult.data.handle,
    name: parseResult.data.name,
    status: "active",
  });

  await marketplaceService.createVendorProfiles({
    vendor_id: vendor["id"],
    display_name: vendor["name"],
  });

  await marketplaceService.createAuditEvents({
    actor_id:
      reqWithAuth.auth_context?.actor_id ||
      reqWithAuth.auth_context?.auth_identity_id,
    actor_type: "staff_user",
    action: "create_vendor",
    tenant_id: vendor["id"],
    payload: { handle: vendor["handle"], name: vendor["name"] },
  });

  res.status(201).json({ vendor });
}
