import { model } from "@medusajs/framework/utils";
import { artisanApplicationStatuses } from "../constants.js";

export const ArtisanApplication = model.define("artisan_application", {
  id: model.id().primaryKey(),
  name: model.text(),
  workshop_name: model.text(),
  category: model.text(),
  description: model.text(),
  email: model.text(),
  phone: model.text(),
  portfolio_url: model.text().nullable(),
  status: model.enum([...artisanApplicationStatuses]).default("pending"),
  reviewer_notes: model.text().nullable(),
  reviewed_by: model.text().nullable(),
  reviewed_at: model.dateTime().nullable(),
});
