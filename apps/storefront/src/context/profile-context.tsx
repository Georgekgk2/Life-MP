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

export type CustomerProfileData = Readonly<{
  name: string;
  email: string;
  phone: string;
  city: string;
}>;

export type NotificationPreferences = Readonly<{
  notifyNewProducts: boolean;
  notifyEvents: boolean;
  notifyStories: boolean;
  notifyCharity: boolean;
}>;

export type ProfileContextValue = Readonly<{
  profile: CustomerProfileData;
  notifications: NotificationPreferences;
  favoriteWorkshops: readonly string[];
  isWorkshopFavorite: (workshopSlug: string) => boolean;
  toggleFavoriteWorkshop: (workshopSlug: string) => boolean;
  updateProfile: (data: Partial<CustomerProfileData>) => void;
  updateNotifications: (data: Partial<NotificationPreferences>) => void;
  isHydrated: boolean;
}>;

const STORAGE_KEY = "life_mp_customer_profile_v1";

const defaultProfile: CustomerProfileData = {
  name: "Демо Користувач",
  email: "demo-customer@example.internal",
  phone: "+380 00 000 00 00",
  city: "Київ",
};

const defaultNotifications: NotificationPreferences = {
  notifyNewProducts: true,
  notifyEvents: true,
  notifyStories: true,
  notifyCharity: false,
};

const defaultFavoriteWorkshops: readonly string[] = [
  "Майстерня «Глина та Світло»",
  "Лляне Ткацтво «Берегиня»",
];

const defaultContextValue: ProfileContextValue = {
  profile: defaultProfile,
  notifications: defaultNotifications,
  favoriteWorkshops: defaultFavoriteWorkshops,
  isWorkshopFavorite: () => false,
  toggleFavoriteWorkshop: () => false,
  updateProfile: () => {},
  updateNotifications: () => {},
  isHydrated: false,
};

const ProfileContext = createContext<ProfileContextValue>(defaultContextValue);

/**
 * Only non-sensitive UI preferences may be persisted in this browser.
 * Customer identity/profile data is intentionally not a client-side source of truth.
 */
type StoredProfilePayload = {
  notifications?: NotificationPreferences;
  favoriteWorkshops?: string[];
};

function readFromLocalStorage(): StoredProfilePayload {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeToLocalStorage(data: StoredProfilePayload): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Gracefully ignore storage quota errors
  }
}

export function ProfileProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [profile, setProfile] = useState<CustomerProfileData>(defaultProfile);
  const [notifications, setNotifications] =
    useState<NotificationPreferences>(defaultNotifications);
  const [favoriteWorkshops, setFavoriteWorkshops] = useState<readonly string[]>(
    defaultFavoriteWorkshops,
  );
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Hydrate only UI preferences from localStorage.
  // The demo profile remains in memory until a server-backed customer profile exists.
  useEffect(() => {
    const stored = readFromLocalStorage();
    if (stored.notifications) {
      setNotifications(stored.notifications);
    }
    if (Array.isArray(stored.favoriteWorkshops)) {
      setFavoriteWorkshops(stored.favoriteWorkshops);
    }
    setIsHydrated(true);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const updated = readFromLocalStorage();
        if (updated.notifications) setNotifications(updated.notifications);
        if (Array.isArray(updated.favoriteWorkshops)) {
          setFavoriteWorkshops(updated.favoriteWorkshops);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 2. Persist only non-sensitive UI preferences. Never write profile identity data.
  useEffect(() => {
    if (isHydrated) {
      writeToLocalStorage({
        notifications,
        favoriteWorkshops: [...favoriteWorkshops],
      });
    }
  }, [notifications, favoriteWorkshops, isHydrated]);

  const isWorkshopFavorite = useCallback(
    (workshopSlug: string): boolean => {
      return favoriteWorkshops.includes(workshopSlug);
    },
    [favoriteWorkshops],
  );

  const toggleFavoriteWorkshop = useCallback(
    (workshopSlug: string): boolean => {
      let isFav = false;
      setFavoriteWorkshops((prev) => {
        if (prev.includes(workshopSlug)) {
          isFav = false;
          return prev.filter((w) => w !== workshopSlug);
        } else {
          isFav = true;
          return [...prev, workshopSlug];
        }
      });
      return isFav;
    },
    [],
  );

  const updateProfile = useCallback(
    (data: Partial<CustomerProfileData>): void => {
      setProfile((prev) => ({ ...prev, ...data }));
    },
    [],
  );

  const updateNotifications = useCallback(
    (data: Partial<NotificationPreferences>): void => {
      setNotifications((prev) => ({ ...prev, ...data }));
    },
    [],
  );

  const value: ProfileContextValue = useMemo(
    () => ({
      profile,
      notifications,
      favoriteWorkshops,
      isWorkshopFavorite,
      toggleFavoriteWorkshop,
      updateProfile,
      updateNotifications,
      isHydrated,
    }),
    [
      profile,
      notifications,
      favoriteWorkshops,
      isWorkshopFavorite,
      toggleFavoriteWorkshop,
      updateProfile,
      updateNotifications,
      isHydrated,
    ],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  return useContext(ProfileContext);
}
