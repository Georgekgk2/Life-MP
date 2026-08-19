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

export type SavedProductItem = Readonly<{
  id: string;
  slug: string;
  categorySlug: string;
  name: string;
  priceUah: number;
  providerName?: string | undefined;
  isSynthetic?: boolean | undefined;
  verifiedVendorBadge?: string | undefined;
  certifiedProductBadge?: string | undefined;
  organicProductBadge?: string | undefined;
  savedAt: string;
}>;

export type SavedItemInput = Omit<SavedProductItem, "savedAt">;

export type SavedContextValue = Readonly<{
  savedItems: readonly SavedProductItem[];
  isSaved: (productId: string) => boolean;
  toggleSaved: (item: SavedItemInput) => boolean;
  saveItem: (item: SavedItemInput) => void;
  removeItem: (productId: string) => void;
  clearSaved: () => void;
  count: number;
  isHydrated: boolean;
}>;

const STORAGE_KEY = "life_mp_saved_items_v1";

const defaultContextValue: SavedContextValue = {
  savedItems: [],
  isSaved: () => false,
  toggleSaved: () => false,
  saveItem: () => {},
  removeItem: () => {},
  clearSaved: () => {},
  count: 0,
  isHydrated: false,
};

const SavedContext = createContext<SavedContextValue>(defaultContextValue);

function readFromLocalStorage(): readonly SavedProductItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is SavedProductItem =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.priceUah === "number",
    );
  } catch {
    return [];
  }
}

function writeToLocalStorage(items: readonly SavedProductItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Gracefully handle storage quota or private browsing exceptions
  }
}

export function SavedProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [savedItems, setSavedItems] = useState<readonly SavedProductItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Initial hydration from localStorage
  useEffect(() => {
    const initial = readFromLocalStorage();
    setSavedItems(initial);
    setIsHydrated(true);

    // Sync across browser tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setSavedItems(readFromLocalStorage());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // 2. Persist to localStorage whenever state changes after hydration
  useEffect(() => {
    if (isHydrated) {
      writeToLocalStorage(savedItems);
    }
  }, [savedItems, isHydrated]);

  const isSaved = useCallback(
    (productId: string): boolean => {
      return savedItems.some((item) => item.id === productId);
    },
    [savedItems],
  );

  const saveItem = useCallback((itemInput: SavedItemInput): void => {
    setSavedItems((prev) => {
      if (prev.some((item) => item.id === itemInput.id)) {
        return prev;
      }
      return [
        ...prev,
        {
          ...itemInput,
          savedAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: string): void => {
    setSavedItems((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const toggleSaved = useCallback((itemInput: SavedItemInput): boolean => {
    let isNowSaved = false;
    setSavedItems((prev) => {
      const exists = prev.some((item) => item.id === itemInput.id);
      if (exists) {
        isNowSaved = false;
        return prev.filter((item) => item.id !== itemInput.id);
      } else {
        isNowSaved = true;
        return [
          ...prev,
          {
            ...itemInput,
            savedAt: new Date().toISOString(),
          },
        ];
      }
    });
    return isNowSaved;
  }, []);

  const clearSaved = useCallback((): void => {
    setSavedItems([]);
  }, []);

  const value: SavedContextValue = useMemo(
    () => ({
      savedItems,
      isSaved,
      toggleSaved,
      saveItem,
      removeItem,
      clearSaved,
      count: savedItems.length,
      isHydrated,
    }),
    [
      savedItems,
      isSaved,
      toggleSaved,
      saveItem,
      removeItem,
      clearSaved,
      isHydrated,
    ],
  );

  return (
    <SavedContext.Provider value={value}>{children}</SavedContext.Provider>
  );
}

export function useSaved(): SavedContextValue {
  return useContext(SavedContext);
}
