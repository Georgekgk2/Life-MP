import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AddToCartButton,
  ProductCard,
  ProductReviewsSection,
  SaveButton,
  SectionHeading,
} from "@/components";
import { getCatalogSnapshot } from "@/catalog/server";
import { products as fixtureProducts } from "@/fixtures";

export const dynamic = "force-dynamic";

type ProductDetailPageProps = Readonly<{
  params: Promise<{
    category: string;
    slug: string;
  }>;
}>;

const hryvniaFormatter = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
});

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
    return {
      title: "Каталог недоступний",
      description: "Сервіс каталогу тимчасово недоступний.",
    };
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
    return (
      <div className="page-shell page-section">
        <SectionHeading
          eyebrow="Помилка каталогу"
          title="Каталог тимчасово недоступний"
          description="Сервіс каталогу тимчасово недоступний. Будь ласка, спробуйте пізніше."
        />
        <div style={{ marginTop: "2rem" }}>
          <Link href="/catalog" className="button button-primary">
            Повернутися до каталогу
          </Link>
        </div>
      </div>
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
                <img
                  src={`/images/products/${product.slug}.webp`}
                  alt={product.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
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
                  {hryvniaFormatter.format(product.priceUah)}
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
              <dl className="data-list" style={{ marginBottom: "2rem" }}>
                <div className="data-list__item">
                  <dt className="data-list__label">Категорія</dt>
                  <dd className="data-list__value">{category.name}</dd>
                </div>
                {product.provider && (
                  <div className="data-list__item">
                    <dt className="data-list__label">Майстерня</dt>
                    <dd className="data-list__value">
                      {product.provider.name}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Escrow Guarantee Notice */}
              <aside
                className="notice"
                aria-label="Гарантія безпеки"
                style={{
                  padding: "1rem",
                  backgroundColor: "#e6f4ea",
                  border: "1px solid #ceead6",
                  borderRadius: "var(--radius-sm)",
                  color: "#137333",
                }}
              >
                <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.95rem" }}>
                  🛡️ Захист покупки через Escrow
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.4 }}>
                  Кошти зарезервовано. Майстер отримує виплату на IBAN тільки
                  після того, як ви отримаєте та оглянете посилку у відділенні
                  Нової Пошти.
                </p>
              </aside>
            </div>
          </div>

          {/* Product Reviews Section */}
          <ProductReviewsSection
            productSlug={product.slug}
            productName={product.name}
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
