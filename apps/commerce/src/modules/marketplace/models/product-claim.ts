import { model } from "@medusajs/framework/utils";
import { CatalogListing } from "./catalog-listing.js";

export const ProductClaim = model.define("product_claim", {
  id: model.id().primaryKey(),
  catalog_listing: model.belongsTo(() => CatalogListing, {
    mappedBy: "claims",
  }),
  claim_type: model.enum(["organic", "eco", "natural", "handmade", "medical"]),
  public_badge_text: model.text(),
  evidence_document_id: model.text().nullable(),
  review_status: model
    .enum(["draft", "submitted", "approved", "rejected", "expired", "revoked"])
    .default("draft"),
  public_visibility: model.boolean().default(false),
});
