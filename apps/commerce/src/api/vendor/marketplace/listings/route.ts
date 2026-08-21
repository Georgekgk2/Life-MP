import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules } from "@medusajs/framework/utils";
import { z } from "zod";
import { MARKETPLACE_MODULE } from "../../../../modules/marketplace/constants";
import { resolveVendorMembershipFromAuthContext } from "../../../../modules/marketplace/authorization";
import type {
  AuthenticatedReq,
  MarketplaceServiceType,
  ProductServiceType,
  RemoteLinkType,
} from "../../../../types/service-types";

export const VendorListingCreateInput = z
  .object({
    title: z.string().min(1).max(160),
    description: z.string().min(1).max(5000),
  })
  .strict();

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const reqWithAuth = req as unknown as AuthenticatedReq;
  const membership = await resolveVendorMembershipFromAuthContext(
    reqWithAuth.auth_context,
    req.scope,
  );

  const marketplaceService = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as MarketplaceServiceType;
  const listings = await marketplaceService.listCatalogListings({
    vendor_id: membership.vendor_id,
  });

  res.status(200).json({ listings });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const reqWithAuth = req as unknown as AuthenticatedReq;
  const membership = await resolveVendorMembershipFromAuthContext(
    reqWithAuth.auth_context,
    req.scope,
  );

  const parseResult = VendorListingCreateInput.safeParse(req.body);
  if (!parseResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid listing creation input: ${parseResult.error.message}`,
    );
  }

  const marketplaceService = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as MarketplaceServiceType;
  const productService = req.scope.resolve(
    Modules.PRODUCT,
  ) as unknown as ProductServiceType;
  const remoteLink = req.scope.resolve(
    "remoteLink",
  ) as unknown as RemoteLinkType;

  const vendorHandleSuffix = membership.vendor_id
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(-8);
  const generatedHandle = `vendor-${vendorHandleSuffix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const product = await productService.createProducts({
    title: parseResult.data.title,
    handle: generatedHandle,
    status: "draft",
  });

  const listing = await marketplaceService.createCatalogListings({
    vendor_id: membership.vendor_id,
    title: parseResult.data.title,
    description: parseResult.data.description,
    state: "draft",
    visibility: "internal",
    synthetic: false,
  });

  if (remoteLink && typeof remoteLink.create === "function") {
    await remoteLink.create({
      [MARKETPLACE_MODULE]: { catalog_listing_id: listing["id"] },
      [Modules.PRODUCT]: { product_id: product["id"] },
    });
  }

  await marketplaceService.createAuditEvents({
    actor_id:
      reqWithAuth.auth_context?.actor_id ||
      reqWithAuth.auth_context?.auth_identity_id,
    actor_type: "vendor_member",
    action: "create_catalog_listing",
    tenant_id: membership.vendor_id,
    listing_id: listing["id"],
    payload: {
      title: listing["title"],
      product_id: product["id"],
    },
  });

  res.status(201).json({ listing, product_id: product["id"] });
}
