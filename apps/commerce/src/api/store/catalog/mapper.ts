import type {
  StorefrontCatalogSnapshot,
  StorefrontCatalogCategory,
  StorefrontCatalogProduct,
} from "@life/types";

type ListingRow = Record<string, unknown> & {
  id: string;
  vendor_id: string;
  title?: string;
  description?: string;
  synthetic?: boolean;
  claims?: Array<{
    claim_type: string;
    review_status: string;
    public_visibility: boolean;
    public_badge_text?: string;
  }>;
  product?: Record<string, unknown>;
  __product?: Record<string, unknown>;
};

type VendorRow = {
  handle: string;
  name: string;
  isVerified?: boolean;
};

type CategoryItem = {
  id?: string;
  handle?: string;
  slug?: string;
  name?: string;
  description?: string;
};

type VariantPrice = {
  currency_code?: string;
  amount?: number;
};

export function mapPublicCatalog(
  listings: ListingRow[],
  vendorMap: Map<string, VendorRow>,
): StorefrontCatalogSnapshot {
  const categoryMap = new Map<string, StorefrontCatalogCategory>();
  const products: StorefrontCatalogProduct[] = [];

  for (const listing of listings) {
    const vendor = vendorMap.get(listing.vendor_id) || {
      handle: "unknown",
      name: "Виробник",
    };

    const product = (listing.product || listing.__product || {}) as Record<
      string,
      unknown
    >;
    const categories = product["categories"] as CategoryItem[] | undefined;
    const category = categories?.[0] || {
      handle: "general",
      name: "Загальна",
      description: "Товари спільноти",
    };

    const catSlug = category.handle || category.slug || "general";

    if (!categoryMap.has(catSlug)) {
      categoryMap.set(catSlug, {
        id: category.id || `cat-${catSlug}`,
        slug: catSlug,
        name: category.name || "Загальна",
        description: category.description || "Товари спільноти",
      });
    }

    const variants = product["variants"] as
      { prices?: VariantPrice[] }[] | undefined;
    const variant = variants?.[0];
    const uahPriceObj = variant?.prices?.find(
      (p) => p.currency_code?.toLowerCase() === "uah",
    ) || { amount: 0 };

    const rawMinorAmount = uahPriceObj.amount ?? 0;

    if (rawMinorAmount % 100 !== 0) {
      console.warn(
        `[mapPublicCatalog] Rejected product ${product["id"] || listing.id}: UAH amount ${rawMinorAmount} is not divisible by 100.`,
      );
      continue;
    }

    const priceUah = Math.floor(rawMinorAmount / 100);

    let verifiedVendorBadge: string | undefined;
    let certifiedProductBadge: string | undefined;
    let organicProductBadge: string | undefined;

    if (vendor.isVerified) {
      verifiedVendorBadge = "Перевірений виробник ЛАЙФ";
    }

    if (listing.claims && Array.isArray(listing.claims)) {
      for (const claim of listing.claims) {
        if (
          claim.review_status === "approved" &&
          claim.public_visibility === true
        ) {
          if (claim.claim_type === "organic") {
            organicProductBadge =
              claim.public_badge_text || "Органічний продукт";
          } else if (
            claim.claim_type === "eco" ||
            claim.claim_type === "natural"
          ) {
            certifiedProductBadge =
              claim.public_badge_text || "Сертифікований товар";
          }
        }
      }
    }

    const productItem: StorefrontCatalogProduct = {
      id: listing.id,
      slug: (product["handle"] as string) || `product-${listing.id}`,
      categorySlug: catSlug,
      name: listing.title || (product["title"] as string) || "Без назви",
      description:
        listing.description || (product["description"] as string) || "",
      priceUah,
      provider: {
        handle: vendor.handle,
        name: vendor.name,
      },
      isSynthetic: listing.synthetic ?? true,
      ...(verifiedVendorBadge ? { verifiedVendorBadge } : {}),
      ...(certifiedProductBadge ? { certifiedProductBadge } : {}),
      ...(organicProductBadge ? { organicProductBadge } : {}),
    };

    products.push(productItem);
  }

  return {
    source: "medusa",
    categories: Array.from(categoryMap.values()),
    products,
  };
}
