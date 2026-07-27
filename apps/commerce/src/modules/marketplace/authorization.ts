import { MedusaError } from "@medusajs/framework/utils";
import { MARKETPLACE_MODULE } from "./constants";

type AuthContextInput = {
  actor_id?: string;
  auth_identity_id?: string;
};

type ContainerScope = {
  resolve: (key: string) => unknown;
};

type VendorMemberRecord = {
  id: string;
  vendor_id: string;
  auth_identity_id: string;
  role: string;
  active: boolean;
};

type ListingRecord = {
  id: string;
  vendor_id: string;
  state: string;
};

type StaffAssignmentRecord = {
  id: string;
  user_id: string;
  role: "platform_admin" | "compliance_reviewer";
};

export function assertMarketplaceCoreLocalMode(): void {
  const env = process.env["NODE_ENV"];
  if (env !== "development" && env !== "test") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Marketplace private core routes are rejected in production mode.",
    );
  }
}

export async function resolveVendorMembershipFromAuthContext(
  authContext: AuthContextInput | undefined,
  container: ContainerScope,
): Promise<VendorMemberRecord> {
  const actorId = authContext?.actor_id || authContext?.auth_identity_id;
  if (!actorId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Missing authenticated identity context.",
    );
  }

  const marketplaceService = container.resolve(MARKETPLACE_MODULE) as {
    listVendorMembers: (query: Record<string, unknown>) => Promise<unknown[]>;
  };
  const [member] = (await marketplaceService.listVendorMembers({
    auth_identity_id: actorId,
    active: true,
  })) as VendorMemberRecord[];

  if (!member) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Authenticated identity has no active vendor membership.",
    );
  }

  return member;
}

export async function assertVendorListingAccess(
  membership: VendorMemberRecord,
  listingId: string,
  container: ContainerScope,
): Promise<ListingRecord> {
  const marketplaceService = container.resolve(MARKETPLACE_MODULE) as {
    retrieveCatalogListing: (id: string) => Promise<unknown>;
  };
  const listing = (await marketplaceService.retrieveCatalogListing(
    listingId,
  )) as ListingRecord | null;

  if (!listing || listing.vendor_id !== membership.vendor_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Listing with id ${listingId} not found for current vendor.`,
    );
  }

  return listing;
}

export async function assertStaffRole(
  authContext: AuthContextInput | undefined,
  requiredRole: "platform_admin" | "compliance_reviewer",
  container: ContainerScope,
): Promise<StaffAssignmentRecord> {
  const userId = authContext?.actor_id || authContext?.auth_identity_id;
  if (!userId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Missing authenticated user context.",
    );
  }

  const marketplaceService = container.resolve(MARKETPLACE_MODULE) as {
    listStaffRoleAssignments: (
      query: Record<string, unknown>,
    ) => Promise<unknown[]>;
  };
  const [assignment] = (await marketplaceService.listStaffRoleAssignments({
    user_id: userId,
  })) as StaffAssignmentRecord[];

  if (!assignment) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `User ${userId} has no staff role assigned.`,
    );
  }

  if (
    assignment.role !== "platform_admin" &&
    assignment.role !== requiredRole
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `User requires ${requiredRole} staff role.`,
    );
  }

  return assignment;
}

export async function assertReviewerMayDecide(
  authContext: AuthContextInput | undefined,
  listing: ListingRecord,
  container: ContainerScope,
): Promise<void> {
  const reviewerId = authContext?.actor_id || authContext?.auth_identity_id;
  if (!reviewerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Missing authenticated reviewer context.",
    );
  }

  const marketplaceService = container.resolve(MARKETPLACE_MODULE) as {
    listVendorMembers: (query: Record<string, unknown>) => Promise<unknown[]>;
  };
  const [member] = await marketplaceService.listVendorMembers({
    auth_identity_id: reviewerId,
    vendor_id: listing.vendor_id,
    active: true,
  });

  if (member) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Compliance reviewer cannot review a listing belonging to a vendor where they hold active membership.",
    );
  }
}
