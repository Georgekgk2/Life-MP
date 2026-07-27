import { model } from "@medusajs/framework/utils";
import { Vendor } from "./vendor.js";

export const VendorMember = model.define("vendor_member", {
  id: model.id().primaryKey(),
  vendor: model.belongsTo(() => Vendor, {
    mappedBy: "members",
  }),
  auth_identity_id: model.text(),
  role: model.enum(["owner", "manager"]).default("owner"),
  active: model.boolean().default(true),
});
