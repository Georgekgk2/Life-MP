"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function CatalogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log service unavailability error for monitoring/diagnostics
    console.error("[CatalogError]", error.message || error);
  }, [error]);

  return (
    <section className="page-section page-section--spacious">
      <div className="page-shell">
        <aside className="notice notice--warning" aria-label="Помилка каталогу">
          <h2 className="notice__title">Каталог тимчасово недоступний</h2>
          <p>
            Не вдалося завантажити актуальні дані каталогу з сервісу Medusa.
            Будь ласка, перевірте з&apos;єднання або спробуйте пізніше.
          </p>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
            <button
              type="button"
              onClick={() => reset()}
              className="button button-primary"
            >
              Спробувати знову
            </button>
            <Link href="/" className="button button-secondary">
              На головну
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
