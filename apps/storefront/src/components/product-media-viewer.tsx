"use client";

import { useState } from "react";
import { CardImage } from "./card-image";

type ProductMediaViewerProps = Readonly<{
  imageSrc?: string | undefined;
  productName: string;
  certificateImageSrc?: string | undefined;
  certificateTitle?: string | undefined;
}>;

export function ProductMediaViewer({
  imageSrc,
  productName,
  certificateImageSrc,
  certificateTitle,
}: ProductMediaViewerProps) {
  const [activeTab, setActiveTab] = useState<"photo" | "certificate">("photo");
  const hasCertificate = Boolean(certificateImageSrc);

  return (
    <div className="product-media-viewer">
      {hasCertificate && (
        <div
          role="tablist"
          aria-label="Вибір медіа виробу"
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "0.75rem",
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "photo"}
            onClick={() => setActiveTab("photo")}
            style={{
              padding: "0.4rem 0.85rem",
              borderRadius: "9999px",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
              border:
                activeTab === "photo"
                  ? "1px solid var(--color-primary)"
                  : "1px solid var(--color-border)",
              background:
                activeTab === "photo"
                  ? "var(--color-primary)"
                  : "var(--color-surface)",
              color: activeTab === "photo" ? "#ffffff" : "var(--color-ink)",
              transition: "all var(--duration-fast) ease",
            }}
          >
            📷 Фото виробу
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "certificate"}
            onClick={() => setActiveTab("certificate")}
            style={{
              padding: "0.4rem 0.85rem",
              borderRadius: "9999px",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
              border:
                activeTab === "certificate"
                  ? "1px solid var(--color-primary)"
                  : "1px solid var(--color-border)",
              background:
                activeTab === "certificate"
                  ? "var(--color-primary-quiet)"
                  : "var(--color-surface)",
              color:
                activeTab === "certificate"
                  ? "var(--color-primary-strong)"
                  : "var(--color-ink)",
              transition: "all var(--duration-fast) ease",
            }}
          >
            📜 Сертифікат відповідності (2-й екран)
          </button>
        </div>
      )}

      <div
        className="card__visual product-card__visual"
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "380px",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--color-sand-200)",
          border: "1px solid var(--color-border)",
        }}
      >
        {activeTab === "photo" || !hasCertificate ? (
          <>
            <CardImage
              src={imageSrc}
              alt={`Фото виробу «${productName}»`}
              loading="eager"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
            />
            <span className="card__visual-label">{productName}</span>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              minHeight: "380px",
              padding: "1rem",
              background: "#faf7f2",
            }}
          >
            <div
              style={{
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <span
                className="badge badge--certified"
                style={{
                  background: "var(--color-primary-quiet)",
                  color: "var(--color-primary-strong)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                }}
              >
                ✓ Підтверджений документ
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-ink-muted)",
                }}
              >
                Документ відповідності стандартам
              </span>
            </div>

            <div
              style={{
                flex: 1,
                position: "relative",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
                background: "#ffffff",
              }}
            >
              <img
                src={certificateImageSrc}
                alt={
                  certificateTitle ||
                  `Сертифікат відповідності для ${productName}`
                }
                style={{
                  maxWidth: "100%",
                  maxHeight: "320px",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--color-ink-subtle)",
                marginTop: "0.5rem",
                marginBottom: 0,
                textAlign: "center",
                lineHeight: 1.35,
              }}
            >
              {certificateTitle ||
                "Документ відповідності та безпечності виробу."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
