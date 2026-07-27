import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import MarketplaceModule from "../modules/marketplace";

const productLinkable = (
  ProductModule as unknown as { linkable: Record<string, unknown> }
).linkable["product"];

export default defineLink(
  MarketplaceModule.linkable.catalogListing,
  productLinkable as unknown as Parameters<typeof defineLink>[1],
);
