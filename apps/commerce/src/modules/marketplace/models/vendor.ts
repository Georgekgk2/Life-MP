import { model } from "@medusajs/framework/utils";
import { VendorMember } from "./vendor-member.js";
import { VendorProfile } from "./vendor-profile.js";
import { CatalogListing } from "./catalog-listing.js";
import { VendorVerification } from "./vendor-verification.js";
import { ComplianceDocument } from "./compliance-document.js";
import { VendorChildOrder } from "./vendor-child-order.js";
import { VendorPayable } from "./vendor-payable.js";
import { SettlementBatch } from "./settlement-batch.js";

export const Vendor = model.define("vendor", {
  id: model.id().primaryKey(),
  handle: model.text().unique(),
  name: model.text(),
  status: model.enum(["active", "suspended"]).default("active"),
  members: model.hasMany(() => VendorMember, { mappedBy: "vendor" }),
  profile: model.hasOne(() => VendorProfile, { mappedBy: "vendor" }),
  verification: model.hasOne(() => VendorVerification, { mappedBy: "vendor" }),
  documents: model.hasMany(() => ComplianceDocument, { mappedBy: "vendor" }),
  listings: model.hasMany(() => CatalogListing, { mappedBy: "vendor" }),
  child_orders: model.hasMany(() => VendorChildOrder, { mappedBy: "vendor" }),
  payables: model.hasMany(() => VendorPayable, { mappedBy: "vendor" }),
  settlement_batches: model.hasMany(() => SettlementBatch, {
    mappedBy: "vendor",
  }),
});
