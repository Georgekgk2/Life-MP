import { model } from "@medusajs/framework/utils";
import { Vendor } from "./vendor.js";
import { ModerationDecision } from "./moderation-decision.js";
import { ProductClaim } from "./product-claim.js";

export const CatalogListing = model.define("catalog_listing", {
  id: model.id().primaryKey(),
  vendor: model.belongsTo(() => Vendor, {
    mappedBy: "listings",
  }),
  title: model.text(),
  description: model.text(),
  state: model
    .enum([
      "draft",
      "submitted",
      "under_review",
      "changes_requested",
      "approved",
      "published",
      "rejected",
      "archived",
    ])
    .default("draft"),
  visibility: model.enum(["internal", "local_demo"]).default("internal"),
  synthetic: model.boolean().default(false),
  submitted_at: model.dateTime().nullable(),
  published_at: model.dateTime().nullable(),
  moderation_decisions: model.hasMany(() => ModerationDecision, {
    mappedBy: "listing",
  }),
  claims: model.hasMany(() => ProductClaim, {
    mappedBy: "catalog_listing",
  }),
});
