import { model } from "@medusajs/framework/utils";
import { VendorChildOrder } from "./vendor-child-order.js";

export const ParentOrder = model.define("parent_order", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  order_number: model.text().unique(),
  mode: model.enum(["synthetic", "live"]).nullable(),
  // Legacy status remains mapped so old images can read rows during additive migration rollout.
  status: model
    .enum(["pending", "paid", "canceled", "refunded"])
    .default("pending"),
  lifecycle_status: model
    .enum([
      "pending",
      "processing",
      "partially_fulfilled",
      "completed",
      "cancelled",
    ])
    .default("pending"),
  payment_status: model
    .enum(["not_applicable", "pending", "authorized", "captured", "refunded"])
    .default("not_applicable"),
  payout_status: model
    .enum(["not_applicable", "pending", "settled", "reversed"])
    .default("not_applicable"),
  total_amount_uah: model.number(),
  payment_transaction_id: model.text().nullable(),
  child_orders: model.hasMany(() => VendorChildOrder, {
    mappedBy: "parent_order",
  }),
});
