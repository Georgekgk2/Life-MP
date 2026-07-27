import { model } from "@medusajs/framework/utils";
import { ParentOrder } from "./parent-order.js";
import { Vendor } from "./vendor.js";

export const VendorChildOrder = model.define("vendor_child_order", {
  id: model.id().primaryKey(),
  parent_order: model.belongsTo(() => ParentOrder, {
    mappedBy: "child_orders",
  }),
  vendor: model.belongsTo(() => Vendor, {
    mappedBy: "child_orders",
  }),
  gross_amount_uah: model.number(),
  commission_amount_uah: model.number(),
  net_payable_uah: model.number(),
  status: model
    .enum([
      "pending",
      "processing",
      "shipped",
      "delivered",
      "canceled",
      "refunded",
    ])
    .default("pending"),
  ttn_number: model.text().nullable(),
});
