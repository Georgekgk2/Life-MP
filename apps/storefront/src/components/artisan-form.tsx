"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  artisanApplicationSchema,
  categoryOptions,
  type ArtisanApplicationInput,
  type ArtisanCategory,
} from "../schema/artisan-application";

type FormErrors = Partial<Record<keyof ArtisanApplicationInput, string>>;

export function ArtisanForm() {
  const [formData, setFormData] = useState<{
    name: string;
    workshopName: string;
    category: ArtisanCategory | "";
    description: string;
    email: string;
    phone: string;
    portfolioUrl: string;
    acceptedTerms: boolean;
  }>({
    name: "",
    workshopName: "",
    category: "",
    description: "",
    email: "",
    phone: "",
    portfolioUrl: "",
    acceptedTerms: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submittedData, setSubmittedData] =
    useState<ArtisanApplicationInput | null>(null);

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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = artisanApplicationSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as keyof ArtisanApplicationInput;
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmittedData(result.data);
  };

  const handleReset = () => {
    setFormData({
      name: "",
      workshopName: "",
      category: "",
      description: "",
      email: "",
      phone: "",
      portfolioUrl: "",
      acceptedTerms: false,
    });
    setErrors({});
    setSubmittedData(null);
  };

  if (submittedData) {
    const selectedCategoryLabel =
      categoryOptions.find((c) => c.value === submittedData.category)?.label ??
      submittedData.category;

    return (
      <div className="artisan-form-success card" style={{ padding: "2rem" }}>
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
            Заявку успішно прийнято на модерацію!
          </h2>
          <p
            style={{
              color: "var(--color-ink-muted)",
              maxWidth: "36rem",
              margin: "0 auto",
            }}
          >
            Дякуємо за прагнення стати частиною спільноти українських майстерень
            Life-MP. Ми ознайомимося з вашими роботами та зв&apos;яжемося з
            вами.
          </p>
        </div>

        <div
          style={{
            backgroundColor: "var(--color-canvas)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <h3
            style={{
              fontSize: "1.1rem",
              marginBottom: "0.75rem",
              color: "var(--color-ink)",
            }}
          >
            Підсумок вашої заявки:
          </h3>
          <dl className="data-list">
            <div className="data-list__item">
              <dt className="data-list__label">Майстер</dt>
              <dd className="data-list__value">{submittedData.name}</dd>
            </div>
            <div className="data-list__item">
              <dt className="data-list__label">Майстерня / Бренд</dt>
              <dd className="data-list__value">{submittedData.workshopName}</dd>
            </div>
            <div className="data-list__item">
              <dt className="data-list__label">Категорія</dt>
              <dd className="data-list__value">{selectedCategoryLabel}</dd>
            </div>
            <div className="data-list__item">
              <dt className="data-list__label">Email для зв&apos;язку</dt>
              <dd className="data-list__value">{submittedData.email}</dd>
            </div>
            <div className="data-list__item">
              <dt className="data-list__label">Телефон</dt>
              <dd className="data-list__value">{submittedData.phone}</dd>
            </div>
            {submittedData.portfolioUrl && (
              <div className="data-list__item">
                <dt className="data-list__label">Портфоліо / Соцмережі</dt>
                <dd className="data-list__value">
                  {submittedData.portfolioUrl}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <aside className="notice" style={{ marginBottom: "1.5rem" }}>
          <h4 className="notice__title">Демонстраційний прототип</h4>
          <p>
            Ця заявка оброблена в локальному сеансі браузера. Жодні персональні
            дані не передаються на неперевірені зовнішні сервери згідно з
            політикою ізоляції Phase P0 Containment.
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
            Подати ще одну заявку
          </button>
          <Link href="/catalog" className="button button--primary">
            Перейти до каталогу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="card artisan-form"
      style={{
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
      aria-label="Форма реєстрації майстерні"
    >
      <div>
        <h2
          style={{
            fontSize: "1.25rem",
            marginBottom: "0.25rem",
            color: "var(--color-ink)",
          }}
        >
          Анкета майстерні
        </h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "0.9rem" }}>
          Заповніть інформацію про ваше ремесло для проходження модерації та
          знайомства зі спільнотою.
        </p>
      </div>

      {/* Name */}
      <div className="form-group">
        <label
          htmlFor="artisan-name"
          style={{
            display: "block",
            fontWeight: "600",
            marginBottom: "0.35rem",
            fontSize: "0.9rem",
          }}
        >
          Ім&apos;я та прізвище майстра{" "}
          <span style={{ color: "var(--color-critical, #b3261e)" }}>*</span>
        </label>
        <input
          id="artisan-name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Олена Ковальчук"
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
          htmlFor="artisan-workshop"
          style={{
            display: "block",
            fontWeight: "600",
            marginBottom: "0.35rem",
            fontSize: "0.9rem",
          }}
        >
          Назва майстерні чи бренду{" "}
          <span style={{ color: "var(--color-critical, #b3261e)" }}>*</span>
        </label>
        <input
          id="artisan-workshop"
          type="text"
          value={formData.workshopName}
          onChange={(e) => handleChange("workshopName", e.target.value)}
          placeholder="Майстерня «Глина та Світло»"
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

      {/* Category */}
      <div className="form-group">
        <label
          htmlFor="artisan-category"
          style={{
            display: "block",
            fontWeight: "600",
            marginBottom: "0.35rem",
            fontSize: "0.9rem",
          }}
        >
          Основна категорія виробів{" "}
          <span style={{ color: "var(--color-critical, #b3261e)" }}>*</span>
        </label>
        <select
          id="artisan-category"
          value={formData.category}
          onChange={(e) =>
            handleChange("category", e.target.value as ArtisanCategory)
          }
          className="catalog-search-input"
          aria-invalid={Boolean(errors.category)}
          aria-describedby={errors.category ? "category-error" : undefined}
        >
          <option value="">-- Оберіть категорію --</option>
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.category && (
          <p
            id="category-error"
            style={{
              color: "var(--color-critical, #b3261e)",
              fontSize: "0.85rem",
              marginTop: "0.25rem",
            }}
          >
            {errors.category}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="form-group">
        <label
          htmlFor="artisan-desc"
          style={{
            display: "block",
            fontWeight: "600",
            marginBottom: "0.35rem",
            fontSize: "0.9rem",
          }}
        >
          Опис виробів, техніки та матеріалів{" "}
          <span style={{ color: "var(--color-critical, #b3261e)" }}>*</span>
        </label>
        <textarea
          id="artisan-desc"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Створюємо авторську гончарну кераміку з карпатської глини з використанням молочіння та натуральних ангобів..."
          rows={4}
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

      {/* Contacts Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Email */}
        <div className="form-group">
          <label
            htmlFor="artisan-email"
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "0.35rem",
              fontSize: "0.9rem",
            }}
          >
            Контактний Email{" "}
            <span style={{ color: "var(--color-critical, #b3261e)" }}>*</span>
          </label>
          <input
            id="artisan-email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="master@example.ua"
            className="catalog-search-input"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p
              id="email-error"
              style={{
                color: "var(--color-critical, #b3261e)",
                fontSize: "0.85rem",
                marginTop: "0.25rem",
              }}
            >
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="form-group">
          <label
            htmlFor="artisan-phone"
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "0.35rem",
              fontSize: "0.9rem",
            }}
          >
            Телефон{" "}
            <span style={{ color: "var(--color-critical, #b3261e)" }}>*</span>
          </label>
          <input
            id="artisan-phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+380 67 123 45 67"
            className="catalog-search-input"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && (
            <p
              id="phone-error"
              style={{
                color: "var(--color-critical, #b3261e)",
                fontSize: "0.85rem",
                marginTop: "0.25rem",
              }}
            >
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      {/* Portfolio URL */}
      <div className="form-group">
        <label
          htmlFor="artisan-portfolio"
          style={{
            display: "block",
            fontWeight: "600",
            marginBottom: "0.35rem",
            fontSize: "0.9rem",
          }}
        >
          Посилання на портфоліо чи соцмережі (необов&apos;язково)
        </label>
        <input
          id="artisan-portfolio"
          type="text"
          value={formData.portfolioUrl}
          onChange={(e) => handleChange("portfolioUrl", e.target.value)}
          placeholder="instagram.com/craft_workshop або власне портфоліо"
          className="catalog-search-input"
          aria-invalid={Boolean(errors.portfolioUrl)}
          aria-describedby={errors.portfolioUrl ? "portfolio-error" : undefined}
        />
        {errors.portfolioUrl && (
          <p
            id="portfolio-error"
            style={{
              color: "var(--color-critical, #b3261e)",
              fontSize: "0.85rem",
              marginTop: "0.25rem",
            }}
          >
            {errors.portfolioUrl}
          </p>
        )}
      </div>

      {/* Terms Checkbox */}
      <div className="form-group" style={{ marginTop: "0.5rem" }}>
        <label
          htmlFor="artisan-terms"
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
            id="artisan-terms"
            type="checkbox"
            checked={formData.acceptedTerms}
            onChange={(e) => handleChange("acceptedTerms", e.target.checked)}
            style={{ marginTop: "0.2rem" }}
            aria-invalid={Boolean(errors.acceptedTerms)}
            aria-describedby={errors.acceptedTerms ? "terms-error" : undefined}
          />
          <span>
            Я підтверджую, що всі вироби виготовляються в Україні з дотриманням
            принципів натуральності, чесного складу та авторського ремесла.{" "}
            <span style={{ color: "var(--color-critical, #b3261e)" }}>*</span>
          </span>
        </label>
        {errors.acceptedTerms && (
          <p
            id="terms-error"
            style={{
              color: "var(--color-critical, #b3261e)",
              fontSize: "0.85rem",
              marginTop: "0.25rem",
              marginLeft: "1.6rem",
            }}
          >
            {errors.acceptedTerms}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div style={{ marginTop: "0.75rem" }}>
        <button
          type="submit"
          className="button button--primary"
          style={{ width: "100%", padding: "0.85rem", fontSize: "1rem" }}
        >
          Подати заявку на модерацію
        </button>
      </div>
    </form>
  );
}
