"use client";

import Link from "next/link";
import { EmptyState, SectionHeading } from "@/components";
import { useSaved } from "@/context/saved-context";

const hryvniaFormatter = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
});

export default function SavedPage() {
  const { savedItems, removeItem, clearSaved, isHydrated } = useSaved();

  if (!isHydrated) {
    return (
      <div className="page-shell page-section page-section--spacious">
        <p style={{ color: "var(--color-ink-muted)" }}>
          Завантаження збережених товарів...
        </p>
      </div>
    );
  }

  return (
    <div className="page-shell page-section page-section--spacious">
      <SectionHeading
        level="h1"
        eyebrow="Персональна добірка"
        title="Збережені товари"
        description="Ваш локальний список вподобаних виробів українських майстерень та ремісників. Зберігається у вашому браузері без потреби в реєстрації."
      />

      {savedItems.length === 0 ? (
        <div style={{ marginTop: "2rem" }}>
          <EmptyState
            title="У вас поки немає збережених виробів"
            description="Додавайте вподобані товари до збережених за допомогою кнопки ❤️ у каталозі, щоб повернутися до них у будь-який зручний момент."
            href="/catalog"
            linkLabel="Перейти до каталогу"
          />
        </div>
      ) : (
        <div style={{ marginTop: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <p style={{ color: "var(--color-ink-muted)", fontSize: "0.95rem" }}>
              Збережено виробів: <strong>{savedItems.length}</strong>
            </p>
            <button
              type="button"
              onClick={clearSaved}
              className="button button--secondary button--sm"
              style={{ color: "var(--color-critical, #b3261e)" }}
            >
              Очистити список
            </button>
          </div>

          <div className="content-grid content-grid--cards">
            {savedItems.map((item) => (
              <article
                key={item.id}
                className="card product-card saved-product-card"
              >
                <div
                  aria-hidden="true"
                  className="card__visual product-card__visual"
                >
                  <span className="card__visual-label">{item.name}</span>
                </div>
                <div className="card__content">
                  <p className="card__eyebrow">
                    {item.providerName
                      ? `Майстер: ${item.providerName}`
                      : "Виріб спільноти"}
                  </p>
                  <h3 className="card__title">
                    <Link
                      className="card__title-link"
                      href={`/catalog/${item.categorySlug}/${item.slug}`}
                    >
                      {item.name}
                    </Link>
                  </h3>
                  <div className="card__meta">
                    <data value={item.priceUah}>
                      {hryvniaFormatter.format(item.priceUah)}
                    </data>
                    <div
                      className="badge-group"
                      style={{
                        display: "flex",
                        gap: "0.25rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="badge badge--demo">
                        {item.isSynthetic ? "Синтетичні дані" : "Демо"}
                      </span>
                      {item.verifiedVendorBadge && (
                        <span
                          className="badge badge--verified"
                          style={{ background: "#e6f4ea", color: "#137333" }}
                        >
                          ✓ {item.verifiedVendorBadge}
                        </span>
                      )}
                      {item.certifiedProductBadge && (
                        <span
                          className="badge badge--certified"
                          style={{ background: "#e8f0fe", color: "#1a73e8" }}
                        >
                          ★ {item.certifiedProductBadge}
                        </span>
                      )}
                      {item.organicProductBadge && (
                        <span
                          className="badge badge--organic"
                          style={{ background: "#fef7e0", color: "#b06000" }}
                        >
                          🌿 {item.organicProductBadge}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginTop: "1.25rem",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid var(--color-border)",
                    }}
                  >
                    <Link
                      href={`/catalog/${item.categorySlug}/${item.slug}`}
                      className="button button--secondary button--sm"
                      style={{ flex: 1, textAlign: "center" }}
                    >
                      Детальніше
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="button button--secondary button--sm"
                      aria-label={`Видалити ${item.name} зі збережених`}
                      style={{ color: "var(--color-critical, #b3261e)" }}
                    >
                      Видалити
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
