import type { ProductReviewsReadResult } from "@/reviews/server";

interface ProductReviewsSectionProps {
  productSlug: string;
  productName: string;
  reviews?: ProductReviewsReadResult;
}

export function ProductReviewsSection({
  productName,
  reviews,
}: ProductReviewsSectionProps) {
  const isReady = reviews?.kind === "ready";
  const reviewData = isReady ? reviews.data : null;
  const averageRating = reviewData?.summary.averageRating;

  return (
    <section
      className="product-reviews-section"
      aria-labelledby="product-reviews-heading"
      style={{
        marginTop: "3rem",
        paddingTop: "2rem",
        borderTop: "2px solid var(--color-sand-200)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h2
            id="product-reviews-heading"
            style={{
              fontSize: "1.6rem",
              color: "var(--color-pine-900)",
              margin: 0,
            }}
          >
            Відгуки поціновувачів крафту
          </h2>
          {reviewData && (
            <p
              style={{ color: "var(--color-ink-muted)", margin: "0.5rem 0 0" }}
            >
              {averageRating === null || averageRating === undefined
                ? "Оцінювання ще формується"
                : `${averageRating.toFixed(1)} / 5 · ${reviewData.summary.totalReviews} схвалених відгуків`}
            </p>
          )}
        </div>
        {reviewData && reviewData.summary.totalReviews > 0 && (
          <span
            aria-label={`Середня оцінка ${averageRating ?? 0} з 5`}
            style={{
              color: "#e2aa58",
              fontSize: "1.2rem",
              letterSpacing: "2px",
            }}
          >
            {"★".repeat(Math.round(averageRating ?? 0))}
            {"☆".repeat(5 - Math.round(averageRating ?? 0))}
          </span>
        )}
      </div>

      {!reviewData ? (
        <div
          role="status"
          style={{
            padding: "1rem 1.25rem",
            backgroundColor: "var(--color-sand-100)",
            color: "var(--color-ink)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-sand-200)",
          }}
        >
          <strong>
            Публічні схвалені відгуки про «{productName}» наразі недоступні.
          </strong>
          <p style={{ margin: "0.5rem 0 0" }}>
            Ми не показуємо локальні або неперевірені відгуки. Схвалені відгуки
            відображаються лише після отримання з серверного API. Щоб залишити
            відгук, увійдіть до кабінету покупця та дочекайтеся доставки
            замовлення; після цього відгук пройде модерацію.
          </p>
        </div>
      ) : reviewData.reviews.length === 0 ? (
        <div
          role="status"
          style={{
            padding: "1rem 1.25rem",
            backgroundColor: "var(--color-sand-100)",
            color: "var(--color-ink)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-sand-200)",
          }}
        >
          Схвалених відгуків про цей виріб поки немає.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {reviewData.reviews.map((review) => (
            <article
              key={review.id}
              className="card"
              style={{ padding: "1.25rem" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <strong>{review.displayName}</strong>
                <span aria-label={`Оцінка ${review.rating} з 5`}>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </span>
              </div>
              <p style={{ margin: "0.75rem 0 0", lineHeight: 1.6 }}>
                {review.body}
              </p>
              <small style={{ color: "var(--color-ink-muted)" }}>
                Перевірений покупець · схвалено модератором
              </small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
