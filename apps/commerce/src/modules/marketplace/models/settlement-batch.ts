import { model } from "@medusajs/framework/utils";
import { Vendor } from "./vendor.js";

export const SettlementBatch = model.define("settlement_batch", {
  id: model.id().primaryKey(),
  vendor: model.belongsTo(() => Vendor, {
    mappedBy: "settlement_batches",
  }),
  total_amount_uah: model.number(),
  status: model.enum(["draft", "processed"]).default("draft"),
  processed_at: model.dateTime().nullable(),
});
