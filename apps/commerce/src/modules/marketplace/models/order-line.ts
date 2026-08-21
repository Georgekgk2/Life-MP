import { model } from "@medusajs/framework/utils";
import { VendorChildOrder } from "./vendor-child-order.js";

export const OrderLine = model.define("order_line", {
  id: model.id().primaryKey(),
  child_order: model.belongsTo(() => VendorChildOrder, {
    mappedBy: "order_lines",
  }),
  parent_order_id: model.text(),
  vendor_id: model.text(),
  product_id: model.text(),
  catalog_listing_id: model.text().nullable(),
  product_name_snapshot: model.text(),
  unit_price_uah: model.number(),
  quantity: model.number(),
  line_total_uah: model.number(),
});
