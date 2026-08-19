"use client";

import { useMemo, useState } from "react";
import { categoryOptions } from "../schema/artisan-application";
import { vendorCategoryOptions } from "../schema/vendor-product";

export type ApplicationStatus =
  "pending" | "under_review" | "approved" | "rejected";

export type ProductListingStatus =
  "submitted" | "under_review" | "approved" | "changes_requested" | "rejected";

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

export type SubmittedProductRecord = Readonly<{
  id: string;
  name: string;
  workshopName: string;
  categorySlug: string;
  description: string;
  priceUah: number;
  isOrganic: boolean;
  isCertified: boolean;
  isVerifiedCraft: boolean;
  status: ProductListingStatus;
  reviewerNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}>;

const hryvniaFormatter = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
});

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

const initialDemoProducts: readonly SubmittedProductRecord[] = [
  {
    id: "subprod_01",
    name: "Керамічна таріль «Поліське Сонце»",
    workshopName: "Майстерня Олени Ковальчук",
    categorySlug: "dim",
    description:
      "Глибока таріль ручного гончарного формування з чорнолощеної карпатської глини. Придатна для гарячих страв.",
    priceUah: 720,
    isOrganic: true,
    isCertified: true,
    isVerifiedCraft: true,
    status: "submitted",
    createdAt: "2026-08-19T11:00:00.000Z",
  },
  {
    id: "subprod_02",
    name: "Настінне панно «Дерево Життя»",
    workshopName: "Крафтова Різьба Полісся",
    categorySlug: "dim",
    description:
      "Різьблене авторське панно з витриманого поліського дуба з покриттям натуральним лляним маслом та бджолиним воском.",
    priceUah: 1850,
    isOrganic: true,
    isCertified: false,
    isVerifiedCraft: true,
    status: "under_review",
    reviewerNotes: "Уточнюємо вологість деревини та тип фіксаторів.",
    reviewedBy: "compliance_reviewer",
    reviewedAt: "2026-08-19T12:00:00.000Z",
    createdAt: "2026-08-18T16:30:00.000Z",
  },
  {
    id: "subprod_03",
    name: "Лляна сорочка «Ранкова Роса»",
    workshopName: "Лляне Ткацтво «Берегиня»",
    categorySlug: "odiah",
    description:
      "Традиційна сорочка вільного крою з домотканого пом'якшеного льону з ручною вишивкою рослинних мотивів гладдю.",
    priceUah: 2400,
    isOrganic: true,
    isCertified: true,
    isVerifiedCraft: true,
    status: "approved",
    reviewerNotes: "Зразки тканини відповідають стандарту 100% льону.",
    reviewedBy: "platform_admin",
    reviewedAt: "2026-08-18T18:00:00.000Z",
    createdAt: "2026-08-17T15:00:00.000Z",
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

const productStatusLabels: Record<
  ProductListingStatus,
  { label: string; color: string; bg: string }
> = {
  submitted: { label: "Очікує модерації", color: "#b06000", bg: "#fef7e0" },
  under_review: { label: "На перевірці", color: "#1a73e8", bg: "#e8f0fe" },
  approved: { label: "Схвалено до каталогу", color: "#137333", bg: "#e6f4ea" },
  changes_requested: {
    label: "Потребує змін",
    color: "#b06000",
    bg: "#fef7e0",
  },
  rejected: { label: "Відхилено", color: "#b3261e", bg: "#fce8e6" },
};

export function ModerationDashboard() {
  const [activeTab, setActiveTab] = useState<"applications" | "products">(
    "applications",
  );

  // Applications State
  const [applications, setApplications] = useState<
    readonly ArtisanApplicationRecord[]
  >(initialDemoApplications);
  const [appSearchQuery, setAppSearchQuery] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState<
    ApplicationStatus | "all"
  >("all");
  const [appCategoryFilter, setAppCategoryFilter] = useState<string>("all");
  const [activeModalApp, setActiveModalApp] =
    useState<ArtisanApplicationRecord | null>(null);
  const [modalAppNotes, setModalAppNotes] = useState("");

  // Products State
  const [products, setProducts] =
    useState<readonly SubmittedProductRecord[]>(initialDemoProducts);
  const [prodSearchQuery, setProdSearchQuery] = useState("");
  const [prodStatusFilter, setProdStatusFilter] = useState<
    ProductListingStatus | "all"
  >("all");
  const [prodCategoryFilter, setProdCategoryFilter] = useState<string>("all");
  const [activeModalProd, setActiveModalProd] =
    useState<SubmittedProductRecord | null>(null);
  const [modalProdNotes, setModalProdNotes] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);

  // Application Metrics
  const appMetrics = useMemo(() => {
    return {
      all: applications.length,
      pending: applications.filter((a) => a.status === "pending").length,
      under_review: applications.filter((a) => a.status === "under_review")
        .length,
      approved: applications.filter((a) => a.status === "approved").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    };
  }, [applications]);

  // Product Metrics
  const prodMetrics = useMemo(() => {
    return {
      all: products.length,
      submitted: products.filter((p) => p.status === "submitted").length,
      under_review: products.filter((p) => p.status === "under_review").length,
      approved: products.filter((p) => p.status === "approved").length,
      rejected: products.filter(
        (p) => p.status === "rejected" || p.status === "changes_requested",
      ).length,
    };
  }, [products]);

  // Filtered Applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        appSearchQuery.trim() === "" ||
        app.name.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
        app.workshopName.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
        app.email.toLowerCase().includes(appSearchQuery.toLowerCase());

      const matchesStatus =
        appStatusFilter === "all" || app.status === appStatusFilter;

      const matchesCategory =
        appCategoryFilter === "all" || app.category === appCategoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [applications, appSearchQuery, appStatusFilter, appCategoryFilter]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesSearch =
        prodSearchQuery.trim() === "" ||
        prod.name.toLowerCase().includes(prodSearchQuery.toLowerCase()) ||
        prod.workshopName
          .toLowerCase()
          .includes(prodSearchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(prodSearchQuery.toLowerCase());

      const matchesStatus =
        prodStatusFilter === "all" || prod.status === prodStatusFilter;

      const matchesCategory =
        prodCategoryFilter === "all" ||
        prod.categorySlug === prodCategoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [products, prodSearchQuery, prodStatusFilter, prodCategoryFilter]);

  const handleUpdateAppStatus = async (
    targetStatus: ApplicationStatus,
    notes?: string,
  ) => {
    if (!activeModalApp) return;
    setIsProcessing(true);
    const appId = activeModalApp.id;

    try {
      const medusaUrl =
        process.env["NEXT_PUBLIC_MEDUSA_API_URL"] || "http://127.0.0.1:9000";

      await fetch(
        `${medusaUrl}/admin/marketplace/artisan-applications/${appId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: targetStatus,
            reviewer_notes: notes || undefined,
          }),
        },
      ).catch(() => null);

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

      setActiveModalApp(null);
      setModalAppNotes("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateProdStatus = async (
    targetStatus: ProductListingStatus,
    notes?: string,
  ) => {
    if (!activeModalProd) return;
    setIsProcessing(true);
    const prodId = activeModalProd.id;

    try {
      setProducts((prev) =>
        prev.map((prod) => {
          if (prod.id === prodId) {
            return {
              ...prod,
              status: targetStatus,
              reviewerNotes: notes || null,
              reviewedBy: "compliance_reviewer (панель модератора)",
              reviewedAt: new Date().toISOString(),
            };
          }
          return prod;
        }),
      );

      setActiveModalProd(null);
      setModalProdNotes("");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="moderation-dashboard"
      style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
    >
      {/* Top Level Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          borderBottom: "2px solid var(--color-border)",
          paddingBottom: "0.5rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("applications")}
          className={`button ${activeTab === "applications" ? "button--primary" : "button--secondary"}`}
          style={{ padding: "0.6rem 1.25rem", fontSize: "0.95rem" }}
        >
          👥 Анкети майстерень ({appMetrics.all})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`button ${activeTab === "products" ? "button--primary" : "button--secondary"}`}
          style={{ padding: "0.6rem 1.25rem", fontSize: "0.95rem" }}
        >
          📦 Товари на модерації ({prodMetrics.all})
        </button>
      </div>

      {activeTab === "applications" ? (
        <>
          {/* Applications Metrics Row */}
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
              onClick={() => setAppStatusFilter("all")}
              className={`card ${appStatusFilter === "all" ? "card--active-border" : ""}`}
              style={{
                padding: "1.25rem",
                textAlign: "left",
                cursor: "pointer",
                background:
                  appStatusFilter === "all"
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
                {appMetrics.all}
              </p>
              <p
                style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}
              >
                Повний реєстр
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAppStatusFilter("pending")}
              className={`card ${appStatusFilter === "pending" ? "card--active-border" : ""}`}
              style={{
                padding: "1.25rem",
                textAlign: "left",
                cursor: "pointer",
                background:
                  appStatusFilter === "pending"
                    ? "#fef7e0"
                    : "var(--color-surface)",
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
                {appMetrics.pending}
              </p>
              <p
                style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}
              >
                Потребують оцінки
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAppStatusFilter("under_review")}
              className={`card ${appStatusFilter === "under_review" ? "card--active-border" : ""}`}
              style={{
                padding: "1.25rem",
                textAlign: "left",
                cursor: "pointer",
                background:
                  appStatusFilter === "under_review"
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
                {appMetrics.under_review}
              </p>
              <p
                style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}
              >
                Перевірка зразків
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAppStatusFilter("approved")}
              className={`card ${appStatusFilter === "approved" ? "card--active-border" : ""}`}
              style={{
                padding: "1.25rem",
                textAlign: "left",
                cursor: "pointer",
                background:
                  appStatusFilter === "approved"
                    ? "#e6f4ea"
                    : "var(--color-surface)",
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
                {appMetrics.approved}
              </p>
              <p
                style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}
              >
                Готові до каталогу
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAppStatusFilter("rejected")}
              className={`card ${appStatusFilter === "rejected" ? "card--active-border" : ""}`}
              style={{
                padding: "1.25rem",
                textAlign: "left",
                cursor: "pointer",
                background:
                  appStatusFilter === "rejected"
                    ? "#fce8e6"
                    : "var(--color-surface)",
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
                {appMetrics.rejected}
              </p>
              <p
                style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}
              >
                Не відповідають вимогам
              </p>
            </button>
          </div>

          {/* Applications Search & Filter */}
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
            <div style={{ flex: "1 1 18rem" }}>
              <input
                type="text"
                value={appSearchQuery}
                onChange={(e) => setAppSearchQuery(e.target.value)}
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
                htmlFor="app-category-filter"
                style={{ fontSize: "0.9rem", fontWeight: "600" }}
              >
                Категорія:
              </label>
              <select
                id="app-category-filter"
                value={appCategoryFilter}
                onChange={(e) => setAppCategoryFilter(e.target.value)}
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
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <p style={{ color: "var(--color-ink-muted)", fontSize: "0.95rem" }}>
              Знайдено анкет: <strong>{filteredApplications.length}</strong>
            </p>

            {filteredApplications.length === 0 ? (
              <div
                className="card"
                style={{ padding: "2.5rem", textAlign: "center" }}
              >
                <p
                  style={{
                    fontSize: "1.1rem",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  За вибраними критеріями анкет не знайдено.
                </p>
              </div>
            ) : (
              filteredApplications.map((app) => {
                const statusMeta = statusLabels[app.status];
                const categoryLabel =
                  categoryOptions.find((c) => c.value === app.category)
                    ?.label || app.category;

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
                        onClick={() => {
                          setActiveModalApp(app);
                          setModalAppNotes(app.reviewerNotes || "");
                        }}
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
                        <strong>Коментар модератора:</strong>{" "}
                        {app.reviewerNotes}
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
        </>
      ) : (
        <>
          {/* Products Metrics Row */}
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
              onClick={() => setProdStatusFilter("all")}
              className={`card ${prodStatusFilter === "all" ? "card--active-border" : ""}`}
              style={{
                padding: "1.25rem",
                textAlign: "left",
                cursor: "pointer",
                background:
                  prodStatusFilter === "all"
                    ? "var(--color-surface-muted)"
                    : "var(--color-surface)",
              }}
            >
              <p className="card__eyebrow">Всі вироби</p>
              <p
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "700",
                  margin: "0.25rem 0",
                  color: "var(--color-ink)",
                }}
              >
                {prodMetrics.all}
              </p>
              <p
                style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}
              >
                Подано майстернями
              </p>
            </button>

            <button
              type="button"
              onClick={() => setProdStatusFilter("submitted")}
              className={`card ${prodStatusFilter === "submitted" ? "card--active-border" : ""}`}
              style={{
                padding: "1.25rem",
                textAlign: "left",
                cursor: "pointer",
                background:
                  prodStatusFilter === "submitted"
                    ? "#fef7e0"
                    : "var(--color-surface)",
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
                {prodMetrics.submitted}
              </p>
              <p
                style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}
              >
                Нові подачі
              </p>
            </button>

            <button
              type="button"
              onClick={() => setProdStatusFilter("under_review")}
              className={`card ${prodStatusFilter === "under_review" ? "card--active-border" : ""}`}
              style={{
                padding: "1.25rem",
                textAlign: "left",
                cursor: "pointer",
                background:
                  prodStatusFilter === "under_review"
                    ? "#e8f0fe"
                    : "var(--color-surface)",
              }}
            >
              <p className="card__eyebrow" style={{ color: "#1a73e8" }}>
                🔍 На перевірці
              </p>
              <p
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "700",
                  margin: "0.25rem 0",
                  color: "#1a73e8",
                }}
              >
                {prodMetrics.under_review}
              </p>
              <p
                style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}
              >
                Комплаєнс описів
              </p>
            </button>

            <button
              type="button"
              onClick={() => setProdStatusFilter("approved")}
              className={`card ${prodStatusFilter === "approved" ? "card--active-border" : ""}`}
              style={{
                padding: "1.25rem",
                textAlign: "left",
                cursor: "pointer",
                background:
                  prodStatusFilter === "approved"
                    ? "#e6f4ea"
                    : "var(--color-surface)",
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
                {prodMetrics.approved}
              </p>
              <p
                style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}
              >
                Опубліковано
              </p>
            </button>
          </div>

          {/* Products Search & Filter */}
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
            <div style={{ flex: "1 1 18rem" }}>
              <input
                type="text"
                value={prodSearchQuery}
                onChange={(e) => setProdSearchQuery(e.target.value)}
                placeholder="Пошук виробу за назвою, майстернею чи описом..."
                className="catalog-search-input"
                aria-label="Пошук виробів"
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
                htmlFor="prod-category-filter"
                style={{ fontSize: "0.9rem", fontWeight: "600" }}
              >
                Категорія:
              </label>
              <select
                id="prod-category-filter"
                value={prodCategoryFilter}
                onChange={(e) => setProdCategoryFilter(e.target.value)}
                className="catalog-search-input"
                style={{ width: "auto", padding: "0.4rem 0.75rem" }}
              >
                <option value="all">Усі категорії</option>
                {vendorCategoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products List */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <p style={{ color: "var(--color-ink-muted)", fontSize: "0.95rem" }}>
              Знайдено виробів: <strong>{filteredProducts.length}</strong>
            </p>

            {filteredProducts.length === 0 ? (
              <div
                className="card"
                style={{ padding: "2.5rem", textAlign: "center" }}
              >
                <p
                  style={{
                    fontSize: "1.1rem",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  За вибраними критеріями виробів не знайдено.
                </p>
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const statusMeta = productStatusLabels[prod.status];
                const categoryLabel =
                  vendorCategoryOptions.find(
                    (c) => c.value === prod.categorySlug,
                  )?.label || prod.categorySlug;

                return (
                  <article
                    key={prod.id}
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
                            {prod.name}
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
                          Майстерня: <strong>{prod.workshopName}</strong> •
                          Категорія: {categoryLabel}
                        </p>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "1.35rem",
                            fontWeight: "700",
                            color: "var(--color-primary-strong)",
                          }}
                        >
                          {hryvniaFormatter.format(prod.priceUah)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveModalProd(prod);
                            setModalProdNotes(prod.reviewerNotes || "");
                          }}
                          className="button button--secondary button--sm"
                          aria-label={`Модерація товару: ${prod.name}`}
                        >
                          📝 Модерувати
                        </button>
                      </div>
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
                      <p style={{ margin: 0 }}>{prod.description}</p>
                    </div>

                    {/* Badges */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.35rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {prod.isVerifiedCraft && (
                        <span
                          className="badge badge--verified"
                          style={{ background: "#e6f4ea", color: "#137333" }}
                        >
                          ✓ Перевірений майстер
                        </span>
                      )}
                      {prod.isOrganic && (
                        <span
                          className="badge badge--organic"
                          style={{ background: "#fef7e0", color: "#b06000" }}
                        >
                          🌿 Органічний склад
                        </span>
                      )}
                      {prod.isCertified && (
                        <span
                          className="badge badge--certified"
                          style={{ background: "#e8f0fe", color: "#1a73e8" }}
                        >
                          ★ Сертифікована якість
                        </span>
                      )}
                    </div>

                    {prod.reviewerNotes && (
                      <div
                        style={{
                          backgroundColor: "#f8f9fa",
                          borderLeft: "3px solid var(--color-primary)",
                          padding: "0.6rem 0.9rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        <strong>Коментар модератора:</strong>{" "}
                        {prod.reviewerNotes}
                        {prod.reviewedBy && (
                          <span style={{ color: "var(--color-ink-muted)" }}>
                            {" "}
                            ({prod.reviewedBy})
                          </span>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Application Review Modal */}
      {activeModalApp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-app-title"
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
              id="review-modal-app-title"
              style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}
            >
              Модерація анкети: {activeModalApp.workshopName}
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
                htmlFor="review-app-notes"
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
                id="review-app-notes"
                rows={4}
                value={modalAppNotes}
                onChange={(e) => setModalAppNotes(e.target.value)}
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
                onClick={() => setActiveModalApp(null)}
                className="button button--secondary button--sm"
              >
                Скасувати
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  handleUpdateAppStatus("under_review", modalAppNotes)
                }
                className="button button--secondary button--sm"
                style={{ color: "#1a73e8" }}
              >
                🔍 Взяти на розгляд
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleUpdateAppStatus("rejected", modalAppNotes)}
                className="button button--secondary button--sm"
                style={{ color: "#b3261e" }}
              >
                ❌ Відхилити
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleUpdateAppStatus("approved", modalAppNotes)}
                className="button button--primary button--sm"
              >
                ✅ Схвалити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Review Modal */}
      {activeModalProd && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-prod-title"
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
              id="review-modal-prod-title"
              style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}
            >
              Модерація виробу: {activeModalProd.name}
            </h2>
            <p
              style={{
                color: "var(--color-ink-muted)",
                fontSize: "0.9rem",
                marginBottom: "1.25rem",
              }}
            >
              Майстерня: {activeModalProd.workshopName} • Ціна:{" "}
              {hryvniaFormatter.format(activeModalProd.priceUah)}
            </p>

            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label
                htmlFor="review-prod-notes"
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "0.35rem",
                  fontSize: "0.9rem",
                }}
              >
                Зауваження або висновок модератора:
              </label>
              <textarea
                id="review-prod-notes"
                rows={4}
                value={modalProdNotes}
                onChange={(e) => setModalProdNotes(e.target.value)}
                placeholder="Вкажіть коментар щодо опису, матеріалів чи погодження публікації..."
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
                onClick={() => setActiveModalProd(null)}
                className="button button--secondary button--sm"
              >
                Скасувати
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  handleUpdateProdStatus("under_review", modalProdNotes)
                }
                className="button button--secondary button--sm"
                style={{ color: "#1a73e8" }}
              >
                🔍 На перевірку
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  handleUpdateProdStatus("changes_requested", modalProdNotes)
                }
                className="button button--secondary button--sm"
                style={{ color: "#b06000" }}
              >
                🔄 Запросити зміни
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  handleUpdateProdStatus("rejected", modalProdNotes)
                }
                className="button button--secondary button--sm"
                style={{ color: "#b3261e" }}
              >
                ❌ Відхилити
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  handleUpdateProdStatus("approved", modalProdNotes)
                }
                className="button button--primary button--sm"
              >
                ✅ Схвалити до каталогу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
