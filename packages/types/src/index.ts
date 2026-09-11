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
  imageSrc?: string;
}>;

export type StorefrontCatalogProduct = Readonly<{
  id: string;
  slug: string;
  categorySlug: string;
  name: string;
  description: string;
  priceUah: number;
  imageSrc?: string;
  provider: Readonly<{
    handle: string;
    name: string;
    region?: string;
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
  imageSrc?: string;
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
  imageSrc?: string;
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
  region?: string;
  imageSrc?: string;
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
  imageSrc?: string;
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
  imageSrc?: string;
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

export type SearchSortOption =
  "default" | "price-asc" | "price-desc" | "name-asc";

export type SearchQueryOptions = Readonly<{
  limit?: number;
  offset?: number;
  categorySlug?: string;
  isOrganic?: boolean;
  isCertified?: boolean;
  isVerifiedVendor?: boolean;
  minPriceUah?: number;
  maxPriceUah?: number;
  sortBy?: SearchSortOption;
}>;

export type ProductSearchResult = Readonly<{
  items: readonly StorefrontCatalogProduct[];
  totalCount: number;
  queryTimeMs: number;
  providerName: "postgres_fts" | "meilisearch";
}>;

export type UnifiedSearchSuggestion = Readonly<{
  id: string;
  type: "product" | "workshop" | "event";
  title: string;
  subtitle?: string;
  url: string;
  highlight?: string;
}>;

export type UnifiedSearchResult = Readonly<{
  query: string;
  suggestions: readonly UnifiedSearchSuggestion[];
  products: readonly StorefrontCatalogProduct[];
  totalCount: number;
  queryTimeMs: number;
  providerName: "postgres_fts" | "meilisearch";
}>;

export interface SearchProvider {
  readonly name: "postgres_fts" | "meilisearch";
  searchProducts(
    query: string,
    options?: SearchQueryOptions,
  ): Promise<ProductSearchResult>;
  searchUnified(query: string, limit?: number): Promise<UnifiedSearchResult>;
  indexProducts?(products: readonly StorefrontCatalogProduct[]): Promise<void>;
}

// --------------------------------------------------------------------------
// Multi-Vendor Transactional Sandbox Contracts (Phase 4C)
// --------------------------------------------------------------------------

export type CartItem = Readonly<{
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  priceUah: number;
  quantity: number;
  vendorHandle: string;
  vendorName: string;
  imageUrl?: string;
}>;

export type CartVendorGroup = Readonly<{
  vendorHandle: string;
  vendorName: string;
  items: readonly CartItem[];
  subtotalUah: number;
}>;

export type MultiVendorCart = Readonly<{
  items: readonly CartItem[];
  vendorGroups: readonly CartVendorGroup[];
  totalItems: number;
  totalAmountUah: number;
}>;

export type CheckoutCustomerInput = Readonly<{
  fullName: string;
  phone: string;
  email: string;
  city: string;
  novaPoshtaBranch: string;
  paymentMethod: "sandbox_escrow" | "card_on_delivery";
  comment?: string;
}>;

export type ParentOrderStatus =
  | "pending_payment"
  | "escrow_held"
  | "processing"
  | "partially_fulfilled"
  | "completed"
  | "cancelled";

export type VendorChildOrderStatus =
  "pending" | "accepted" | "shipped" | "delivered" | "settled" | "cancelled";

export type NovaPoshtaTrackingStatus =
  | 1 // Створено ЕН
  | 4 // Посилка прямує до отримувача
  | 5 // Посилка прямує до отримувача
  | 7 // Прибуло у відділення
  | 8 // Прибуло у поштомат
  | 9 // Отримано та оплачено (Вручено)
  | 102 // Відмова від отримання
  | 103; // Повернення відправнику

export type ParentOrder = Readonly<{
  id: string;
  orderNumber: string;
  customer: CheckoutCustomerInput;
  items: readonly CartItem[];
  totalAmountUah: number;
  status: ParentOrderStatus;
  childOrderIds: readonly string[];
  escrowHoldId?: string;
  createdAt: string;
}>;

export type VendorChildOrder = Readonly<{
  id: string;
  parentOrderId: string;
  parentOrderNumber: string;
  vendorHandle: string;
  vendorName: string;
  items: readonly CartItem[];
  subtotalUah: number;
  platformCommissionUah: number;
  vendorPayoutUah: number;
  status: VendorChildOrderStatus;
  trackingNumber: string;
  trackingStatusCode: NovaPoshtaTrackingStatus;
  trackingStatusName: string;
  createdAt: string;
  deliveredAt?: string;
  settledAt?: string;
}>;

export type EscrowHoldRecord = Readonly<{
  id: string;
  parentOrderId: string;
  amountUah: number;
  status: "held" | "captured" | "refunded";
  provider: "sandbox_escrow";
  heldAt: string;
  capturedAt?: string;
}>;

export type SettlementBatchRecord = Readonly<{
  id: string;
  vendorHandle: string;
  vendorName: string;
  childOrderId: string;
  payoutAmountUah: number;
  commissionAmountUah: number;
  status: "pending" | "approved" | "settled";
  settledAt: string;
  iban?: string;
}>;

// --------------------------------------------------------------------------
// Reviews, Ratings & Community Trust Contracts (Phase 3)
// --------------------------------------------------------------------------

export type ProductReview = Readonly<{
  id: string;
  productSlug: string;
  productName: string;
  authorName: string;
  authorCity: string;
  rating: number; // 1 to 5
  comment: string;
  verifiedPurchase: boolean;
  moderationStatus: "approved" | "pending" | "rejected";
  moderatorNotes?: string;
  createdAt: string;
}>;

export type ProductRatingSummary = Readonly<{
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Readonly<{
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  }>;
}>;
// --------------------------------------------------------------------------
// Customer Orders & Verified Reviews (Phase 4D sandbox/read-model contracts)
// --------------------------------------------------------------------------

export type OrderMode = "synthetic" | "live";

export type OrderLifecycleStatus =
  "pending" | "processing" | "partially_fulfilled" | "completed" | "cancelled";

export type PaymentStatus =
  "not_applicable" | "pending" | "authorized" | "captured" | "refunded";

export type FulfillmentStatus =
  "pending" | "accepted" | "shipped" | "delivered" | "returned" | "cancelled";

export type PayoutStatus =
  "not_applicable" | "pending" | "settled" | "reversed";

export type TrackingSource = "synthetic" | "provider";

export type CustomerOrderLineDTO = Readonly<{
  orderLineId: string;
  productId: string;
  catalogListingId?: string;
  vendorId: string;
  productName: string;
  quantity: number;
  unitPriceUah: number;
  lineTotalUah: number;
  reviewEligibility:
    | { eligible: true }
    | {
        eligible: false;
        reason:
          | "not_delivered"
          | "review_exists"
          | "not_authenticated"
          | "unavailable";
      };
}>;

export type TrackingEventDTO = Readonly<{
  id: string;
  status: "created" | "in_transit" | "delivered" | "returned" | "cancelled";
  label: string;
  occurredAt: string;
  source: TrackingSource;
}>;

export type CustomerShipmentDTO = Readonly<{
  childOrderId: string;
  vendor: Readonly<{ id: string; name: string }>;
  fulfillmentStatus: FulfillmentStatus;
  tracking: Readonly<{
    carrier: "nova_poshta";
    ttnNumber: string | null;
    status: TrackingEventDTO["status"];
    events: readonly TrackingEventDTO[];
  }>;
  lines: readonly CustomerOrderLineDTO[];
}>;

export type CustomerOrderDTO = Readonly<{
  id: string;
  orderNumber: string;
  mode: OrderMode;
  lifecycleStatus: OrderLifecycleStatus;
  paymentStatus: PaymentStatus;
  payoutStatus: PayoutStatus;
  createdAt: string;
  totalUah: number;
  shipments: readonly CustomerShipmentDTO[];
}>;

export type CustomerOrderListDTO = Readonly<{
  orders: readonly CustomerOrderDTO[];
  nextCursor: string | null;
}>;

export type ProductReviewStatus = "pending" | "approved" | "rejected";

export type ProductReviewDTO = Readonly<{
  id: string;
  productId: string;
  vendorId: string;
  displayName: string;
  rating: number;
  body: string;
  verifiedPurchase: true;
  status: "approved";
  createdAt: string;
}>;

export type ProductReviewSummaryDTO = Readonly<{
  averageRating: number | null;
  totalReviews: number;
  ratingBreakdown: Readonly<{
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  }>;
}>;

export type ProductReviewsDTO = Readonly<{
  reviews: readonly ProductReviewDTO[];
  summary: ProductReviewSummaryDTO;
}>;
