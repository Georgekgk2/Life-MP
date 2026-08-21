import { z } from "zod";
import type { ProductReviewsDTO } from "@life/types";

const ProductReviewSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  vendorId: z.string().min(1),
  displayName: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(1),
  verifiedPurchase: z.literal(true),
  status: z.literal("approved"),
  createdAt: z.string().min(1),
});

const ProductReviewsSchema = z.object({
  reviews: z.array(ProductReviewSchema),
  summary: z.object({
    averageRating: z.number().min(1).max(5).nullable(),
    totalReviews: z.number().int().nonnegative(),
    ratingBreakdown: z.object({
      1: z.number().int().nonnegative(),
      2: z.number().int().nonnegative(),
      3: z.number().int().nonnegative(),
      4: z.number().int().nonnegative(),
      5: z.number().int().nonnegative(),
    }),
  }),
});

export type ProductReviewsReadResult =
  | Readonly<{ kind: "ready"; data: ProductReviewsDTO }>
  | Readonly<{
      kind: "unavailable";
      reason:
        | "source_disabled"
        | "missing_configuration"
        | "upstream_error"
        | "invalid_response";
    }>;

function syntheticReviewsAreAllowed(): boolean {
  const nodeEnv = process.env["NODE_ENV"];
  return (
    (nodeEnv === "development" || nodeEnv === "test") &&
    process.env["ALLOW_SYNTHETIC_REVIEWS"] === "true"
  );
}

export async function getProductReviews(
  productId: string,
): Promise<ProductReviewsReadResult> {
  if (process.env["CATALOG_SOURCE"] !== "medusa") {
    return { kind: "unavailable", reason: "source_disabled" };
  }

  if (!syntheticReviewsAreAllowed()) {
    return { kind: "unavailable", reason: "source_disabled" };
  }

  const backendUrl = process.env["MEDUSA_BACKEND_URL"];
  if (!backendUrl || !productId) {
    return { kind: "unavailable", reason: "missing_configuration" };
  }

  try {
    const response = await fetch(
      `${backendUrl.replace(/\/$/, "")}/store/catalog/products/${encodeURIComponent(productId)}/reviews`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) {
      return { kind: "unavailable", reason: "upstream_error" };
    }

    const parsed = ProductReviewsSchema.safeParse(await response.json());
    if (!parsed.success) {
      return { kind: "unavailable", reason: "invalid_response" };
    }

    return { kind: "ready", data: parsed.data };
  } catch {
    return { kind: "unavailable", reason: "upstream_error" };
  }
}
