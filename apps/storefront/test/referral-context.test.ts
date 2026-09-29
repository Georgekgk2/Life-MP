import { describe, expect, it, beforeEach } from "vitest";
import { getStoredReferralCode } from "../src/context/referral-context";

describe("Referral Attribution Engine (Phase 4 / Influencer Architecture)", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      length: store.size,
      key: (index: number) => Array.from(store.keys())[index] ?? null,
    };

    Object.defineProperty(globalThis, "window", {
      value: { localStorage: mockStorage },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  it("returns null when no referral code is stored", () => {
    expect(getStoredReferralCode()).toBeNull();
  });

  it("retrieves valid active referral attribution from storage", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const payload = {
      refCode: "tiktok_blogger_1",
      source: "tiktok",
      capturedAt: new Date().toISOString(),
      expiresAt: futureDate.toISOString(),
    };

    localStorage.setItem(
      "life_referral_attribution_v1",
      JSON.stringify(payload),
    );
    expect(getStoredReferralCode()).toBe("tiktok_blogger_1");
  });

  it("ignores expired referral attributions", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const payload = {
      refCode: "expired_blogger",
      source: "instagram",
      capturedAt: pastDate.toISOString(),
      expiresAt: pastDate.toISOString(),
    };

    localStorage.setItem(
      "life_referral_attribution_v1",
      JSON.stringify(payload),
    );
    expect(getStoredReferralCode()).toBeNull();
  });
});
