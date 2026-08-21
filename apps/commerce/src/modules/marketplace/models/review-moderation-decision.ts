import { model } from "@medusajs/framework/utils";
import { ProductReview } from "./product-review.js";

export const ReviewModerationDecision = model.define(
  "review_moderation_decision",
  {
    id: model.id().primaryKey(),
    review: model.belongsTo(() => ProductReview, {
      mappedBy: "moderation_decisions",
    }),
    reviewer_id: model.text(),
    target_status: model.enum(["approved", "rejected"]),
    rationale: model.text(),
  },
);
