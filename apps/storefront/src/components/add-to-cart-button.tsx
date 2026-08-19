"use client";

import { useState } from "react";
import type { StorefrontCatalogProduct } from "@life/types";
import { useCart } from "@/context/cart-context";

interface AddToCartButtonProps {
  product: StorefrontCatalogProduct;
  size?: "sm" | "md";
}

export function AddToCartButton({
  product,
  size = "sm",
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Додати ${product.name} у кошик`}
      className="button button--secondary"
      style={{
        padding: size === "sm" ? "0.35rem 0.75rem" : "0.5rem 1rem",
        fontSize: size === "sm" ? "0.85rem" : "0.95rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        cursor: "pointer",
        borderRadius: "var(--radius-sm)",
        transition: "all 0.15s ease",
        backgroundColor: isAdded ? "var(--color-pine-900)" : undefined,
        color: isAdded ? "#fff" : undefined,
      }}
    >
      <span>{isAdded ? "✓" : "🧺"}</span>
      <span>{isAdded ? "У кошику" : "В кошик"}</span>
    </button>
  );
}
