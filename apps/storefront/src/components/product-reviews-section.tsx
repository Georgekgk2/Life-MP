"use client";

import { useEffect, useState } from "react";
import { ReviewsEngine } from "@/sandbox/reviews-engine";
import type { ProductRatingSummary, ProductReview } from "@life/types";

interface ProductReviewsSectionProps {
  productSlug: string;
  productName: string;
}

export function ProductReviewsSection({
  productSlug,
  productName,
}: ProductReviewsSectionProps) {
  const [reviewsData, setReviewsData] = useState<{
    reviews: ProductReview[];
    summary: ProductRatingSummary;
  }>({
    reviews: [],
    summary: {
      averageRating: 5.0,
      totalReviews: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    },
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [authorName, setAuthorName] = useState("");
  const [authorCity, setAuthorCity] = useState("");
  const [comment, setComment] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const refreshReviews = () => {
    const data = ReviewsEngine.getProductReviews(productSlug);
    setReviewsData(data);
  };

  useEffect(() => {
    refreshReviews();
  }, [productSlug]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) {
      return;
    }

    ReviewsEngine.submitReview({
      productSlug,
      productName,
      authorName,
      authorCity: authorCity || "Україна",
      rating,
      comment,
    });

    setAuthorName("");
    setAuthorCity("");
    setComment("");
    setRating(5);
    setIsFormOpen(false);
    refreshReviews();

    setNotification("🎉 Дякуємо! Ваш відгук успішно опубліковано на вітрині.");
    setTimeout(() => setNotification(null), 5000);
  };

  const { reviews, summary } = reviewsData;

  return (
    <section
      className="product-reviews-section"
      style={{
        marginTop: "3rem",
        paddingTop: "2rem",
        borderTop: "2px solid var(--color-sand-200)",
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.6rem",
              color: "var(--color-pine-900)",
              margin: "0 0 0.5rem 0",
            }}
          >
            Відгуки поціновувачів крафту
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.95rem",
            }}
          >
            <span
              style={{
                color: "#e2aa58",
                fontSize: "1.2rem",
                letterSpacing: "2px",
              }}
            >
              {"★".repeat(Math.round(summary.averageRating))}
              {"☆".repeat(5 - Math.round(summary.averageRating))}
            </span>
            <strong style={{ fontSize: "1.1rem" }}>
              {summary.averageRating.toFixed(1)} / 5
            </strong>
            <span style={{ color: "var(--color-ink-muted)" }}>
              ({summary.totalReviews} відгуків)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen((prev) => !prev)}
          className="button button-primary"
          style={{
            padding: "0.6rem 1.2rem",
            fontSize: "0.95rem",
            backgroundColor: "var(--color-terracotta-500)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {isFormOpen ? "Сховати форму" : "✍️ Залишити відгук"}
        </button>
      </div>

      {notification && (
        <div
          role="status"
          style={{
            padding: "1rem 1.25rem",
            backgroundColor: "#e6f4ea",
            color: "#137333",
            borderRadius: "var(--radius-sm)",
            marginBottom: "1.5rem",
            fontWeight: 600,
            border: "1px solid #ceead6",
          }}
        >
          {notification}
        </div>
      )}

      {/* Review Form Drawer/Modal */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: "#fff",
            padding: "1.5rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-sand-200)",
            marginBottom: "2.5rem",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          }}
        >
          <h3
            style={{
              margin: "0 0 1rem 0",
              fontSize: "1.2rem",
              color: "var(--color-pine-900)",
            }}
          >
            Поділіться враженнями про виріб «{productName}»
          </h3>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            {/* Star Rating Picker */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  marginBottom: "0.4rem",
                }}
              >
                Ваша оцінка:
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`Оцінити на ${star} зірок`}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.75rem",
                      cursor: "pointer",
                      color:
                        star <= rating ? "#e2aa58" : "var(--color-sand-300)",
                      padding: "0.2rem",
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div>
                <label
                  htmlFor="reviewAuthor"
                  style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    marginBottom: "0.35rem",
                  }}
                >
                  Ваше ім'я *
                </label>
                <input
                  id="reviewAuthor"
                  type="text"
                  required
                  placeholder="Олена М."
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-sand-200)",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="reviewCity"
                  style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    marginBottom: "0.35rem",
                  }}
                >
                  Ваше місто
                </label>
                <input
                  id="reviewCity"
                  type="text"
                  placeholder="Київ"
                  value={authorCity}
                  onChange={(e) => setAuthorCity(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-sand-200)",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reviewComment"
                style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  marginBottom: "0.35rem",
                }}
              >
                Текст відгуку *
              </label>
              <textarea
                id="reviewComment"
                required
                rows={4}
                placeholder="Розкажіть про якість виробу, пакування та враження від покупки..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-sand-200)",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="submit"
                className="button button-primary"
                style={{
                  padding: "0.6rem 1.25rem",
                  backgroundColor: "var(--color-terracotta-500)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Опублікувати відгук
              </button>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="button button-secondary"
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                Скасувати
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            color: "var(--color-ink-muted)",
          }}
        >
          Будьте першим, хто залишить відгук про цей автентичний виріб!
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {reviews.map((rev) => (
            <div
              key={rev.id}
              style={{
                backgroundColor: "#fff",
                padding: "1.25rem 1.5rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-sand-200)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "0.5rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {rev.authorName}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-ink-muted)",
                    }}
                  >
                    м. {rev.authorCity} •{" "}
                    {new Date(rev.createdAt).toLocaleDateString("uk-UA")}
                  </div>
                </div>

                <span
                  style={{
                    color: "#e2aa58",
                    fontSize: "1rem",
                    letterSpacing: "1px",
                  }}
                >
                  {"★".repeat(rev.rating)}
                  {"☆".repeat(5 - rev.rating)}
                </span>
              </div>

              {rev.verifiedPurchase && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#137333",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  ✓ Перевірений покупець
                </div>
              )}

              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--color-ink)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {rev.comment}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
