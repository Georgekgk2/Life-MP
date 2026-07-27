import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MARKETPLACE_MODULE } from "../../../modules/marketplace/constants";
import { mapPublicCatalog } from "./mapper";
import type { MarketplaceServiceType } from "../../../types/service-types";

type VendorRecord = {
  id: string;
  handle: string;
  name: string;
};

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const nodeEnv = process.env["NODE_ENV"];
  const allowSynthetic = process.env["ALLOW_SYNTHETIC_CATALOG"] === "true";

  const isLocalOrTest = nodeEnv === "development" || nodeEnv === "test";

  if (!isLocalOrTest || !allowSynthetic) {
    return res.status(200).json({
      source: "medusa",
      categories: [],
      products: [],
    });
  }

  const marketplaceService = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as MarketplaceServiceType;

  const activeVendors = (await marketplaceService.listVendors({
    status: "active",
  })) as unknown as VendorRecord[];
  const activeVendorIds = activeVendors.map((v) => v.id);

  if (activeVendorIds.length === 0) {
    return res.status(200).json({
      source: "medusa",
      categories: [],
      products: [],
    });
  }

  const listings = (await marketplaceService.listCatalogListings({
    vendor_id: activeVendorIds,
    state: "published",
    visibility: ["synthetic", "local_demo"],
  })) as unknown as Record<string, unknown>[];

  const vendorMap = new Map<string, VendorRecord>(
    activeVendors.map((v) => [v.id, v]),
  );

  const snapshot = mapPublicCatalog(
    listings as Parameters<typeof mapPublicCatalog>[0],
    vendorMap,
  );

  res.status(200).json(snapshot);
}
