import type {
  SyntheticOrderCreateInput,
  SyntheticOrderCreateResult,
} from "../modules/marketplace/customer-orders.js";

export type AuthenticatedReq = {
  auth_context?: {
    actor_id?: string;
    auth_identity_id?: string;
  };
};

export type ProductReviewModerationInput = {
  reviewId: string;
  reviewerId: string;
  targetStatus: "approved" | "rejected";
  rationale: string;
  correlationId?: string | null;
};

export type ProductReviewModerationResult =
  | {
      conflict: true;
    }
  | {
      review: Record<string, unknown>;
      decision: Record<string, unknown>;
    };

export type MarketplaceServiceType = {
  moderateProductReview: (
    input: ProductReviewModerationInput,
    sharedContext?: unknown,
  ) => Promise<ProductReviewModerationResult>;
  createSyntheticOrder: (
    input: SyntheticOrderCreateInput,
    sharedContext?: unknown,
  ) => Promise<SyntheticOrderCreateResult>;
  listParentOrders: (
    query: Record<string, unknown>,
  ) => Promise<Record<string, unknown>[]>;
  listVendors: (
    query: Record<string, unknown>,
  ) => Promise<Record<string, unknown>[]>;
  createVendors: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  retrieveVendor: (id: string) => Promise<Record<string, unknown> | null>;
  createVendorProfiles: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  listVendorMembers: (
    query: Record<string, unknown>,
  ) => Promise<Record<string, unknown>[]>;
  createVendorMembers: (
    data: Record<string, unknown> | Record<string, unknown>[],
  ) => Promise<Record<string, unknown>>;
  listCatalogListings: (
    query: Record<string, unknown>,
  ) => Promise<Record<string, unknown>[]>;
  retrieveCatalogListing: (
    id: string,
  ) => Promise<Record<string, unknown> | null>;
  createCatalogListings: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  updateCatalogListings: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  listStaffRoleAssignments: (
    query: Record<string, unknown>,
  ) => Promise<Record<string, unknown>[]>;
  createStaffRoleAssignments: (
    data: Record<string, unknown> | Record<string, unknown>[],
  ) => Promise<Record<string, unknown>>;
  createModerationDecisions: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  createAuditEvents: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;

  // Compliance & Verification additions
  listVendorVerifications: (
    query: Record<string, unknown>,
  ) => Promise<Record<string, unknown>[]>;
  createVendorVerifications: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  updateVendorVerifications: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  retrieveVendorVerification: (
    id: string,
  ) => Promise<Record<string, unknown> | null>;

  createComplianceDocuments: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  updateComplianceDocuments: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  retrieveComplianceDocument: (
    id: string,
  ) => Promise<Record<string, unknown> | null>;

  retrieveProductClaim: (id: string) => Promise<Record<string, unknown> | null>;
  updateProductClaims: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
};

export type ProductServiceType = {
  listProductCategories: (
    query: Record<string, unknown>,
  ) => Promise<Record<string, unknown>[]>;
  createProductCategories: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  listProducts: (
    query: Record<string, unknown>,
  ) => Promise<Record<string, unknown>[]>;
  createProducts: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
};

export type RemoteLinkType = {
  create: (links: Record<string, Record<string, unknown>>) => Promise<void>;
};
