import { model } from "@medusajs/framework/utils";
import { Vendor } from "./vendor.js";

export const VendorProfile = model.define("vendor_profile", {
  id: model.id().primaryKey(),
  vendor: model.belongsTo(() => Vendor, {
    mappedBy: "profile",
  }),
  display_name: model.text(),
  summary: model.text().nullable(),
  location: model.text().nullable(),
});
