import { model } from "@medusajs/framework/utils";
import { VendorChildOrder } from "./vendor-child-order.js";
import { TrackingEvent } from "./tracking-event.js";

export const Shipment = model.define("shipment", {
  id: model.id().primaryKey(),
  child_order: model.belongsTo(() => VendorChildOrder, {
    mappedBy: "shipments",
  }),
  tracking_events: model.hasMany(() => TrackingEvent, {
    mappedBy: "shipment",
  }),
  carrier: model.enum(["nova_poshta"]),
  external_reference: model.text().nullable(),
  ttn_number: model.text().nullable(),
  source: model.enum(["synthetic", "provider"]).default("synthetic"),
  normalized_status: model
    .enum(["created", "in_transit", "delivered", "returned", "cancelled"])
    .default("created"),
  last_synced_at: model.dateTime().nullable(),
});
