"use client";

import { useEffect, useState, type MouseEvent } from "react";
import type { StorefrontCatalogProduct } from "@life/types";
import { useSaved, type SavedProductItem } from "@/context/saved-context";

type SaveButtonProps = Readonly<{
  product: StorefrontCatalogProduct | SavedProductItem;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}>;

export function SaveButton({
  product,
  size = "md",
  showLabel = false,
  className = "",
}: SaveButtonProps) {
  const { isSaved, toggleSaved, isHydrated } = useSaved();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const saved = mounted && isHydrated && isSaved(product.id);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const providerName =
      "provider" in product ? product.provider?.name : product.providerName;

    toggleSaved({
      id: product.id,
      slug: product.slug,
      categorySlug: product.categorySlug,
      name: product.name,
      priceUah: product.priceUah,
      providerName,
      isSynthetic: product.isSynthetic,
      verifiedVendorBadge: product.verifiedVendorBadge,
      certifiedProductBadge: product.certifiedProductBadge,
      organicProductBadge: product.organicProductBadge,
    });
  };

  const label = saved ? "Видалити зі збережених" : "Зберегти товар";

  return (
    <button
      type="button"
      className={`save-button save-button--${size} ${saved ? "save-button--active" : ""} ${className}`}
      onClick={handleClick}
      aria-label={`${label}: ${product.name}`}
      aria-pressed={saved}
      title={label}
    >
      <span aria-hidden="true" className="save-button__icon">
        {saved ? "❤️" : "🤍"}
      </span>
      {showLabel && (
        <span className="save-button__label">
          {saved ? "У збережених" : "Зберегти"}
        </span>
      )}
    </button>
  );
}
