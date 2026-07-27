export type AuthenticatedReq = {
  auth_context?: {
    actor_id?: string;
    auth_identity_id?: string;
  };
};

export type MarketplaceServiceType = {
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
