"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CartItem,
  CartVendorGroup,
  StorefrontCatalogProduct,
} from "@life/types";

const CART_STORAGE_KEY = "life_mp_cart_v1";

interface CartContextValue {
  items: readonly CartItem[];
  vendorGroups: readonly CartVendorGroup[];
  totalItems: number;
  totalAmountUah: number;
  isCartOpen: boolean;
  isHydrated: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (
    product:
      | StorefrontCatalogProduct
      | {
          id: string;
          slug: string;
          name: string;
          categorySlug: string;
          priceUah: number;
          vendorHandle?: string;
          vendorName?: string;
        },
    quantity?: number,
  ) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function groupItemsByVendor(
  items: readonly CartItem[],
): readonly CartVendorGroup[] {
  const map = new Map<string, { name: string; items: CartItem[] }>();

  for (const item of items) {
    const handle = item.vendorHandle || "craft_artisan";
    const name = item.vendorName || "Українська Майстерня";

    if (!map.has(handle)) {
      map.set(handle, { name, items: [] });
    }
    map.get(handle)!.items.push(item);
  }

  return Array.from(map.entries()).map(([vendorHandle, data]) => {
    const subtotal = data.items.reduce(
      (sum, it) => sum + it.priceUah * it.quantity,
      0,
    );
    return {
      vendorHandle,
      vendorName: data.name,
      items: data.items,
      subtotalUah: subtotal,
    };
  });
}

function loadCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore parse errors and return empty
  }
  return [];
}

function saveCartToStorage(items: readonly CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Graceful fallback if quota exceeded
  }
}

export function CartProvider({
  children,
  initialItems = [],
}: Readonly<{
  children: ReactNode;
  initialItems?: readonly CartItem[];
}>) {
  const [items, setItems] = useState<readonly CartItem[]>(initialItems);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  useEffect(() => {
    const stored = loadCartFromStorage();
    if (stored.length > 0) {
      setItems(stored);
    }
    setIsHydrated(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) {
            setItems(updated);
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

  const addItem = useCallback(
    (
      product:
        | StorefrontCatalogProduct
        | {
            id: string;
            slug: string;
            name: string;
            categorySlug: string;
            priceUah: number;
            vendorHandle?: string;
            vendorName?: string;
          },
      quantity: number = 1,
    ) => {
      setItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.id === product.id);
        let updated: CartItem[];

        const vendorHandle =
          ("provider" in product && product.provider?.handle) ||
          ("vendorHandle" in product && product.vendorHandle) ||
          "craft_artisan";

        const vendorName =
          ("provider" in product && product.provider?.name) ||
          ("vendorName" in product && product.vendorName) ||
          "Українська Майстерня";

        if (existingIndex >= 0) {
          updated = prev.map((item, idx) =>
            idx === existingIndex
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          );
        } else {
          const newItem: CartItem = {
            id: product.id,
            slug: product.slug,
            name: product.name,
            categorySlug: product.categorySlug,
            priceUah: product.priceUah,
            quantity: Math.max(1, quantity),
            vendorHandle,
            vendorName,
          };
          updated = [...prev, newItem];
        }

        saveCartToStorage(updated);
        return updated;
      });
      setIsCartOpen(true);
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveCartToStorage(updated);
      return updated;
    });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      let updated: CartItem[];
      if (quantity <= 0) {
        updated = prev.filter((item) => item.id !== id);
      } else {
        updated = prev.map((item) =>
          item.id === id ? { ...item, quantity } : item,
        );
      }
      saveCartToStorage(updated);
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveCartToStorage([]);
  }, []);

  const vendorGroups = useMemo(() => groupItemsByVendor(items), [items]);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const totalAmountUah = useMemo(
    () => items.reduce((sum, item) => sum + item.priceUah * item.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      vendorGroups,
      totalItems,
      totalAmountUah,
      isCartOpen,
      isHydrated,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [
      items,
      vendorGroups,
      totalItems,
      totalAmountUah,
      isCartOpen,
      isHydrated,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
