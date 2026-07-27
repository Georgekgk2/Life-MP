import { model } from "@medusajs/framework/utils";
import { CatalogListing } from "./catalog-listing.js";

export const ModerationDecision = model.define("moderation_decision", {
  id: model.id().primaryKey(),
  listing: model.belongsTo(() => CatalogListing, {
    mappedBy: "moderation_decisions",
  }),
  reviewer_id: model.text(),
  from_state: model.text(),
  to_state: model.text(),
  rationale: model.text().nullable(),
});
