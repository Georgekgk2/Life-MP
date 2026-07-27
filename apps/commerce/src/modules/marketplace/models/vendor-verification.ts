import { model } from "@medusajs/framework/utils";
import { Vendor } from "./vendor.js";

export const VendorVerification = model.define("vendor_verification", {
  id: model.id().primaryKey(),
  vendor: model.belongsTo(() => Vendor, {
    mappedBy: "verification",
  }),
  tax_identifier: model.text(),
  legal_name: model.text(),
  legal_address: model.text().nullable(),
  verification_status: model
    .enum(["pending", "verified", "rejected", "suspended"])
    .default("pending"),
  reviewed_by: model.text().nullable(),
  reviewed_at: model.dateTime().nullable(),
  notes: model.text().nullable(),
});
