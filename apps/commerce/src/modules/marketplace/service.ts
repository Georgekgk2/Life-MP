import { MedusaService } from "@medusajs/framework/utils";
import {
  Vendor,
  VendorMember,
  VendorProfile,
  VendorVerification,
  ComplianceDocument,
  CatalogListing,
  ProductClaim,
  ModerationDecision,
  StaffRoleAssignment,
  AuditEvent,
} from "./models/index.js";

class MarketplaceModuleService extends MedusaService({
  Vendor,
  VendorMember,
  VendorProfile,
  VendorVerification,
  ComplianceDocument,
  CatalogListing,
  ProductClaim,
  ModerationDecision,
  StaffRoleAssignment,
  AuditEvent,
}) {}

export default MarketplaceModuleService;
