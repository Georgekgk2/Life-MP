import { Module } from "@medusajs/framework/utils";
import { MARKETPLACE_MODULE } from "./constants";
import MarketplaceModuleService from "./service";

export default Module(MARKETPLACE_MODULE, {
  service: MarketplaceModuleService,
});
