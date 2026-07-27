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
  product?: Record<string, unknown>;
  __product?: Record<string, unknown>;
};

type VendorRow = {
  handle: string;
  name: string;
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
      name: "Невідомий майстер",
    };

    const product = (listing.product || listing.__product || {}) as Record<
      string,
      unknown
    >;
    const categories = product["categories"] as CategoryItem[] | undefined;
    const category = categories?.[0] || {
      id: "cat_general",
      handle: "general",
      name: "Загальне",
      description: "",
    };

    const catSlug = category.handle || category.slug || "general";
    if (!categoryMap.has(catSlug)) {
      categoryMap.set(catSlug, {
        id: category.id || `cat_${catSlug}`,
        slug: catSlug,
        name: category.name || catSlug,
        description: category.description || "",
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

    products.push({
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
    });
  }

  return {
    source: "medusa",
    categories: Array.from(categoryMap.values()),
    products,
  };
}
