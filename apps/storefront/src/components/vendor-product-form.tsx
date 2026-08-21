"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  vendorCategoryOptions,
  vendorProductSchema,
  type VendorProductInput,
} from "../schema/vendor-product";
import { formatHryvnia } from "@/formatters";

type FormErrors = Partial<Record<keyof VendorProductInput, string>>;

export function VendorProductForm() {
  const [formData, setFormData] = useState<{
    name: string;
    workshopName: string;
    categorySlug:
      | "odiah"
      | "dim"
      | "knyhy"
      | "kanzeliariia"
      | "podarunky"
      | "maisteria"
      | "";
    description: string;
    priceUah: string;
    isOrganic: boolean;
    isCertified: boolean;
    isVerifiedCraft: boolean;
    acceptedRules: boolean;
  }>({
    name: "",
    workshopName: "",
    categorySlug: "",
    description: "",
    priceUah: "",
    isOrganic: false,
    isCertified: false,
    isVerifiedCraft: true,
    acceptedRules: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submittedProduct, setSubmittedProduct] =
    useState<VendorProductInput | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    field: keyof typeof formData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const parsedPrice = parseInt(formData.priceUah, 10);
    const result = vendorProductSchema.safeParse({
      ...formData,
      priceUah: isNaN(parsedPrice) ? undefined : parsedPrice,
    });

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as keyof VendorProductInput;
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      // Optional Medusa vendor API linkage
      const medusaUrl =
        process.env["NEXT_PUBLIC_MEDUSA_API_URL"] || "http://127.0.0.1:9000";

      await fetch(`${medusaUrl}/vendor/marketplace/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.data.name,
          description: result.data.description,
        }),
        signal: AbortSignal.timeout(500),
      }).catch(() => null);

      setSubmittedProduct(result.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      workshopName: "",
      categorySlug: "",
      description: "",
      priceUah: "",
      isOrganic: false,
      isCertified: false,
      isVerifiedCraft: true,
      acceptedRules: false,
    });
    setErrors({});
    setSubmittedProduct(null);
  };

  if (submittedProduct) {
    const selectedCategoryLabel =
      vendorCategoryOptions.find(
        (c) => c.value === submittedProduct.categorySlug,
      )?.label ?? submittedProduct.categorySlug;

    return (
      <div className="card vendor-product-success" style={{ padding: "2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "3rem" }} role="img" aria-label="Успіх">
            🎉
          </span>
          <h2
            style={{
              fontSize: "1.5rem",
              marginTop: "0.75rem",
              marginBottom: "0.5rem",
              color: "var(--color-primary-strong)",
            }}
          >
            Виріб успішно надіслано на модерацію!
          </h2>
          <p
            style={{
              color: "var(--color-ink-muted)",
              maxWidth: "36rem",
              margin: "0 auto",
            }}
          >
            Дякуємо! Виріб зареєстровано та передано команді комплаєнс-контролю.
            Після перевірки він з&apos;явиться в публічному каталозі Life-MP.
          </p>
        </div>

        {/* Product Card Preview */}
        <div style={{ maxWidth: "26rem", margin: "0 auto 1.75rem auto" }}>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--color-ink-muted)",
              marginBottom: "0.5rem",
              textAlign: "center",
            }}
          >
            Попередній перегляд у каталозі:
          </p>
          <article
            className="card product-card"
            style={{ boxShadow: "var(--shadow-card-raised)" }}
          >
            <div
              aria-hidden="true"
              className="card__visual product-card__visual"
            >
              <span className="card__visual-label">
                {submittedProduct.name}
              </span>
            </div>
            <div className="card__content">
              <p className="card__eyebrow">
                Майстер: {submittedProduct.workshopName} •{" "}
                {selectedCategoryLabel}
              </p>
              <h3 className="card__title">{submittedProduct.name}</h3>
              <p className="card__description">
                {submittedProduct.description}
              </p>
              <div className="card__meta">
                <data value={submittedProduct.priceUah}>
                  {formatHryvnia(submittedProduct.priceUah)}
                </data>
                <div
                  className="badge-group"
                  style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}
                >
                  <span
                    className="badge"
                    style={{ backgroundColor: "#e8f0fe", color: "#1a73e8" }}
                  >
                    На модерації
                  </span>
                  {submittedProduct.isVerifiedCraft && (
                    <span
                      className="badge badge--verified"
                      style={{ background: "#e6f4ea", color: "#137333" }}
                    >
                      ✓ Перевірений майстер
                    </span>
                  )}
                  {submittedProduct.isOrganic && (
                    <span
                      className="badge badge--organic"
                      style={{ background: "#fef7e0", color: "#b06000" }}
                    >
                      🌿 Органічний склад
                    </span>
                  )}
                  {submittedProduct.isCertified && (
                    <span
                      className="badge badge--certified"
                      style={{ background: "#e8f0fe", color: "#1a73e8" }}
                    >
                      ★ Сертифікована якість
                    </span>
                  )}
                </div>
              </div>
            </div>
          </article>
        </div>

        <aside className="notice" style={{ marginBottom: "1.5rem" }}>
          <h4 className="notice__title">
            Статус модерації (Phase P0 Containment)
          </h4>
          <p>
            Виріб отримав статус <code>submitted</code>. Модератори платформи
            можуть переглянути його в кабінеті модератора та схвалити для
            відображення на вітрині.
          </p>
        </aside>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            className="button button--secondary"
          >
            Додати ще один виріб
          </button>
          <Link href="/moderation" className="button button--primary">
            Перейти до кабінету модератора
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="card vendor-product-form"
      style={{
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
      aria-label="Форма подачі товару на модерацію"
    >
      <div>
        <h2
          style={{
            fontSize: "1.25rem",
            marginBottom: "0.25rem",
            color: "var(--color-ink)",
          }}
        >
          Параметри нового виробу
        </h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "0.9rem" }}>
          Опишіть ваш виріб, вкажіть ціну та виберіть категорію для розміщення в
          каталозі Life-MP.
        </p>
      </div>

      {/* Product Name */}
      <div className="form-group">
        <label
          htmlFor="product-name"
          style={{
            display: "block",
            fontWeight: "600",
            marginBottom: "0.35rem",
            fontSize: "0.9rem",
          }}
        >
          Назва виробу{" "}
          <span style={{ color: "var(--color-critical, #b3261e)" }}>*</span>
        </label>
        <input
          id="product-name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Наприклад: Керамічна таріль «Поліське Сонце»"
          className="catalog-search-input"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p
            id="name-error"
            style={{
              color: "var(--color-critical, #b3261e)",
              fontSize: "0.85rem",
              marginTop: "0.25rem",
            }}
          >
            {errors.name}
          </p>
        )}
      </div>

      {/* Workshop Name */}
      <div className="form-group">
        <label
          htmlFor="product-workshop"
          style={{
            display: "block",
            fontWeight: "600",
            marginBottom: "0.35rem",
            fontSize: "0.9rem",
          }}
        >
          Майстерня чи бренд-виробник{" "}
          <span style={{ color: "var(--color-critical, #b3261e)" }}>*</span>
        </label>
        <input
          id="product-workshop"
          type="text"
          value={formData.workshopName}
          onChange={(e) => handleChange("workshopName", e.target.value)}
          placeholder="Наприклад: Майстерня Олени Ковальчук"
          className="catalog-search-input"
          aria-invalid={Boolean(errors.workshopName)}
          aria-describedby={errors.workshopName ? "workshop-error" : undefined}
        />
        {errors.workshopName && (
          <p
            id="workshop-error"
            style={{
              color: "var(--color-critical, #b3261e)",
              fontSize: "0.85rem",
              marginTop: "0.25rem",
            }}
          >
            {errors.workshopName}
          </p>
        )}
      </div>

      {/* Category & Price Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Category */}
        <div className="form-group">
          <label
            htmlFor="product-category"
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "0.35rem",
              fontSize: "0.9rem",
            }}
          >
            Категорія каталогу{" "}
            <span style={{ color: "var(--color-critical, #b3261e)" }}>*</span>
          </label>
          <select
            id="product-category"
            value={formData.categorySlug}
            onChange={(e) => handleChange("categorySlug", e.target.value)}
            className="catalog-search-input"
            aria-invalid={Boolean(errors.categorySlug)}
            aria-describedby={
              errors.categorySlug ? "category-error" : undefined
            }
          >
            <option value="">-- Оберіть категорію --</option>
            {vendorCategoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.categorySlug && (
            <p
              id="category-error"
              style={{
                color: "var(--color-critical, #b3261e)",
                fontSize: "0.85rem",
                marginTop: "0.25rem",
              }}
            >
              {errors.categorySlug}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="form-group">
          <label
            htmlFor="product-price"
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "0.35rem",
              fontSize: "0.9rem",
            }}
          >
            Ціна виробу (₴){" "}
            <span style={{ color: "var(--color-critical, #b3261e)" }}>*</span>
          </label>
          <input
            id="product-price"
            type="number"
            min={1}
            max={100000}
            step={1}
            value={formData.priceUah}
            onChange={(e) => handleChange("priceUah", e.target.value)}
            placeholder="550"
            className="catalog-search-input"
            aria-invalid={Boolean(errors.priceUah)}
            aria-describedby={errors.priceUah ? "price-error" : undefined}
          />
          {errors.priceUah && (
            <p
              id="price-error"
              style={{
                color: "var(--color-critical, #b3261e)",
                fontSize: "0.85rem",
                marginTop: "0.25rem",
              }}
            >
              {errors.priceUah}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="form-group">
        <label
          htmlFor="product-desc"
          style={{
            display: "block",
            fontWeight: "600",
            marginBottom: "0.35rem",
            fontSize: "0.9rem",
          }}
        >
          Опис виробу, техніка та матеріали{" "}
          <span style={{ color: "var(--color-critical, #b3261e)" }}>*</span>
        </label>
        <textarea
          id="product-desc"
          rows={4}
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Детально опишіть матеріали (наприклад, 100% карпатська глина, лляна нитка), спосіб виготовлення та призначення..."
          className="catalog-search-input"
          style={{ resize: "vertical", fontFamily: "inherit" }}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "desc-error" : undefined}
        />
        {errors.description && (
          <p
            id="desc-error"
            style={{
              color: "var(--color-critical, #b3261e)",
              fontSize: "0.85rem",
              marginTop: "0.25rem",
            }}
          >
            {errors.description}
          </p>
        )}
      </div>

      {/* Attributes & Badges */}
      <div className="form-group">
        <p
          style={{
            fontWeight: "600",
            marginBottom: "0.5rem",
            fontSize: "0.9rem",
          }}
        >
          Ознаки та маркування виробу:
        </p>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={formData.isOrganic}
              onChange={(e) => handleChange("isOrganic", e.target.checked)}
            />
            <span>
              🌿 Органічний склад (натуральні барвники, сировина без синтетичних
              домішок)
            </span>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={formData.isCertified}
              onChange={(e) => handleChange("isCertified", e.target.checked)}
            />
            <span>
              ★ Сертифікована якість (наявність лабораторних висновків чи
              сертифікатів майстерні)
            </span>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={formData.isVerifiedCraft}
              onChange={(e) =>
                handleChange("isVerifiedCraft", e.target.checked)
              }
            />
            <span>
              ✓ Авторська техніка та ручна праця українського ремісника
            </span>
          </label>
        </div>
      </div>

      {/* Terms Checkbox */}
      <div className="form-group" style={{ marginTop: "0.25rem" }}>
        <label
          htmlFor="product-rules"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.6rem",
            cursor: "pointer",
            fontSize: "0.9rem",
            color: "var(--color-ink)",
          }}
        >
          <input
            id="product-rules"
            type="checkbox"
            checked={formData.acceptedRules}
            onChange={(e) => handleChange("acceptedRules", e.target.checked)}
            style={{ marginTop: "0.2rem" }}
            aria-invalid={Boolean(errors.acceptedRules)}
            aria-describedby={errors.acceptedRules ? "rules-error" : undefined}
          />
          <span>
            Я підтверджую, що виріб виготовлено в Україні відповідно до
            стандартів чесного ремесла та надаю згоду на проведення
            комплаєнс-модерації перед публікацією.{" "}
            <span style={{ color: "var(--color-critical, #b3261e)" }}>*</span>
          </span>
        </label>
        {errors.acceptedRules && (
          <p
            id="rules-error"
            style={{
              color: "var(--color-critical, #b3261e)",
              fontSize: "0.85rem",
              marginTop: "0.25rem",
              marginLeft: "1.6rem",
            }}
          >
            {errors.acceptedRules}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div style={{ marginTop: "0.75rem" }}>
        <button
          type="submit"
          disabled={isSubmitting}
          className="button button--primary"
          style={{
            width: "100%",
            padding: "0.85rem",
            fontSize: "1rem",
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting
            ? "Відправка на модерацію..."
            : "Подати виріб на модерацію"}
        </button>
      </div>
    </form>
  );
}
