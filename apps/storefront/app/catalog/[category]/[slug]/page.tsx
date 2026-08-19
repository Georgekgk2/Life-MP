import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard, SaveButton, SectionHeading } from "@/components";
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
      title: "Виріб | Life-MP",
    };
  }

  const product = catalogResult.snapshot.products.find(
    (p) => p.slug === productSlug && p.categorySlug === categorySlug,
  );

  if (!product) {
    return {
      title: "Виріб не знайдено | Life-MP",
    };
  }

  return {
    title: `${product.name} — каталог виробів`,
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
      <section className="page-section page-section--spacious">
        <div className="page-shell">
          <aside className="notice notice--warning">
            <h2 className="notice__title">Каталог тимчасово недоступний</h2>
            <p>
              Не вдалося завантажити актуальні дані каталогу з сервісу Medusa.
              Будь ласка, перевірте з'єднання або спробуйте пізніше.
            </p>
          </aside>
        </div>
      </section>
    );
  }

  const { categories, products } = catalogResult.snapshot;
  const category = categories.find((c) => c.slug === categorySlug);
  const product = products.find(
    (p) => p.slug === productSlug && p.categorySlug === categorySlug,
  );

  if (!product || !category) {
    notFound();
  }

  const relatedProducts = products
    .filter((p) => p.categorySlug === category.slug && p.id !== product.id)
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
                fontSize: "0.875rem",
              }}
            >
              <li>
                <Link href="/catalog" style={{ color: "var(--color-primary)" }}>
                  Каталог
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/catalog/${category.slug}`}
                  style={{ color: "var(--color-primary)" }}
                >
                  {category.name}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li
                aria-current="page"
                style={{ color: "var(--color-ink-muted)" }}
              >
                {product.name}
              </li>
            </ol>
          </nav>

          <div className="product-detail-layout">
            {/* Visual Box */}
            <div className="product-detail-visual-box">
              <div aria-hidden="true" className="product-detail-visual">
                <span>{product.name}</span>
              </div>
            </div>

            {/* Product Meta & Info */}
            <div className="product-detail-info">
              <p className="page-intro__eyebrow">
                {product.provider?.name
                  ? `Виробник: ${product.provider.name}`
                  : "Майстерня Life-MP"}
              </p>
              <h1
                style={{
                  fontSize: "2rem",
                  marginBottom: "0.75rem",
                  color: "var(--color-ink)",
                }}
              >
                {product.name}
              </h1>

              <div
                className="product-detail-price-box"
                style={{ marginBottom: "1.25rem" }}
              >
                <span
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: "700",
                    color: "var(--color-primary-strong)",
                  }}
                >
                  {hryvniaFormatter.format(product.priceUah)}
                </span>
              </div>

              {/* Badges */}
              <div
                className="badge-group"
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginBottom: "1.5rem",
                }}
              >
                <span className="badge badge--demo">
                  {product.isSynthetic
                    ? "Синтетичні локальні дані"
                    : "Лише перегляд у демо"}
                </span>
                {product.verifiedVendorBadge && (
                  <span
                    className="badge badge--verified"
                    style={{ background: "#e6f4ea", color: "#137333" }}
                  >
                    ✓ {product.verifiedVendorBadge}
                  </span>
                )}
                {product.certifiedProductBadge && (
                  <span
                    className="badge badge--certified"
                    style={{ background: "#e8f0fe", color: "#1a73e8" }}
                  >
                    ★ {product.certifiedProductBadge}
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

              {/* Product Actions */}
              <div
                className="product-detail-actions"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <SaveButton product={product} size="lg" showLabel={true} />
              </div>

              <div
                className="product-detail-description"
                style={{ marginBottom: "2rem", lineHeight: "1.6" }}
              >
                <h2
                  style={{
                    fontSize: "1.125rem",
                    marginBottom: "0.5rem",
                    color: "var(--color-ink)",
                  }}
                >
                  Опис виробу
                </h2>
                <p style={{ color: "var(--color-ink-subtle)" }}>
                  {product.description}
                </p>
              </div>

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

              {/* Status Notice */}
              <aside className="notice" aria-label="Статус замовлення">
                <h3 className="notice__title">Демонстраційний перегляд</h3>
                <p>
                  Оформлення замовлень, кошик, онлайн-оплата та доставка
                  перебувають на етапі погодження бізнес-рішень. Виріб
                  представлено для ознайомлення з асортиментом та структурою
                  каталогу.
                </p>
              </aside>
            </div>
          </div>
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
