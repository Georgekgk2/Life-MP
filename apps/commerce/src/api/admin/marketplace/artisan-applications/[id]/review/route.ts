import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import { assertStaffRole } from "../../../../../../modules/marketplace/authorization.js";
import { MARKETPLACE_MODULE } from "../../../../../../modules/marketplace/constants.js";
import type { AuthenticatedReq } from "../../../../../../types/service-types.js";

export const ArtisanApplicationReviewInput = z
  .object({
    status: z.enum(["under_review", "approved", "rejected"]),
    reviewer_notes: z.string().max(1000).optional(),
  })
  .strict();

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const reqWithAuth = req as unknown as AuthenticatedReq;
  await assertStaffRole(
    reqWithAuth.auth_context,
    "compliance_reviewer",
    req.scope,
  );

  const parseResult = ArtisanApplicationReviewInput.safeParse(req.body);
  if (!parseResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid review payload: ${JSON.stringify(parseResult.error.errors)}`,
    );
  }

  const { id } = req.params;
  const reviewerId =
    reqWithAuth.auth_context?.actor_id || "compliance_reviewer";

  const marketplaceService = req.scope.resolve(MARKETPLACE_MODULE) as {
    updateArtisanApplications: (
      input: {
        id: string;
        status: string;
        reviewer_notes?: string | null;
        reviewed_by?: string;
        reviewed_at?: Date;
      }[],
    ) => Promise<Record<string, unknown>[]>;
  };

  const [updated] = await marketplaceService.updateArtisanApplications([
    {
      id: id as string,
      status: parseResult.data.status,
      reviewer_notes: parseResult.data.reviewer_notes || null,
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
    },
  ]);

  res.status(200).json({
    artisan_application: updated,
  });
}
