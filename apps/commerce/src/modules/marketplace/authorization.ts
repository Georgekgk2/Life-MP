import { MedusaError } from "@medusajs/framework/utils";
import { MARKETPLACE_MODULE } from "./constants";

export type AuthContextInput = {
  actor_id?: string;
  auth_identity_id?: string;
};

type ContainerScope = {
  resolve: (key: string) => unknown;
};

function requireActorId(authContext: AuthContextInput | undefined): string {
  const actorId = authContext?.actor_id;
  if (!actorId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Потрібна автентифікація покупця.",
    );
  }
  return actorId;
}

function requireAuthIdentityId(
  authContext: AuthContextInput | undefined,
): string {
  const authIdentityId = authContext?.auth_identity_id;
  if (!authIdentityId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Відсутній контекст auth identity.",
    );
  }
  return authIdentityId;
}

export function resolveAuthenticatedActorId(
  authContext: AuthContextInput | undefined,
): string {
  return requireActorId(authContext);
}

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
      "Приватні маршрути marketplace core заборонені в production-режимі.",
    );
  }
}

export async function resolveVendorMembershipFromAuthContext(
  authContext: AuthContextInput | undefined,
  container: ContainerScope,
): Promise<VendorMemberRecord> {
  const authIdentityId = requireAuthIdentityId(authContext);
  const marketplaceService = container.resolve(MARKETPLACE_MODULE) as {
    listVendorMembers: (query: Record<string, unknown>) => Promise<unknown[]>;
  };
  const [member] = (await marketplaceService.listVendorMembers({
    auth_identity_id: authIdentityId,
    active: true,
  })) as VendorMemberRecord[];

  if (!member) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Автентифікована auth identity не має активного членства майстерні.",
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
      `Виріб каталогу з ідентифікатором ${listingId} не знайдено для поточної майстерні.`,
    );
  }

  return listing;
}

export async function assertStaffRole(
  authContext: AuthContextInput | undefined,
  requiredRole: "platform_admin" | "compliance_reviewer",
  container: ContainerScope,
): Promise<StaffAssignmentRecord> {
  const userId = requireActorId(authContext);

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
      `Для користувача ${userId} не призначено роль staff.`,
    );
  }

  if (
    assignment.role !== "platform_admin" &&
    assignment.role !== requiredRole
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Для користувача потрібна роль ${requiredRole}.`,
    );
  }

  return assignment;
}

export async function assertReviewerMayDecide(
  authContext: AuthContextInput | undefined,
  listing: ListingRecord,
  container: ContainerScope,
): Promise<void> {
  if (!listing.vendor_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Неможливо перевірити конфлікт майстерні без vendor context.",
    );
  }
  requireActorId(authContext);
  const authIdentityId = requireAuthIdentityId(authContext);

  const marketplaceService = container.resolve(MARKETPLACE_MODULE) as {
    listVendorMembers: (query: Record<string, unknown>) => Promise<unknown[]>;
  };
  const [member] = await marketplaceService.listVendorMembers({
    auth_identity_id: authIdentityId,
    vendor_id: listing.vendor_id,
    active: true,
  });

  if (member) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Рецензент відповідності не може перевіряти виріб майстерні, у якій має активне членство.",
    );
  }
}
