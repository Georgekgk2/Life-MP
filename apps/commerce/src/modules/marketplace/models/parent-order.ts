import { model } from "@medusajs/framework/utils";
import { VendorChildOrder } from "./vendor-child-order.js";

export const ParentOrder = model.define("parent_order", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  total_amount_uah: model.number(),
  status: model
    .enum(["pending", "paid", "canceled", "refunded"])
    .default("pending"),
  payment_transaction_id: model.text().nullable(),
  child_orders: model.hasMany(() => VendorChildOrder, {
    mappedBy: "parent_order",
  }),
});
