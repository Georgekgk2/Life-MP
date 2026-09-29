"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { StorefrontCatalogProduct } from "@life/types";
import { formatHryvnia } from "@/formatters";

type VideoPlayerModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  videoTitle: string;
  videoDuration?: string | undefined;
  organizationName: string;
  videoEmbedUrl?: string | undefined;
  relatedProducts?: readonly StorefrontCatalogProduct[] | undefined;
}>;

export function VideoPlayerModal({
  isOpen,
  onClose,
  videoTitle,
  videoDuration,
  organizationName,
  videoEmbedUrl,
  relatedProducts = [],
}: VideoPlayerModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Store active element on open to restore focus on close
  useEffect(() => {
    if (isOpen) {
      openerRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      if (openerRef.current && typeof openerRef.current.focus === "function") {
        openerRef.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="video-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(18, 30, 24, 0.75)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: "1rem",
        animation: "cart-fade-in 200ms ease-out",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-dialog-title"
        style={{
          width: "100%",
          maxWidth: "52rem",
          backgroundColor: "var(--color-surface, #ffffff)",
          borderRadius: "var(--radius-lg, 1rem)",
          boxShadow: "0 1.5rem 3rem rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          animation: "cart-slide-in 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--color-border)",
            backgroundColor: "var(--color-surface-muted)",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
                marginBottom: "0.25rem",
              }}
            >
              <span
                className="badge badge--demo"
                style={{ fontSize: "0.75rem" }}
              >
                {organizationName}
              </span>
              {videoDuration && (
                <span
                  className="badge badge--demo"
                  style={{ fontSize: "0.75rem" }}
                >
                  ▶ {videoDuration}
                </span>
              )}
            </div>
            <h2
              id="video-dialog-title"
              style={{
                fontSize: "1.125rem",
                fontWeight: "var(--weight-bold, 700)",
                color: "var(--color-ink)",
                margin: 0,
              }}
            >
              {videoTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити відеоплеєр"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              lineHeight: 1,
              cursor: "pointer",
              padding: "0.5rem",
              color: "var(--color-ink-muted)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            ✕
          </button>
        </div>

        {/* Video Player Screen */}
        <div
          style={{
            position: "relative",
            width: "100%",
            backgroundColor: "#0d1813",
            aspectRatio: "16 / 9",
            maxHeight: "420px",
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
          }}
        >
          {videoEmbedUrl ? (
            <iframe
              src={videoEmbedUrl}
              title={videoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "#ffffff",
                padding: "2rem",
                maxWidth: "36rem",
              }}
            >
              <div
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  width: "4.5rem",
                  height: "4.5rem",
                  borderRadius: "50%",
                  backgroundColor: isPlaying
                    ? "var(--color-primary, #2d4a3e)"
                    : "rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  fontSize: "1.75rem",
                  marginBottom: "1rem",
                  cursor: "pointer",
                  transition: "transform 180ms ease",
                }}
                onClick={() => setIsPlaying(!isPlaying)}
                role="button"
                tabIndex={0}
                aria-label={isPlaying ? "Пауза" : "Відтворити"}
              >
                {isPlaying ? "⏸" : "▶"}
              </div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  color: "#ffffff",
                }}
              >
                {videoTitle}
              </h3>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "rgba(255, 255, 255, 0.8)",
                  lineHeight: 1.5,
                  margin: "0 auto 1rem auto",
                }}
              >
                Відеозапис внутрішнього майстер-класу закріплено за організацією{" "}
                <strong>«{organizationName}»</strong>.
              </p>
              <span
                className="badge"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                {isPlaying
                  ? "● Демо-потік активний · 1080p HD"
                  : "Пауза демонстраційного запису"}
              </span>
            </div>
          )}
        </div>

        {/* Linked Merch & Catalog Section */}
        {relatedProducts.length > 0 && (
          <div
            style={{
              padding: "1rem 1.25rem",
              backgroundColor: "var(--color-surface)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <h4
              style={{
                fontSize: "0.8125rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--color-ink-muted)",
                margin: "0 0 0.75rem 0",
              }}
            >
              Вироби та мерч організації у каталозі ({relatedProducts.length}):
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
                gap: "0.75rem",
              }}
            >
              {relatedProducts.map((product) => (
                <div
                  key={product.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--color-surface-muted)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <div style={{ minWidth: 0, paddingRight: "0.5rem" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {product.name}
                    </p>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-primary-strong)",
                        fontWeight: 700,
                      }}
                    >
                      {formatHryvnia(product.priceUah)}
                    </span>
                  </div>
                  <Link
                    href={`/catalog/${product.categorySlug}/${product.slug}`}
                    className="button button--secondary button--sm"
                    onClick={onClose}
                    style={{ flexShrink: 0, fontSize: "0.75rem" }}
                  >
                    Переглянути
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Disclaimer */}
        <div
          style={{
            padding: "0.75rem 1.25rem",
            backgroundColor: "var(--color-surface-muted)",
            borderTop: "1px solid var(--color-border-subtle)",
            fontSize: "0.6875rem",
            color: "var(--color-ink-subtle)",
            textAlign: "center",
          }}
        >
          Інформаційне повідомлення: відеоматеріали надано в демонстраційному
          режимі та призначені для ознайомлення з діяльністю спільноти.
        </div>
      </div>
    </div>
  );
}
