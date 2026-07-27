import { model } from "@medusajs/framework/utils";

export const AuditEvent = model.define("audit_event", {
  id: model.id().primaryKey(),
  actor_id: model.text(),
  actor_type: model.text(),
  action: model.text(),
  tenant_id: model.text().nullable(),
  listing_id: model.text().nullable(),
  correlation_id: model.text().nullable(),
  payload: model.json().nullable(),
});
