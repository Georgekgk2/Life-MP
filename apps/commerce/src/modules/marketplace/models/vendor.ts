import { model } from "@medusajs/framework/utils";
import { VendorMember } from "./vendor-member";
import { VendorProfile } from "./vendor-profile";
import { CatalogListing } from "./catalog-listing";

export const Vendor = model.define("vendor", {
  id: model.id().primaryKey(),
  handle: model.text().unique(),
  name: model.text(),
  status: model.enum(["active", "suspended"]).default("active"),
  members: model.hasMany(() => VendorMember, { mappedBy: "vendor" }),
  profile: model.hasOne(() => VendorProfile, { mappedBy: "vendor" }),
  listings: model.hasMany(() => CatalogListing, { mappedBy: "vendor" }),
});
