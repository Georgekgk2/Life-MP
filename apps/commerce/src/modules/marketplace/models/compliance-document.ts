import { model } from "@medusajs/framework/utils";
import { Vendor } from "./vendor.js";

export const ComplianceDocument = model.define("compliance_document", {
  id: model.id().primaryKey(),
  vendor: model.belongsTo(() => Vendor, {
    mappedBy: "documents",
  }),
  owner_type: model.enum(["vendor", "product"]).default("vendor"),
  owner_id: model.text(),
  document_type: model.enum([
    "quality_certificate",
    "ses_conclusion",
    "organic_certificate",
    "declaration",
  ]),
  document_number: model.text(),
  issuer: model.text().nullable(),
  issued_at: model.dateTime().nullable(),
  expires_at: model.dateTime().nullable(),
  file_url: model.text(),
  status: model
    .enum(["submitted", "verified", "expired", "rejected"])
    .default("submitted"),
  reviewer_comment: model.text().nullable(),
});
