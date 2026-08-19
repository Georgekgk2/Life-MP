"use client";

import { useMemo, useState } from "react";
import { categoryOptions } from "../schema/artisan-application";

export type ApplicationStatus =
  "pending" | "under_review" | "approved" | "rejected";

export type ArtisanApplicationRecord = Readonly<{
  id: string;
  name: string;
  workshopName: string;
  category: string;
  description: string;
  email: string;
  phone: string;
  portfolioUrl?: string | null;
  status: ApplicationStatus;
  reviewerNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}>;

const initialDemoApplications: readonly ArtisanApplicationRecord[] = [
  {
    id: "artapp_01",
    name: "Оксана Шевченко",
    workshopName: "Майстерня «Глина та Світло»",
    category: "pottery",
    description:
      "Авторська гончарна кераміка ручної роботи з карпатської глини. Використовуємо техніку молочіння та натуральні ангоби.",
    email: "oksana@hlynasvitlo.ua",
    phone: "+380 67 123 45 67",
    portfolioUrl: "https://instagram.com/hlyna_svitlo",
    status: "pending",
    createdAt: "2026-08-19T10:15:00.000Z",
  },
  {
    id: "artapp_02",
    name: "Ярослав Дерев'янко",
    workshopName: "Крафтова Різьба Полісся",
    category: "home",
    description:
      "Екологічний дерев'яний декор, авторські свічники та посуд із сухостійного поліського дуба та ясеня.",
    email: "yaroslav@polissia-craft.ua",
    phone: "+380 50 987 65 43",
    portfolioUrl: "https://instagram.com/polissia_craft",
    status: "under_review",
    reviewerNotes:
      "Ознайомлюємося зі зразками обробки дерева та сертифікатами безпеки.",
    reviewedBy: "compliance_reviewer_olena",
    reviewedAt: "2026-08-19T12:30:00.000Z",
    createdAt: "2026-08-18T14:20:00.000Z",
  },
  {
    id: "artapp_03",
    name: "Марія Ткач",
    workshopName: "Лляне Ткацтво «Берегиня»",
    category: "textile",
    description:
      "Традиційні домоткані рушники, наволочки та серветки з українського льону з автентичними орнаментами Волині.",
    email: "maria@berehynia-linen.ua",
    phone: "+380 63 333 22 11",
    portfolioUrl: "https://berehynia-craft.ua",
    status: "approved",
    reviewerNotes:
      "Повністю відповідає стандартам локальності та автентичності. Схвалено до каталогу.",
    reviewedBy: "platform_admin",
    reviewedAt: "2026-08-18T16:00:00.000Z",
    createdAt: "2026-08-17T09:00:00.000Z",
  },
  {
    id: "artapp_04",
    name: "Андрій Мельник",
    workshopName: "Карпатські Трави та Мед",
    category: "gastronomy",
    description:
      "Дикороси, високогірний карпатський чай та натуральний акацієвий мед без цукру та домішок.",
    email: "andriy@karpaty-herbs.ua",
    phone: "+380 97 555 44 33",
    portfolioUrl: null,
    status: "approved",
    reviewerNotes: "Зразки меду перевірено, склад 100% натуральний.",
    reviewedBy: "compliance_reviewer_taras",
    reviewedAt: "2026-08-18T17:15:00.000Z",
    createdAt: "2026-08-16T11:45:00.000Z",
  },
];

const statusLabels: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Очікує розгляду", color: "#b06000", bg: "#fef7e0" },
  under_review: { label: "На розгляді", color: "#1a73e8", bg: "#e8f0fe" },
  approved: { label: "Схвалено", color: "#137333", bg: "#e6f4ea" },
  rejected: { label: "Відхилено", color: "#b3261e", bg: "#fce8e6" },
};

