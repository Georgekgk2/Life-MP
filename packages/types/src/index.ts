export type FoundationPackageName =
  | "@life/storefront"
  | "@life/commerce"
  | "@life/cms"
  | "@life/types"
  | "@life/config";

export type FoundationPackageMetadata<Name extends FoundationPackageName> =
  Readonly<{
    name: Name;
    state: "foundation";
  }>;
export function defineFoundationPackageMetadata<
  Name extends FoundationPackageName,
>(name: Name): FoundationPackageMetadata<Name> {
  return {
    name,
    state: "foundation",
  };
}

export type DemoAvailability = "demo-only";
export type StorefrontCatalogSource = "fixtures" | "medusa";
export type FulfillmentMode = "vendor_direct" | "platform_warehouse" | "hybrid";
export type SellerModel =
  "vendor_is_seller" | "platform_is_seller" | "lead_only";

export type VendorVerificationDTO = Readonly<{
  vendorId: string;
  taxIdentifier: string; // EDRPOU or RNOKPP
  legalName: string;
  verificationStatus: "pending" | "verified" | "rejected" | "suspended";
  verifiedAt?: string;
}>;

export type ComplianceDocumentDTO = Readonly<{
  id: string;
  documentType:
    | "quality_certificate"
    | "ses_conclusion"
    | "organic_certificate"
    | "declaration";
  documentNumber: string;
  status: "submitted" | "verified" | "expired" | "rejected";
  expiresAt?: string;
}>;

export type ProductClaimDTO = Readonly<{
  claimType: "organic" | "eco" | "natural" | "handmade" | "medical";
  publicBadgeText: string;
  isVerified: boolean;
  evidenceDocumentId?: string;
}>;

export type StorefrontCatalogCategory = Readonly<{
  id: string;
  slug: string;
  name: string;
  description: string;
}>;

export type StorefrontCatalogProduct = Readonly<{
  id: string;
  slug: string;
  categorySlug: string;
  name: string;
  description: string;
  priceUah: number;
  provider: Readonly<{
    handle: string;
    name: string;
  }>;
  isSynthetic: boolean;
  verifiedVendorBadge?: string;
  certifiedProductBadge?: string;
  organicProductBadge?: string;
}>;

export type StorefrontCatalogSnapshot = Readonly<{
  source: StorefrontCatalogSource;
  categories: readonly StorefrontCatalogCategory[];
  products: readonly StorefrontCatalogProduct[];
}>;

export type Category<Slug extends string = string> = Readonly<{
  id: string;
  slug: Slug;
  name: string;
  description: string;
}>;

export type Product<
  CategorySlug extends string = string,
  Slug extends string = string,
> = Readonly<{
  id: string;
  slug: Slug;
  categorySlug: CategorySlug;
  name: string;
  description: string;
  priceUah: number;
  availability: DemoAvailability;
}>;

export type Person<
  ProductSlug extends string = string,
  Slug extends string = string,
> = Readonly<{
  id: string;
  slug: Slug;
  name: string;
  role: string;
  description: string;
  featuredProductSlugs: readonly ProductSlug[];
}>;

export type Story<
  PersonSlug extends string = string,
  ProductSlug extends string = string,
  Slug extends string = string,
> = Readonly<{
  id: string;
  slug: Slug;
  title: string;
  summary: string;
  personSlug: PersonSlug;
  relatedProductSlugs: readonly ProductSlug[];
}>;

export type EventAgendaItem = Readonly<{
  time: string;
  title: string;
  description: string;
}>;

export type Event<
  PersonSlug extends string = string,
  ProductSlug extends string = string,
  Slug extends string = string,
> = Readonly<{
  id: string;
  slug: Slug;
  title: string;
  summary: string;
  dateLabel: string;
  timeLabel?: string;
  typeLabel?: string;
  location: string;
  personSlug: PersonSlug;
  description?: string;
  agenda?: readonly EventAgendaItem[];
  relatedProductSlugs?: readonly ProductSlug[];
}>;

export type CharityProject<
  PersonSlug extends string = string,
  PartnerId extends string = string,
  ProductSlug extends string = string,
  Slug extends string = string,
> = Readonly<{
  id: string;
  slug: Slug;
  title: string;
  summary: string;
  beneficiaryPersonSlug: PersonSlug;
  partnerIds: readonly PartnerId[];
  relatedProductSlugs: readonly ProductSlug[];
  status: DemoAvailability;
}>;

export type Partner<Slug extends string = string> = Readonly<{
  id: string;
  slug: Slug;
  name: string;
  summary: string;
  websiteLabel: string;
}>;
