"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import {
  artisanDemoDraftSchema,
  artisanDemoListings,
  artisanDemoProfile,
  artisanDemoStatusLabels,
  isArtisanDemoCategorySlug,
  type ArtisanDemoCategorySlug,
  type ArtisanDemoListing,
  type ArtisanDemoListingStatus,
} from "@/demo/artisan-workspace";
import { vendorCategoryOptions } from "@/schema/vendor-product";

type ArtisanDemoFilter = "all" | ArtisanDemoListingStatus;
type ArtisanDemoFormState = {
  name: string;
  categorySlug: ArtisanDemoCategorySlug | "";
  description: string;
  priceUah: string;
};
type ArtisanDemoFormErrors = Partial<
  Record<keyof ArtisanDemoFormState, string>
>;
type ArtisanDemoEditor =
  { kind: "create" } | { kind: "edit"; listingId: string } | null;

const EMPTY_FORM: ArtisanDemoFormState = {
  name: "",
  categorySlug: "",
  description: "",
  priceUah: "",
};

const FILTERS: { value: ArtisanDemoFilter; label: string }[] = [
  { value: "all", label: "Усі вироби" },
  { value: "draft", label: "Чернетки" },
  { value: "in_review", label: "На перевірці" },
  { value: "changes_requested", label: "Потрібні зміни" },
];

const STATUS_CLASS_NAMES: Record<ArtisanDemoListingStatus, string> = {
  draft: "draft",
  in_review: "review",
  changes_requested: "changes",
};
function formatPriceUah(priceUah: number): string {
  const groupedPrice = String(priceUah).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    "\u00a0",
  );
  return `${groupedPrice}\u00a0₴`;
}

function getCategoryLabel(categorySlug: ArtisanDemoCategorySlug): string {
  return (
    vendorCategoryOptions.find((option) => option.value === categorySlug)
      ?.label ?? "Категорію не вказано"
  );
}

function canEditListing(status: ArtisanDemoListingStatus): boolean {
  return status !== "in_review";
}