export function ModerationDashboard() {
  const [applications, setApplications] = useState<
    readonly ArtisanApplicationRecord[]
  >(initialDemoApplications);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeModalApp, setActiveModalApp] =
    useState<ArtisanApplicationRecord | null>(null);
  const [modalNotes, setModalNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Status Metrics
  const metrics = useMemo(() => {
    return {
      all: applications.length,
      pending: applications.filter((a) => a.status === "pending").length,
      under_review: applications.filter((a) => a.status === "under_review")
        .length,
      approved: applications.filter((a) => a.status === "approved").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    };
  }, [applications]);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Search
      const matchesSearch =
        searchQuery.trim() === "" ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.workshopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email.toLowerCase().includes(searchQuery.toLowerCase());

      // Status
      const matchesStatus =
        statusFilter === "all" || app.status === statusFilter;

      // Category
      const matchesCategory =
        categoryFilter === "all" || app.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [applications, searchQuery, statusFilter, categoryFilter]);

  const handleOpenReviewModal = (app: ArtisanApplicationRecord) => {
    setActiveModalApp(app);
    setModalNotes(app.reviewerNotes || "");
  };

  const handleCloseModal = () => {
    setActiveModalApp(null);
    setModalNotes("");
  };

  const handleUpdateStatus = async (
    targetStatus: ApplicationStatus,
    notes?: string,
  ) => {
    if (!activeModalApp) return;

    setIsProcessing(true);
    const appId = activeModalApp.id;

    try {
      // Attempt API call to Medusa admin endpoint if available
      const medusaUrl =
        process.env["NEXT_PUBLIC_MEDUSA_API_URL"] || "http://127.0.0.1:9000";

      await fetch(
        `${medusaUrl}/admin/marketplace/artisan-applications/${appId}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: targetStatus,
            reviewer_notes: notes || undefined,
          }),
        },
      ).catch(() => null);

      // Reactively update state
      setApplications((prev) =>
        prev.map((app) => {
          if (app.id === appId) {
            return {
              ...app,
              status: targetStatus,
              reviewerNotes: notes || null,
              reviewedBy: "compliance_reviewer (панель модератора)",
              reviewedAt: new Date().toISOString(),
            };
          }
          return app;
        }),
      );

      handleCloseModal();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="moderation-dashboard"
      style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
    >
      {/* Metrics Row */}
      <div
        className="moderation-metrics"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
          gap: "1rem",
        }}
      >
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`card ${statusFilter === "all" ? "card--active-border" : ""}`}
          style={{
            padding: "1.25rem",
            textAlign: "left",
            cursor: "pointer",
            background:
              statusFilter === "all"
                ? "var(--color-surface-muted)"
                : "var(--color-surface)",
          }}
        >
          <p className="card__eyebrow">Всі заявки</p>
          <p
            style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              margin: "0.25rem 0",
              color: "var(--color-ink)",
            }}
          >
            {metrics.all}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}>
            Повний реєстр
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("pending")}
          className={`card ${statusFilter === "pending" ? "card--active-border" : ""}`}
          style={{
            padding: "1.25rem",
            textAlign: "left",
            cursor: "pointer",
            background:
              statusFilter === "pending" ? "#fef7e0" : "var(--color-surface)",
          }}
        >
          <p className="card__eyebrow" style={{ color: "#b06000" }}>
            ⏳ Очікують
          </p>
          <p
            style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              margin: "0.25rem 0",
              color: "#b06000",
            }}
          >
            {metrics.pending}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}>
            Потребують оцінки
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("under_review")}
          className={`card ${statusFilter === "under_review" ? "card--active-border" : ""}`}
          style={{
            padding: "1.25rem",
            textAlign: "left",
            cursor: "pointer",
            background:
              statusFilter === "under_review"
                ? "#e8f0fe"
                : "var(--color-surface)",
          }}
        >
          <p className="card__eyebrow" style={{ color: "#1a73e8" }}>
            🔍 На розгляді
          </p>
          <p
            style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              margin: "0.25rem 0",
              color: "#1a73e8",
            }}
          >
            {metrics.under_review}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}>
            Перевірка зразків
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("approved")}
          className={`card ${statusFilter === "approved" ? "card--active-border" : ""}`}
          style={{
            padding: "1.25rem",
            textAlign: "left",
            cursor: "pointer",
            background:
              statusFilter === "approved" ? "#e6f4ea" : "var(--color-surface)",
          }}
        >
          <p className="card__eyebrow" style={{ color: "#137333" }}>
            ✅ Схвалені
          </p>
          <p
            style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              margin: "0.25rem 0",
              color: "#137333",
            }}
          >
            {metrics.approved}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}>
            Готові до каталогу
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("rejected")}
          className={`card ${statusFilter === "rejected" ? "card--active-border" : ""}`}
          style={{
            padding: "1.25rem",
            textAlign: "left",
            cursor: "pointer",
            background:
              statusFilter === "rejected" ? "#fce8e6" : "var(--color-surface)",
          }}
        >
          <p className="card__eyebrow" style={{ color: "#b3261e" }}>
            ❌ Відхилені
          </p>
          <p
            style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              margin: "0.25rem 0",
              color: "#b3261e",
            }}
          >
            {metrics.rejected}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}>
            Не відповідають вимогам
          </p>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="card"
        style={{
          padding: "1.25rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ flex: "1 1 18rem", position: "relative" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Пошук за майстром, назвою майстерні чи email..."
            className="catalog-search-input"
            aria-label="Пошук заявок"
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label
            htmlFor="category-filter"
            style={{ fontSize: "0.9rem", fontWeight: "600" }}
          >
            Категорія:
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="catalog-search-input"
            style={{ width: "auto", padding: "0.4rem 0.75rem" }}
          >
            <option value="all">Усі категорії</option>
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "0.95rem" }}>
          Знайдено заявок: <strong>{filteredApplications.length}</strong>
        </p>

        {filteredApplications.length === 0 ? (
          <div
            className="card"
            style={{ padding: "2.5rem", textAlign: "center" }}
          >
            <p style={{ fontSize: "1.1rem", color: "var(--color-ink-muted)" }}>
              За вибраними критеріями заявки не знайдено.
            </p>
          </div>
        ) : (
          filteredApplications.map((app) => {
            const statusMeta = statusLabels[app.status];
            const categoryLabel =
              categoryOptions.find((c) => c.value === app.category)?.label ||
              app.category;

            return (
              <article
                key={app.id}
                className="card"
                style={{
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "1.2rem",
                          margin: 0,
                          color: "var(--color-ink)",
                        }}
                      >
                        {app.workshopName}
                      </h3>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: statusMeta.bg,
                          color: statusMeta.color,
                          fontWeight: "600",
                        }}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                    <p
                      style={{
                        color: "var(--color-ink-muted)",
                        fontSize: "0.9rem",
                        marginTop: "0.2rem",
                      }}
                    >
                      Майстер: <strong>{app.name}</strong> • Категорія:{" "}
                      {categoryLabel}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenReviewModal(app)}
                    className="button button--secondary button--sm"
                    aria-label={`Модерація заявки: ${app.workshopName}`}
                  >
                    📝 Рецензувати
                  </button>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--color-surface-muted)",
                    padding: "0.9rem",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.95rem",
                    lineHeight: "1.5",
                  }}
                >
                  <p style={{ margin: 0 }}>{app.description}</p>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    fontSize: "0.85rem",
                    color: "var(--color-ink-subtle)",
                    borderTop: "1px solid var(--color-border)",
                    paddingTop: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "1.25rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>✉️ {app.email}</span>
                    <span>📞 {app.phone}</span>
                    {app.portfolioUrl && (
                      <a
                        href={app.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--color-primary-strong)" }}
                      >
                        🔗 Портфоліо
                      </a>
                    )}
                  </div>
                  <span>
                    📅 Подано:{" "}
                    {new Date(app.createdAt).toLocaleDateString("uk-UA")}
                  </span>
                </div>

                {app.reviewerNotes && (
                  <div
                    style={{
                      backgroundColor: "#f8f9fa",
                      borderLeft: "3px solid var(--color-primary)",
                      padding: "0.6rem 0.9rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <strong>Коментар модератора:</strong> {app.reviewerNotes}
                    {app.reviewedBy && (
                      <span style={{ color: "var(--color-ink-muted)" }}>
                        {" "}
                        ({app.reviewedBy})
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Review Modal Dialog */}
      {activeModalApp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: "36rem",
              width: "100%",
              padding: "2rem",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2
              id="review-modal-title"
              style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}
            >
              Модерація: {activeModalApp.workshopName}
            </h2>
            <p
              style={{
                color: "var(--color-ink-muted)",
                fontSize: "0.9rem",
                marginBottom: "1.25rem",
              }}
            >
              Майстер: {activeModalApp.name} ({activeModalApp.email})
            </p>

            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label
                htmlFor="review-notes"
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "0.35rem",
                  fontSize: "0.9rem",
                }}
              >
                Коментар модератора та зауваження:
              </label>
              <textarea
                id="review-notes"
                rows={4}
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder="Зафіксуйте висновок щодо якості, складу та автентичності матеріалів..."
                className="catalog-search-input"
                style={{ resize: "vertical", fontFamily: "inherit" }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleCloseModal}
                className="button button--secondary button--sm"
              >
                Скасувати
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleUpdateStatus("under_review", modalNotes)}
                className="button button--secondary button--sm"
                style={{ color: "#1a73e8" }}
              >
                🔍 Взяти на розгляд
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleUpdateStatus("rejected", modalNotes)}
                className="button button--secondary button--sm"
                style={{ color: "#b3261e" }}
              >
                ❌ Відхилити
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleUpdateStatus("approved", modalNotes)}
                className="button button--primary button--sm"
              >
                ✅ Схвалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
