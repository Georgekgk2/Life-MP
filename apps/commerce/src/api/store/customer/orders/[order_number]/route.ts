import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MARKETPLACE_MODULE } from "../../../../../modules/marketplace/constants.js";
import {
  assertMarketplaceCoreLocalMode,
  resolveAuthenticatedActorId,
} from "../../../../../modules/marketplace/authorization.js";
import {
  isSyntheticDataAllowed,
  readCustomerOrders,
} from "../../../../../modules/marketplace/customer-orders.js";
import type { AuthenticatedReq } from "../../../../../types/service-types.js";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  assertMarketplaceCoreLocalMode();

  if (!isSyntheticDataAllowed()) {
    return res.status(503).json({
      type: "capability_unavailable",
      message: "Деталі замовлення недоступні в цьому режимі.",
    });
  }

  const authContext = (req as unknown as AuthenticatedReq).auth_context;
  const customerId = resolveAuthenticatedActorId(authContext);
  const service = req.scope.resolve(MARKETPLACE_MODULE) as never;
  const result = await readCustomerOrders(service, customerId);
  const orderNumber = req.params.order_number;
  const order = result.orders.find(
    (candidate) => candidate.orderNumber === orderNumber,
  );

  if (!order) {
    return res.status(404).json({
      type: "not_found",
      message: "Замовлення не знайдено.",
    });
  }

  return res.status(200).json({ order });
}
