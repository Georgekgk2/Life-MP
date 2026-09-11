import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AddToCartButton,
  CardImage,
  ProductCard,
  ProductReviewsSection,
  SaveButton,
  SectionHeading,
} from "@/components";
import { getProductReviews } from "@/reviews/server";
import { getCatalogSnapshot } from "@/catalog/server";
import { people, products as fixtureProducts } from "@/fixtures";
import { formatHryvnia } from "@/formatters";

export const dynamic = "force-dynamic";

type ProductDetailPageProps = Readonly<{
  params: Promise<{
    category: string;
    slug: string;
  }>;
}>;

export function generateStaticParams() {
  const source = process.env["CATALOG_SOURCE"] || "fixtures";
  if (source === "fixtures") {
    return fixtureProducts.map((product) => ({
      category: product.categorySlug,
      slug: product.slug,
    }));
  }
  return [];
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { category: categorySlug, slug: productSlug } = await params;
  const catalogResult = await getCatalogSnapshot();

  if (catalogResult.kind === "unavailable") {
    throw new Error(
      "CATALOG_UNAVAILABLE: Medusa catalog service is unreachable or not configured",
    );
  }

  const product = catalogResult.snapshot.products.find(
    (p) => p.slug === productSlug && p.categorySlug === categorySlug,
  );

  if (!product) {
    return {
      title: "Матеріал не знайдено",
      description: "Запитуваний матеріал каталогу відсутній.",
    };
  }

  return {
    title: `${product.name} — ${product.categorySlug}`,
    description: product.description,
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { category: categorySlug, slug: productSlug } = await params;
  const catalogResult = await getCatalogSnapshot();

  if (catalogResult.kind === "unavailable") {
    throw new Error(
      "CATALOG_UNAVAILABLE: Medusa catalog service is unreachable or not configured",
    );
  }

  const { snapshot } = catalogResult;
  const category = snapshot.categories.find((c) => c.slug === categorySlug);
  const product = snapshot.products.find(
    (p) => p.slug === productSlug && p.categorySlug === categorySlug,
  );

  if (!category || !product) {
    notFound();
  }

  const relatedProducts = snapshot.products
    .filter((p) => p.categorySlug === categorySlug && p.id !== product.id)
    .slice(0, 3);

  const artisan = people.find((p) => p.slug === product.provider?.handle);
  const artisanImageSrc =
    artisan && "imageSrc" in artisan && typeof artisan.imageSrc === "string"
      ? artisan.imageSrc
      : undefined;

  const reviewsResult = await getProductReviews(product.id);
  return (
    <>
      <article className="page-section page-section--spacious">
        <div className="page-shell">
          {/* Breadcrumbs */}
          <nav
            className="breadcrumbs"
            aria-label="Хлібні крихти"
            style={{ marginBottom: "1.5rem" }}
          >
            <ol
              style={{
                display: "flex",
                gap: "0.5rem",
                listStyle: "none",
                padding: 0,
                margin: 0,
                fontSize: "0.875rem",
              }}
            >
              <li>
                <Link
                  href="/"
                  style={{
                    color: "var(--color-ink-muted)",
                    textDecoration: "none",
                  }}
                >
                  Головна
                </Link>
              </li>
              <li style={{ color: "var(--color-sand-300)" }}>/</li>
              <li>
                <Link
                  href="/catalog"
                  style={{
                    color: "var(--color-ink-muted)",
                    textDecoration: "none",
                  }}
                >
                  Каталог
                </Link>
              </li>
              <li style={{ color: "var(--color-sand-300)" }}>/</li>
              <li>
                <Link
                  href={`/catalog/${category.slug}`}
                  style={{
                    color: "var(--color-ink-muted)",
                    textDecoration: "none",
                  }}
                >
                  {category.name}
                </Link>
              </li>
              <li style={{ color: "var(--color-sand-300)" }}>/</li>
              <li
                aria-current="page"
                style={{
                  color: "var(--color-pine-900)",
                  fontWeight: "600",
                }}
              >
                {product.name}
              </li>
            </ol>
          </nav>

          <div className="product-detail-layout">
            {/* Visual preview */}
            <div className="product-detail-media">
              <div
                className="card__visual product-card__visual"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  height: "380px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-sand-200)",
                }}
              >
                <CardImage
                  src={product.imageSrc}
                  alt={`Фото виробу «${product.name}»`}
                  loading="eager"
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                />
                <span className="card__visual-label">{product.name}</span>
              </div>
            </div>

            {/* Information panel */}
            <div className="product-detail-info">
              <p className="card__eyebrow">{category.name}</p>
              <h1
                className="page-heading__title"
                style={{ margin: "0.5rem 0" }}
              >
                {product.name}
              </h1>

              {/* Badges & Trust Signals */}
              <div
                className="badge-group"
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginBottom: "1rem",
                }}
              >
                <span className="badge badge--demo">
                  {product.isSynthetic
                    ? "Синтетичні локальні дані"
                    : "Лише перегляд у демо"}
                </span>
                {product.verifiedVendorBadge && (
                  <span
                    className="badge badge--status"
                    style={{
                      background: "var(--color-surface-strong)",
                      color: "var(--color-primary-strong)",
                      fontWeight: 600,
                    }}
                  >
                    ✓ {product.verifiedVendorBadge}
                  </span>
                )}
                {product.organicProductBadge && (
                  <span
                    className="badge badge--organic"
                    style={{ background: "#fef7e0", color: "#b06000" }}
                  >
                    🌿 {product.organicProductBadge}
                  </span>
                )}
              </div>

              {/* Pricing & Cart Action */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <data
                  value={product.priceUah}
                  style={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: "var(--color-pine-900)",
                  }}
                >
                  {formatHryvnia(product.priceUah)}
                </data>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <AddToCartButton product={product} size="md" />
                  <SaveButton product={product} size="md" />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: "2rem", lineHeight: "1.6" }}>
                <h2
                  style={{
                    fontSize: "1.25rem",
                    marginBottom: "0.5rem",
                    color: "var(--color-pine-900)",
                  }}
                >
                  Опис виробу
                </h2>
                <p>{product.description}</p>
              </div>

              {/* Data specifications */}
              <dl className="data-list" style={{ marginBottom: "1.5rem" }}>
                <div className="data-list__item">
                  <dt className="data-list__label">Категорія</dt>
                  <dd className="data-list__value">{category.name}</dd>
                </div>
                {product.provider && (
                  <div className="data-list__item">
                    <dt className="data-list__label">Майстерня</dt>
                    <dd className="data-list__value">
                      <Link
                        href={`/people/${product.provider.handle}`}
                        className="text-link"
                      >
                        {product.provider.name}
                        {product.provider.region
                          ? ` (${product.provider.region})`
                          : ""}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>

              {/* Artisan Showcase Card */}
              {product.provider && (
                <section
                  className="product-artisan-card"
                  aria-label="Інформація про майстерню"
                >
                  <div className="product-artisan-card__header">
                    {artisanImageSrc ? (
                      <div className="product-artisan-card__avatar product-artisan-card__avatar--image">
                        <img
                          src={artisanImageSrc}
                          alt={`Портрет: ${product.provider.name}`}
                        />
                      </div>
                    ) : (
                      <div
                        className="product-artisan-card__avatar product-artisan-card__avatar--monogram"
                        aria-label={`Монограма майстра ${product.provider.name}`}
                      >
                        {product.provider.name.charAt(0)}
                      </div>
                    )}
                    <div className="product-artisan-card__meta">
                      <span className="product-artisan-card__badge">
                        {product.verifiedVendorBadge || "Демо-майстерня"}
                      </span>
                      <h3 className="product-artisan-card__name">
                        {product.provider.name}
                      </h3>
                      {product.provider.region && (
                        <p className="product-artisan-card__region">
                          📍 {product.provider.region}
                        </p>
                      )}
                    </div>
                  </div>
                  {artisan && (
                    <p className="product-artisan-card__bio">
                      {artisan.description}
                    </p>
                  )}
                  <div>
                    <Link
                      href={`/people/${product.provider.handle}`}
                      className="button button--secondary"
                      style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
                    >
                      Переглянути всі вироби майстерні →
                    </Link>
                  </div>
                </section>
              )}
              {/* Non-commercial sandbox boundary notice */}
              <aside
                className="notice"
                aria-label="Статус комерційних функцій"
                style={{
                  padding: "1rem",
                  backgroundColor: "#fff8e1",
                  border: "1px solid #f1d48a",
                  borderRadius: "var(--radius-sm)",
                  color: "#6b4f00",
                }}
              >
                <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.95rem" }}>
                  🧪 Некомерційний sandbox
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.4 }}>
                  Ця сторінка показує демонстраційні дані. Оплата, резерв
                  коштів, доставка, ТТН та виплата майстерні не активні.
                </p>
              </aside>
            </div>
          </div>

          {/* Product Reviews Section */}
          <ProductReviewsSection
            productSlug={product.slug}
            productName={product.name}
            reviews={reviewsResult}
          />
        </div>
      </article>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="page-section--tint" aria-label="Схожі вироби">
          <div className="page-shell">
            <SectionHeading
              eyebrow="Схожі матеріали"
              title={`Інші вироби з напряму «${category.name}»`}
              description="Перегляньте додаткові матеріали цієї ж категорії."
            />
            <div className="content-grid content-grid--cards">
              {relatedProducts.map((relProduct) => (
                <ProductCard key={relProduct.id} product={relProduct} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
