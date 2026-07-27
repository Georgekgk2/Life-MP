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
  ParentOrder,
  VendorChildOrder,
  VendorPayable,
  SettlementBatch,
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
  ParentOrder,
  VendorChildOrder,
  VendorPayable,
  SettlementBatch,
}) {}

export default MarketplaceModuleService;
