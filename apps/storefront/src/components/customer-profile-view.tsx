"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfile } from "@/context/profile-context";
import { useSaved } from "@/context/saved-context";

const hryvniaFormatter = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
});

export function CustomerProfileView() {
  const {
    profile,
    notifications,
    favoriteWorkshops,
    toggleFavoriteWorkshop,
    updateProfile,
    updateNotifications,
    isHydrated,
  } = useProfile();

  const { savedItems, removeItem, count: savedCount } = useSaved();

  const [activeTab, setActiveTab] = useState<
    "saved" | "workshops" | "notifications" | "details"
  >("saved");

  const [editName, setEditName] = useState(profile.name);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [editCity, setEditCity] = useState(profile.city);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null,
  );

  if (!isHydrated) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--color-ink-muted)" }}>
          Завантаження особистого кабінету...
        </p>
      </div>
    );
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: editName,
      email: editEmail,
      phone: editPhone,
      city: editCity,
    });
    setSaveSuccessMessage("Дані профілю успішно оновлено!");
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  return (
    <div
      className="customer-profile-view"
      style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
    >
      {/* Profile Overview Card */}
      <div
        className="card"
        style={{
          padding: "1.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
          background:
            "linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-muted) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div
            style={{
              width: "4rem",
              height: "4rem",
              borderRadius: "9999px",
              backgroundColor: "var(--color-primary-quiet)",
              color: "var(--color-primary-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              fontWeight: "700",
            }}
          >
            {profile.name.charAt(0)}
          </div>
          <div>
            <h2
              style={{
                fontSize: "1.35rem",
                margin: "0 0 0.25rem 0",
                color: "var(--color-ink)",
              }}
            >
              {profile.name}
            </h2>
            <p
              style={{
                color: "var(--color-ink-muted)",
                fontSize: "0.9rem",
                margin: 0,
              }}
            >
              {profile.email} • {profile.city}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <span
            className="badge"
            style={{
              backgroundColor: "#e6f4ea",
              color: "#137333",
              padding: "0.4rem 0.8rem",
              fontSize: "0.85rem",
            }}
          >
            ✓ Активний покупець
          </span>
          <span
            className="badge"
            style={{
              backgroundColor: "#e8f0fe",
              color: "#1a73e8",
              padding: "0.4rem 0.8rem",
              fontSize: "0.85rem",
            }}
          >
            🌿 Поціновувач крафту
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          borderBottom: "2px solid var(--color-border)",
          paddingBottom: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={`button ${activeTab === "saved" ? "button--primary" : "button--secondary"}`}
          style={{ padding: "0.6rem 1.25rem", fontSize: "0.95rem" }}
        >
          💖 Збережені вироби ({savedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("workshops")}
          className={`button ${activeTab === "workshops" ? "button--primary" : "button--secondary"}`}
          style={{ padding: "0.6rem 1.25rem", fontSize: "0.95rem" }}
        >
          🌿 Улюблені майстерні ({favoriteWorkshops.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`button ${activeTab === "notifications" ? "button--primary" : "button--secondary"}`}
          style={{ padding: "0.6rem 1.25rem", fontSize: "0.95rem" }}
        >
          🔔 Сповіщення
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={`button ${activeTab === "details" ? "button--primary" : "button--secondary"}`}
          style={{ padding: "0.6rem 1.25rem", fontSize: "0.95rem" }}
        >
          ⚙️ Особисті дані
        </button>
      </div>

      {/* Tab 1: Saved Items */}
      {activeTab === "saved" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ fontSize: "1.2rem", margin: 0 }}>Ваш список бажань</h3>
            {savedCount > 0 && (
              <Link
                href="/saved"
                style={{
                  color: "var(--color-primary-strong)",
                  fontSize: "0.9rem",
                }}
              >
                Відкрити окрему сторінку →
              </Link>
            )}
          </div>

          {savedItems.length === 0 ? (
            <div
              className="card"
              style={{ padding: "2.5rem", textAlign: "center" }}
            >
              <p
                style={{
                  fontSize: "1.1rem",
                  color: "var(--color-ink-muted)",
                  marginBottom: "1rem",
                }}
              >
                У вас поки немає збережених виробів.
              </p>
              <Link href="/catalog" className="button button--primary">
                Перейти до каталогу
              </Link>
            </div>
          ) : (
            <div className="content-grid content-grid--cards">
              {savedItems.map((item) => (
                <article key={item.id} className="card product-card">
                  <div
                    aria-hidden="true"
                    className="card__visual product-card__visual"
                  >
                    <span className="card__visual-label">{item.name}</span>
                  </div>
                  <div className="card__content">
                    <p className="card__eyebrow">
                      {item.providerName || "Майстерня Life-MP"}
                    </p>
                    <h4 className="card__title">
                      <Link
                        className="card__title-link"
                        href={`/catalog/${item.categorySlug}/${item.slug}`}
                      >
                        {item.name}
                      </Link>
                    </h4>
                    <div className="card__meta">
                      <data value={item.priceUah}>
                        {hryvniaFormatter.format(item.priceUah)}
                      </data>
                    </div>
                    <div
                      style={{
                        marginTop: "1rem",
                        display: "flex",
                        gap: "0.5rem",
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
                        style={{ color: "var(--color-critical, #b3261e)" }}
                        aria-label={`Видалити ${item.name}`}
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Favorite Workshops */}
      {activeTab === "workshops" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <h3 style={{ fontSize: "1.2rem", margin: 0 }}>
            Майстерні, за якими ви стежите
          </h3>

          {favoriteWorkshops.length === 0 ? (
            <div
              className="card"
              style={{ padding: "2.5rem", textAlign: "center" }}
            >
              <p
                style={{
                  fontSize: "1.1rem",
                  color: "var(--color-ink-muted)",
                  marginBottom: "1rem",
                }}
              >
                Ви поки не підписалися на жодну майстерню.
              </p>
              <Link href="/people" className="button button--primary">
                Знайти майстерні
              </Link>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {favoriteWorkshops.map((workshop) => (
                <div
                  key={workshop}
                  className="card"
                  style={{
                    padding: "1.25rem 1.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <span
                      style={{ fontSize: "1.75rem" }}
                      role="img"
                      aria-label="Майстерня"
                    >
                      🏺
                    </span>
                    <div>
                      <h4
                        style={{
                          fontSize: "1.1rem",
                          margin: "0 0 0.2rem 0",
                          color: "var(--color-ink)",
                        }}
                      >
                        {workshop}
                      </h4>
                      <p
                        style={{
                          color: "var(--color-ink-muted)",
                          fontSize: "0.85rem",
                          margin: 0,
                        }}
                      >
                        Підписка активна • Отримувати новини про вироби
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <Link
                      href="/catalog"
                      className="button button--secondary button--sm"
                    >
                      Вироби майстра
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleFavoriteWorkshop(workshop)}
                      className="button button--secondary button--sm"
                      style={{ color: "var(--color-critical, #b3261e)" }}
                    >
                      Відписатися
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Notification Settings */}
      {activeTab === "notifications" && (
        <div
          className="card"
          style={{
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>
              Налаштування сповіщень
            </h3>
            <p
              style={{
                color: "var(--color-ink-muted)",
                fontSize: "0.9rem",
                margin: 0,
              }}
            >
              Оберіть, про які оновлення спільноти ви хочете дізнаватися
              першими.
            </p>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.95rem", display: "block" }}>
                  Нові крафтові вироби
                </strong>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Сповіщати про появу нових надходжень у категоріях, що вас
                  цікавлять
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifications.notifyNewProducts}
                onChange={(e) =>
                  updateNotifications({ notifyNewProducts: e.target.checked })
                }
                style={{ width: "1.25rem", height: "1.25rem" }}
              />
            </label>

            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.95rem", display: "block" }}>
                  Ярмарки, воркшопи та події
                </strong>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Нагадування про відкриті майстерні та зустрічі у вашому місті
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifications.notifyEvents}
                onChange={(e) =>
                  updateNotifications({ notifyEvents: e.target.checked })
                }
                style={{ width: "1.25rem", height: "1.25rem" }}
              />
            </label>

            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.95rem", display: "block" }}>
                  Історії майстерень
                </strong>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Цікаві розповіді про традиції, секрети ремесла та закулісся
                  майстрів
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifications.notifyStories}
                onChange={(e) =>
                  updateNotifications({ notifyStories: e.target.checked })
                }
                style={{ width: "1.25rem", height: "1.25rem" }}
              />
            </label>

            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.95rem", display: "block" }}>
                  Благодійні збори та ініціативи
                </strong>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Інформація про підтримку ремісничих шкіл та гуманітарні
                  проєкти
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifications.notifyCharity}
                onChange={(e) =>
                  updateNotifications({ notifyCharity: e.target.checked })
                }
                style={{ width: "1.25rem", height: "1.25rem" }}
              />
            </label>
          </div>
        </div>
      )}

      {/* Tab 4: Profile Details */}
      {activeTab === "details" && (
        <form
          onSubmit={handleSaveProfile}
          className="card"
          style={{
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>
              Особисті дані
            </h3>
            <p
              style={{
                color: "var(--color-ink-muted)",
                fontSize: "0.9rem",
                margin: 0,
              }}
            >
              Керуйте контактними даними для зручної взаємодії з платформою.
            </p>
          </div>

          {saveSuccessMessage && (
            <aside className="notice notice--success" style={{ margin: 0 }}>
              <p>{saveSuccessMessage}</p>
            </aside>
          )}

          <div className="form-group">
            <label
              htmlFor="profile-name"
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "0.35rem",
                fontSize: "0.9rem",
              }}
            >
              Ім&apos;я та прізвище
            </label>
            <input
              id="profile-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="catalog-search-input"
              required
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
              gap: "1rem",
            }}
          >
            <div className="form-group">
              <label
                htmlFor="profile-email"
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "0.35rem",
                  fontSize: "0.9rem",
                }}
              >
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="catalog-search-input"
                required
              />
            </div>

            <div className="form-group">
              <label
                htmlFor="profile-phone"
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "0.35rem",
                  fontSize: "0.9rem",
                }}
              >
                Телефон
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="catalog-search-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label
              htmlFor="profile-city"
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "0.35rem",
                fontSize: "0.9rem",
              }}
            >
              Місто / Населений пункт
            </label>
            <input
              id="profile-city"
              type="text"
              value={editCity}
              onChange={(e) => setEditCity(e.target.value)}
              className="catalog-search-input"
              required
            />
          </div>

          <div style={{ marginTop: "0.5rem" }}>
            <button type="submit" className="button button--primary">
              Зберегти зміни
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
