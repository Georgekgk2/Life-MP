import { describe, expect, it } from "vitest";
import { ReviewsEngine } from "../src/sandbox/reviews-engine";

describe("Product Reviews & Ratings Engine (Phase 3)", () => {
  it("retrieves approved reviews and calculates rating summary correctly", () => {
    const { reviews, summary } =
      ReviewsEngine.getProductReviews("chashka-ranok");

    expect(reviews.length).toBeGreaterThanOrEqual(1);
    expect(summary.totalReviews).toBe(reviews.length);
    expect(summary.averageRating).toBeGreaterThanOrEqual(1);
    expect(summary.averageRating).toBeLessThanOrEqual(5);
    expect(summary.ratingBreakdown[5]).toBeGreaterThanOrEqual(1);
  });

  it("allows submitting a new review and dynamically updates rating summary", () => {
    const initial = ReviewsEngine.getProductReviews("dereviana-taril");

    const newReview = ReviewsEngine.submitReview({
      productSlug: "dereviana-taril",
      productName: "Дерев'яна таріль «Каштан»",
      authorName: "Василь К.",
      authorCity: "Чернівці",
      rating: 5,
      comment:
        "Неймовірна ручна робота! Глибока текстура дуба та запах натурального воску.",
    });

    expect(newReview.id).toBeDefined();
    expect(newReview.rating).toBe(5);
    expect(newReview.verifiedPurchase).toBe(true);

    const updated = ReviewsEngine.getProductReviews("dereviana-taril");
    expect(updated.summary.totalReviews).toBe(initial.summary.totalReviews + 1);
    expect(updated.reviews.some((r) => r.id === newReview.id)).toBe(true);
  });

  it("moderates review status and supports reviewer notes", () => {
    const all = ReviewsEngine.getAllReviews();
    expect(all.length).toBeGreaterThanOrEqual(1);

    const target = all[0]!;
    const moderated = ReviewsEngine.moderateReview(
      target.id,
      "approved",
      "Перевірено модератором",
    );

    expect(moderated).toBeDefined();
    expect(moderated?.moderationStatus).toBe("approved");
    expect(moderated?.moderatorNotes).toBe("Перевірено модератором");
  });
});
