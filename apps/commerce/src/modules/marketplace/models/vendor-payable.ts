import { model } from "@medusajs/framework/utils";
import { Vendor } from "./vendor.js";

export const VendorPayable = model.define("vendor_payable", {
  id: model.id().primaryKey(),
  vendor: model.belongsTo(() => Vendor, {
    mappedBy: "payables",
  }),
  child_order_id: model.text(),
  amount_uah: model.number(),
  status: model
    .enum(["unsettled", "pending_payout", "settled"])
    .default("unsettled"),
  settlement_batch_id: model.text().nullable(),
});
