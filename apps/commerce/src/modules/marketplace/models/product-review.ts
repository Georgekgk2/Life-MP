import { model } from "@medusajs/framework/utils";

import { ReviewModerationDecision } from "./review-moderation-decision.js";

export const ProductReview = model.define("product_review", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  order_line_id: model.text().unique(),
  parent_order_id: model.text(),
  child_order_id: model.text(),
  product_id: model.text(),
  vendor_id: model.text(),
  mode: model.enum(["synthetic", "live"]).nullable(),
  rating: model.number(),
  body: model.text(),
  display_name: model.text().nullable(),
  status: model.enum(["pending", "approved", "rejected"]).default("pending"),
  moderator_id: model.text().nullable(),
  moderation_rationale: model.text().nullable(),
  reviewed_at: model.dateTime().nullable(),
  moderation_decisions: model.hasMany(() => ReviewModerationDecision, {
    mappedBy: "review",
  }),
});
