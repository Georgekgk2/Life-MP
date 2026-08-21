import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MARKETPLACE_MODULE } from "../../../../../../modules/marketplace/constants.js";
import { assertMarketplaceCoreLocalMode } from "../../../../../../modules/marketplace/authorization.js";
import {
  isSyntheticReviewsAllowed,
  mapApprovedProductReviews,
} from "../../../../../../modules/marketplace/customer-orders.js";
import type { MarketplaceServiceType } from "../../../../../../types/service-types.js";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  assertMarketplaceCoreLocalMode();

  if (!isSyntheticReviewsAllowed()) {
    return res.status(503).json({
      type: "capability_unavailable",
      message: "Відгуки недоступні в цьому режимі.",
    });
  }

  const service = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as unknown as MarketplaceServiceType & {
    listProductReviews: (
      query: Record<string, unknown>,
    ) => Promise<Record<string, unknown>[]>;
  };
  const reviews = await service.listProductReviews({
    product_id: req.params.product_id,
    status: "approved",
  });

  return res.status(200).json(mapApprovedProductReviews(reviews));
}