export function ArtisanDemoDashboard() {
  const [listings, setListings] = useState<ArtisanDemoListing[]>(() =>
    artisanDemoListings.map((listing) => ({ ...listing })),
  );
  const [filter, setFilter] = useState<ArtisanDemoFilter>("all");
  const [editor, setEditor] = useState<ArtisanDemoEditor>(null);
  const [form, setForm] = useState<ArtisanDemoFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<ArtisanDemoFormErrors>({});
  const [statusMessage, setStatusMessage] = useState("");
  const nextDraftId = useRef(1);
  const editorTriggerRef = useRef<HTMLButtonElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editor) {
      nameInputRef.current?.focus();
      return;
    }

    const trigger = editorTriggerRef.current;
    editorTriggerRef.current = null;
    trigger?.focus();
  }, [editor]);
  const visibleListings =
    filter === "all"
      ? listings
      : listings.filter((listing) => listing.status === filter);

  function updateField<Field extends keyof ArtisanDemoFormState>(
    field: Field,
    value: ArtisanDemoFormState[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function openCreateEditor(event: MouseEvent<HTMLButtonElement>) {
    editorTriggerRef.current = event.currentTarget;
    setEditor({ kind: "create" });
    setForm(EMPTY_FORM);
    setErrors({});
    setStatusMessage("");
  }

  function openEditEditor(
    listing: ArtisanDemoListing,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    if (!canEditListing(listing.status)) return;
    editorTriggerRef.current = event.currentTarget;

    setEditor({ kind: "edit", listingId: listing.id });
    setForm({
      name: listing.name,
      categorySlug: listing.categorySlug,
      description: listing.description,
      priceUah: String(listing.priceUah),
    });
    setErrors({});
    setStatusMessage("");
  }

  function closeEditor() {
    setEditor(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setStatusMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("");

    const parsed = artisanDemoDraftSchema.safeParse({
      name: form.name.trim(),
      categorySlug: form.categorySlug,
      description: form.description.trim(),
      priceUah: Number(form.priceUah),
    });

    if (!parsed.success) {
      const nextErrors: ArtisanDemoFormErrors = {};

      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "name") nextErrors.name ??= issue.message;
        if (field === "categorySlug") {
          nextErrors.categorySlug ??= issue.message;
        }
        if (field === "description") {
          nextErrors.description ??= issue.message;
        }
        if (field === "priceUah") nextErrors.priceUah ??= issue.message;
      }

      setErrors(nextErrors);
      return;
    }

    if (editor?.kind === "edit") {
      setListings((current) =>
        current.map((listing) =>
          listing.id === editor.listingId
            ? { ...listing, ...parsed.data, status: "draft" }
            : listing,
        ),
      );
      setStatusMessage(
        "Зміни збережено лише в цій вкладці. На перевірку нічого не надіслано.",
      );
    } else {
      const newListing: ArtisanDemoListing = {
        ...parsed.data,
        id: `demo-created-${nextDraftId.current}`,
        status: "draft",
      };
      nextDraftId.current += 1;
      setListings((current) => [newListing, ...current]);
      setStatusMessage(
        "Чернетку збережено лише в цій вкладці. На сервер нічого не надіслано.",
      );
    }

    setFilter("all");
    setEditor(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  return (
    <section className="page-section page-section--spacious">
      <div className="page-shell artisan-demo">
        <header className="artisan-demo__intro">
          <p className="artisan-demo__eyebrow">Демо-майстерня</p>
          <h1>Кабінет майстра</h1>
          <p className="artisan-demo__lead">
            Робочий простір для локальних чернеток і перегляду демонстраційних
            станів виробів.
          </p>
        </header>

        <aside
          className="artisan-demo__notice"
          aria-label="Про демонстраційні дані"
        >
          <p className="artisan-demo__notice-title">Демонстраційні дані</p>
          <p>
            Усі профілі, вироби та їхні стани синтетичні. Створення й
            редагування залишаються лише в цій вкладці та зникнуть після її
            перезавантаження. Зміни не надсилаються на сервер. Продажі,
            замовлення й виплати тут не відображаються.
          </p>
        </aside>

        <section
          className="artisan-demo__profile"
          aria-labelledby="artisan-demo-profile-title"
        >
          <div className="artisan-demo__profile-copy">
            <h2 id="artisan-demo-profile-title">{artisanDemoProfile.name}</h2>
            <p>{artisanDemoProfile.description}</p>
          </div>
          <span className="badge badge--demo">Синтетичний профіль</span>
        </section>

        {statusMessage ? (
          <p
            className="artisan-demo__status-message"
            role="status"
            aria-live="polite"
          >
            {statusMessage}
          </p>
        ) : null}

        <section
          className="artisan-demo__workspace"
          aria-labelledby="artisan-demo-listings-title"
        >
          <div className="artisan-demo__workspace-heading">
            <div>
              <p className="artisan-demo__eyebrow">Каталог майстерні</p>
              <h2 id="artisan-demo-listings-title">Вироби та чернетки</h2>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={openCreateEditor}
            >
              Створити чернетку
            </button>
          </div>

          <div
            className="artisan-demo__filters"
            role="group"
            aria-label="Фільтр виробів за статусом"
          >
            {FILTERS.map((option) => {
              const count =
                option.value === "all"
                  ? listings.length
                  : listings.filter(
                      (listing) => listing.status === option.value,
                    ).length;

              return (
                <button
                  key={option.value}
                  className="artisan-demo__filter"
                  type="button"
                  aria-pressed={filter === option.value}
                  onClick={() => setFilter(option.value)}
                >
                  <span>{option.label}</span>
                  <span className="artisan-demo__filter-count">{count}</span>
                </button>
              );
            })}
          </div>

          {visibleListings.length > 0 ? (
            <ul
              className="artisan-demo__list"
              aria-label="Демонстраційні вироби"
            >
              {visibleListings.map((listing) => (
                <li className="artisan-demo__list-item" key={listing.id}>
                  <article className="artisan-demo__listing">
                    <div className="artisan-demo__listing-content">
                      <div className="artisan-demo__listing-heading">
                        <h3>{listing.name}</h3>
                        <span
                          className={`artisan-demo__status artisan-demo__status--${STATUS_CLASS_NAMES[listing.status]}`}
                        >
                          {artisanDemoStatusLabels[listing.status]}
                        </span>
                      </div>
                      <p className="artisan-demo__category">
                        {getCategoryLabel(listing.categorySlug)}
                      </p>
                      <p className="artisan-demo__description">
                        {listing.description}
                      </p>
                      <p className="artisan-demo__price">
                        {formatPriceUah(listing.priceUah)}
                      </p>
                    </div>
                    <div className="artisan-demo__listing-action">
                      {canEditListing(listing.status) ? (
                        <button
                          className="button button--secondary button--sm"
                          type="button"
                          onClick={(event) => openEditEditor(listing, event)}
                          aria-label={`Редагувати: ${listing.name}`}
                        >
                          Редагувати
                        </button>
                      ) : (
                        <span className="artisan-demo__readonly">
                          Редагування недоступне в демо
                        </span>
                      )}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <p className="artisan-demo__empty">
              У цьому статусі поки немає виробів. Створіть нову чернетку, щоб
              побачити локальну зміну.
            </p>
          )}
        </section>

        {editor ? (
          <section
            className="artisan-demo__editor"
            aria-labelledby="artisan-demo-editor-title"
          >
            <div className="artisan-demo__editor-heading">
              <div>
                <p className="artisan-demo__eyebrow">Локальна чернетка</p>
                <h2 id="artisan-demo-editor-title">
                  {editor.kind === "edit"
                    ? "Редагувати чернетку"
                    : "Нова чернетка"}
                </h2>
              </div>
              <p>Ці дані не потраплять до каталогу чи на сервер.</p>
            </div>

            <form
              id="artisan-demo-form"
              className="artisan-demo__form"
              noValidate
              onSubmit={handleSubmit}
            >
              <div className="artisan-demo__fields">
                <div className="form-group">
                  <label htmlFor="artisan-demo-name">Назва виробу</label>
                  <input
                    id="artisan-demo-name"
                    ref={nameInputRef}
                    required
                    className="artisan-demo__field-control"
                    autoComplete="off"
                    maxLength={100}
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    aria-invalid={errors.name ? "true" : undefined}
                    aria-describedby={
                      errors.name ? "artisan-demo-name-error" : undefined
                    }
                  />
                  {errors.name ? (
                    <p
                      className="artisan-demo__field-error"
                      id="artisan-demo-name-error"
                    >
                      {errors.name}
                    </p>
                  ) : null}
                </div>

                <div className="form-group">
                  <label htmlFor="artisan-demo-category">Категорія</label>
                  <select
                    id="artisan-demo-category"
                    required
                    className="artisan-demo__field-control"
                    value={form.categorySlug}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "" || isArtisanDemoCategorySlug(value)) {
                        updateField("categorySlug", value);
                      }
                    }}
                    aria-invalid={errors.categorySlug ? "true" : undefined}
                    aria-describedby={
                      errors.categorySlug
                        ? "artisan-demo-category-error"
                        : undefined
                    }
                  >
                    <option value="">Оберіть категорію</option>
                    {vendorCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.categorySlug ? (
                    <p
                      className="artisan-demo__field-error"
                      id="artisan-demo-category-error"
                    >
                      {errors.categorySlug}
                    </p>
                  ) : null}
                </div>

                <div className="form-group artisan-demo__description-field">
                  <label htmlFor="artisan-demo-description">Опис виробу</label>
                  <textarea
                    id="artisan-demo-description"
                    required
                    className="artisan-demo__field-control artisan-demo__textarea"
                    maxLength={1000}
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    aria-invalid={errors.description ? "true" : undefined}
                    aria-describedby={
                      errors.description
                        ? "artisan-demo-description-error"
                        : undefined
                    }
                  />
                  {errors.description ? (
                    <p
                      className="artisan-demo__field-error"
                      id="artisan-demo-description-error"
                    >
                      {errors.description}
                    </p>
                  ) : null}
                </div>

                <div className="form-group artisan-demo__price-field">
                  <label htmlFor="artisan-demo-price">Ціна, гривні</label>
                  <input
                    id="artisan-demo-price"
                    required
                    className="artisan-demo__field-control"
                    type="number"
                    min={1}
                    max={100000}
                    step={1}
                    inputMode="numeric"
                    value={form.priceUah}
                    onChange={(event) =>
                      updateField("priceUah", event.target.value)
                    }
                    aria-invalid={errors.priceUah ? "true" : undefined}
                    aria-describedby={
                      errors.priceUah ? "artisan-demo-price-error" : undefined
                    }
                  />
                  {errors.priceUah ? (
                    <p
                      className="artisan-demo__field-error"
                      id="artisan-demo-price-error"
                    >
                      {errors.priceUah}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="artisan-demo__form-actions">
                <button className="button button--primary" type="submit">
                  Зберегти демо-чернетку
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={closeEditor}
                >
                  Скасувати
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </section>
  );
}
