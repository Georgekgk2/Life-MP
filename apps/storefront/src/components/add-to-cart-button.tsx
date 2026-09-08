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
      aria-label={`${isAdded ? "У кошику" : "Додати"} ${product.name}`}
      className={`button button--secondary button--${size}`}
    >
      <span aria-hidden="true">{isAdded ? "✓" : "🧺"}</span>
      <span>{isAdded ? "У кошику" : "В кошик"}</span>
    </button>
  );
}
