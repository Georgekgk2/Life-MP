"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export type ReferralSource =
  "tiktok" | "instagram" | "telegram" | "direct" | "other";

export type ReferralAttribution = Readonly<{
  refCode: string;
  source: ReferralSource;
  campaign?: string | undefined;
  capturedAt: string;
  expiresAt: string;
}>;

export type ReferralContextValue = Readonly<{
  attribution: ReferralAttribution | null;
  setReferralCode: (
    code: string,
    source?: ReferralSource,
    campaign?: string,
  ) => void;
  clearAttribution: () => void;
  isAttributed: boolean;
}>;

const STORAGE_KEY = "life_referral_attribution_v1";
const DEFAULT_ATTRIBUTION_DAYS = 30;

const ReferralContext = createContext<ReferralContextValue | null>(null);

function sanitizeRefCode(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9_\-.]/g, "")
    .slice(0, 64);
}

function parseUrlAttribution(): {
  refCode?: string | undefined;
  source: ReferralSource;
  campaign?: string | undefined;
} | null {
  if (typeof window === "undefined") return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const rawRef =
      params.get("ref") ||
      params.get("aff") ||
      params.get("referrer") ||
      params.get("creator");

    const utmSource = (params.get("utm_source") || "").toLowerCase();
    const utmCampaign = params.get("utm_campaign") || undefined;

    let source: ReferralSource = "direct";
    if (
      utmSource.includes("tiktok") ||
      document.referrer.includes("tiktok.com")
    ) {
      source = "tiktok";
    } else if (
      utmSource.includes("instagram") ||
      document.referrer.includes("instagram.com")
    ) {
      source = "instagram";
    } else if (
      utmSource.includes("telegram") ||
      document.referrer.includes("t.me")
    ) {
      source = "telegram";
    } else if (utmSource) {
      source = "other";
    }

    if (rawRef) {
      const sanitized = sanitizeRefCode(rawRef);
      if (sanitized) {
        return {
          refCode: sanitized,
          source,
          campaign: utmCampaign ? sanitizeRefCode(utmCampaign) : undefined,
        };
      }
    }
  } catch {
    // Ignore URL parse errors
  }

  return null;
}

export function ReferralProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [attribution, setAttribution] = useState<ReferralAttribution | null>(
    null,
  );

  // Initialize from localStorage or URL on mount
  useEffect(() => {
    let initialAttribution: ReferralAttribution | null = null;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ReferralAttribution;
        const now = new Date();
        const expiresAt = new Date(parsed.expiresAt);

        if (expiresAt > now && parsed.refCode) {
          initialAttribution = parsed;
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // Ignore localStorage read errors
    }

    // Check if current URL provides a fresh attribution
    const fromUrl = parseUrlAttribution();
    if (fromUrl && fromUrl.refCode) {
      const now = new Date();
      const expires = new Date();
      expires.setDate(now.getDate() + DEFAULT_ATTRIBUTION_DAYS);

      const fresh: ReferralAttribution = {
        refCode: fromUrl.refCode,
        source: fromUrl.source,
        campaign: fromUrl.campaign,
        capturedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      } catch {
        // Ignore localStorage write errors
      }

      initialAttribution = fresh;
    }

    if (initialAttribution) {
      setAttribution(initialAttribution);
    }
  }, []);

  const setReferralCode = useCallback(
    (code: string, source: ReferralSource = "direct", campaign?: string) => {
      const sanitized = sanitizeRefCode(code);
      if (!sanitized) return;

      const now = new Date();
      const expires = new Date();
      expires.setDate(now.getDate() + DEFAULT_ATTRIBUTION_DAYS);

      const fresh: ReferralAttribution = {
        refCode: sanitized,
        source,
        campaign: campaign ? sanitizeRefCode(campaign) : undefined,
        capturedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      } catch {
        // Ignore localStorage write errors
      }

      setAttribution(fresh);
    },
    [],
  );

  const clearAttribution = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage remove errors
    }
    setAttribution(null);
  }, []);

  const value = useMemo(
    () => ({
      attribution,
      setReferralCode,
      clearAttribution,
      isAttributed: Boolean(attribution?.refCode),
    }),
    [attribution, setReferralCode, clearAttribution],
  );

  return (
    <ReferralContext.Provider value={value}>
      {children}
    </ReferralContext.Provider>
  );
}

export function useReferral(): ReferralContextValue {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error("useReferral must be used within a ReferralProvider");
  }
  return context;
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as ReferralAttribution;
    const now = new Date();
    if (new Date(parsed.expiresAt) > now) {
      return parsed.refCode;
    }
  } catch {
    // Ignore
  }
  return null;
}
