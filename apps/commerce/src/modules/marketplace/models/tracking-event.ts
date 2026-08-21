import { model } from "@medusajs/framework/utils";
import { Shipment } from "./shipment.js";

export const TrackingEvent = model.define("tracking_event", {
  id: model.id().primaryKey(),
  shipment: model.belongsTo(() => Shipment, {
    mappedBy: "tracking_events",
  }),
  provider_status_code: model.number().nullable(),
  normalized_status: model.enum([
    "created",
    "in_transit",
    "delivered",
    "returned",
    "cancelled",
  ]),
  label: model.text(),
  occurred_at: model.dateTime(),
  source: model.enum(["synthetic", "provider"]).default("synthetic"),
  payload_hash: model.text().nullable(),
});
