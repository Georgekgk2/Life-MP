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
  ArtisanApplication,
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
  ArtisanApplication,
}) {}

export default MarketplaceModuleService;
