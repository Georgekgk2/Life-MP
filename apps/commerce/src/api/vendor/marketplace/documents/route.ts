import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import { resolveVendorMembershipFromAuthContext } from "../../../../modules/marketplace/authorization.js";
import { uploadComplianceDocumentWorkflow } from "../../../../workflows/upload-compliance-document.js";
import type { AuthenticatedReq } from "../../../../types/service-types.js";

export const ComplianceDocumentInput = z
  .object({
    owner_type: z.enum(["vendor", "product"]).default("vendor"),
    owner_id: z.string().min(1),
    document_type: z.enum([
      "quality_certificate",
      "ses_conclusion",
      "organic_certificate",
      "declaration",
    ]),
    document_number: z.string().min(1).max(100),
    issuer: z.string().max(255).optional(),
    issued_at: z.string().optional(),
    expires_at: z.string().optional(),
    file_url: z.string().url().or(z.string().startsWith("/uploads/")),
  })
  .strict();

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const reqWithAuth = req as unknown as AuthenticatedReq;
  const membership = await resolveVendorMembershipFromAuthContext(
    reqWithAuth.auth_context,
    req.scope,
  );

  const parseResult = ComplianceDocumentInput.safeParse(req.body);
  if (!parseResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid compliance document payload: ${JSON.stringify(parseResult.error.errors)}`,
    );
  }

  const { result } = await uploadComplianceDocumentWorkflow(req.scope).run({
    input: {
      vendorId: membership.vendor_id,
      ownerType: parseResult.data.owner_type,
      ownerId: parseResult.data.owner_id,
      documentType: parseResult.data.document_type,
      documentNumber: parseResult.data.document_number,
      issuer: parseResult.data.issuer,
      issuedAt: parseResult.data.issued_at,
      expiresAt: parseResult.data.expires_at,
      fileUrl: parseResult.data.file_url,
      actorId: reqWithAuth.auth_context?.actor_id || "vendor_actor",
    },
  });

  res.status(201).json({ document: result });
}
