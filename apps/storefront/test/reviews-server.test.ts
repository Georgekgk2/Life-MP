import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProductReviews } from "../src/reviews/server";

describe("storefront src/reviews/server.ts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("does not read review data when fixtures are the catalog source", async () => {
    process.env = { ...process.env, CATALOG_SOURCE: "fixtures" };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getProductReviews("product-1");

    expect(result).toEqual({ kind: "unavailable", reason: "source_disabled" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns only schema-valid server review DTOs", async () => {
    process.env = {
      ...process.env,
      CATALOG_SOURCE: "medusa",
      NODE_ENV: "test",
      ALLOW_SYNTHETIC_REVIEWS: "true",
      MEDUSA_BACKEND_URL: "http://127.0.0.1:9000/",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          reviews: [
            {
              id: "review-1",
              productId: "product-1",
              vendorId: "vendor-1",
              displayName: "Олена",
              rating: 5,
              body: "Гарний виріб",
              verifiedPurchase: true,
              status: "approved",
              createdAt: "2026-08-21T00:00:00.000Z",
            },
          ],
          summary: {
            averageRating: 5,
            totalReviews: 1,
            ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
          },
        }),
      }),
    );

    const result = await getProductReviews("product-1");

    expect(result.kind).toBe("ready");
    if (result.kind === "ready") {
      expect(result.data.reviews[0]?.status).toBe("approved");
    }
  });

  it("fails closed on an invalid upstream response without fixture fallback", async () => {
    process.env = {
      ...process.env,
      CATALOG_SOURCE: "medusa",
      NODE_ENV: "test",
      ALLOW_SYNTHETIC_REVIEWS: "true",
      MEDUSA_BACKEND_URL: "http://127.0.0.1:9000",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ reviews: [{ status: "approved" }] }),
      }),
    );

    const result = await getProductReviews("product-1");

    expect(result).toEqual({ kind: "unavailable", reason: "invalid_response" });
  });
});
