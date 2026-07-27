import { MedusaService } from "@medusajs/framework/utils";
import {
  Vendor,
  VendorMember,
  VendorProfile,
  CatalogListing,
  ModerationDecision,
  StaffRoleAssignment,
  AuditEvent,
} from "./models/index.js";

class MarketplaceModuleService extends MedusaService({
  Vendor,
  VendorMember,
  VendorProfile,
  CatalogListing,
  ModerationDecision,
  StaffRoleAssignment,
  AuditEvent,
}) {}

export default MarketplaceModuleService;
