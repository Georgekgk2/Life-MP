export const MARKETPLACE_MODULE = "marketplace";

export const vendorMemberRoles = ["owner", "manager"] as const;
export type VendorMemberRole = (typeof vendorMemberRoles)[number];

export const staffRoles = ["platform_admin", "compliance_reviewer"] as const;
export type StaffRole = (typeof staffRoles)[number];

export const listingStates = [
  "draft",
  "submitted",
  "under_review",
  "changes_requested",
  "approved",
  "published",
  "rejected",
  "archived",
] as const;
export type ListingState = (typeof listingStates)[number];

export const listingVisibilities = ["internal", "local_demo"] as const;
export type ListingVisibility = (typeof listingVisibilities)[number];

export const artisanApplicationStatuses = [
  "pending",
  "under_review",
  "approved",
  "rejected",
] as const;
export type ArtisanApplicationStatus =
  (typeof artisanApplicationStatuses)[number];
