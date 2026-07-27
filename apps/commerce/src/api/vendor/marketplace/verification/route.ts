import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import { resolveVendorMembershipFromAuthContext } from "../../../../modules/marketplace/authorization.js";
import { submitVendorVerificationWorkflow } from "../../../../workflows/submit-vendor-verification.js";
import type { AuthenticatedReq } from "../../../../types/service-types.js";

export const VendorVerificationInput = z
  .object({
    tax_identifier: z.string().min(8).max(10), // ЄДРПОУ (8) or РНОКПП (10)
    legal_name: z.string().min(1).max(255),
    legal_address: z.string().max(500).optional(),
  })
  .strict();

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const reqWithAuth = req as unknown as AuthenticatedReq;
  const membership = await resolveVendorMembershipFromAuthContext(
    reqWithAuth.auth_context,
    req.scope,
  );

  const parseResult = VendorVerificationInput.safeParse(req.body);
  if (!parseResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid verification payload: ${JSON.stringify(parseResult.error.errors)}`,
    );
  }

  const { result } = await submitVendorVerificationWorkflow(req.scope).run({
    input: {
      vendorId: membership.vendor_id,
      taxIdentifier: parseResult.data.tax_identifier,
      legalName: parseResult.data.legal_name,
      legalAddress: parseResult.data.legal_address,
      actorId: reqWithAuth.auth_context?.actor_id || "vendor_actor",
    },
  });

  res.status(201).json({ verification: result });
}
