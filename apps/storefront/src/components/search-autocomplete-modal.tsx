"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { UnifiedSearchSuggestion } from "@life/types";
import { getSearchProvider } from "../search";
import { products as fixtureProducts } from "../fixtures";

export function SearchAutocompleteModal({
  isOpen,
  onClose,
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
}>) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    readonly UnifiedSearchSuggestion[]
  >([]);
  const [, startTransition] = useTransition();

  const searchProvider = getSearchProvider(fixtureProducts as never);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSuggestions([]);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    startTransition(async () => {
      if (!val.trim()) {
        setSuggestions([]);
        return;
      }
      const result = await searchProvider.searchUnified(val, 8);
      setSuggestions(result.suggestions);
    });
  };

  if (!isOpen) {
    return null;
  }

  const productSuggestions = suggestions.filter((s) => s.type === "product");
  const workshopSuggestions = suggestions.filter((s) => s.type === "workshop");
  const eventSuggestions = suggestions.filter((s) => s.type === "event");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-search-title"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 200,
        padding: "10vh 1rem 2rem 1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "40rem",
          width: "100%",
          padding: "1.5rem",
          boxShadow: "var(--shadow-card-raised)",
          position: "relative",
          zIndex: 201,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2
            id="quick-search-title"
            style={{
              fontSize: "1.15rem",
              margin: 0,
              color: "var(--color-ink)",
            }}
          >
            Швидкий пошук маркетплейсу
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.25rem",
              cursor: "pointer",
              color: "var(--color-ink-muted)",
            }}
            aria-label="Закрити пошук"
          >
            ✕
          </button>
        </div>

        <div
          className="catalog-search-input-box"
          style={{ marginBottom: "1.25rem" }}
        >
          <span aria-hidden="true" className="catalog-search-icon">
            🔍
          </span>
          <input
            autoFocus
            type="text"
            className="catalog-search-input"
            placeholder="Введіть назву виробу, майстерні чи події (наприклад, чашка, льон, воркшоп)..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            aria-label="Поле швидкого пошуку"
          />
          {query && (
            <button
              type="button"
              className="catalog-search-clear"
              onClick={() => handleQueryChange("")}
              aria-label="Очистити поле"
            >
              ✕
            </button>
          )}
        </div>

        {query.trim() && suggestions.length === 0 && (
          <div
            style={{
              padding: "1.5rem",
              textAlign: "center",
              color: "var(--color-ink-muted)",
            }}
          >
            <p style={{ margin: 0 }}>
              За запитом «{query}» нічого не знайдено.
            </p>
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
              Спробуйте використати синоніми: наприклад, «кераміка», «ткацтво»
              чи «дерево».
            </p>
          </div>
        )}

        {suggestions.length > 0 && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            {/* Products Group */}
            {productSuggestions.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    color: "var(--color-ink-muted)",
                    margin: "0 0 0.5rem 0",
                  }}
                >
                  🛍️ Вироби ({productSuggestions.length})
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  {productSuggestions.map((item) => (
                    <Link
                      key={item.id}
                      href={item.url}
                      onClick={onClose}
                      className="search-suggestion-item"
                      style={{
                        padding: "0.6rem 0.85rem",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--color-surface-muted)",
                        textDecoration: "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <strong
                        style={{
                          color: "var(--color-ink)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {item.title}
                      </strong>
                      {item.subtitle && (
                        <span
                          style={{
                            color: "var(--color-ink-muted)",
                            fontSize: "0.8rem",
                          }}
                        >
                          {item.subtitle}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Workshops Group */}
            {workshopSuggestions.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    color: "var(--color-ink-muted)",
                    margin: "0 0 0.5rem 0",
                  }}
                >
                  👥 Майстерні та автори ({workshopSuggestions.length})
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  {workshopSuggestions.map((item) => (
                    <Link
                      key={item.id}
                      href={item.url}
                      onClick={onClose}
                      className="search-suggestion-item"
                      style={{
                        padding: "0.6rem 0.85rem",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--color-surface-muted)",
                        textDecoration: "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <strong
                        style={{
                          color: "var(--color-ink)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {item.title}
                      </strong>
                      {item.subtitle && (
                        <span
                          style={{
                            color: "var(--color-ink-muted)",
                            fontSize: "0.8rem",
                          }}
                        >
                          {item.subtitle}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Events Group */}
            {eventSuggestions.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    color: "var(--color-ink-muted)",
                    margin: "0 0 0.5rem 0",
                  }}
                >
                  📅 Події та ярмарки ({eventSuggestions.length})
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  {eventSuggestions.map((item) => (
                    <Link
                      key={item.id}
                      href={item.url}
                      onClick={onClose}
                      className="search-suggestion-item"
                      style={{
                        padding: "0.6rem 0.85rem",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--color-surface-muted)",
                        textDecoration: "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <strong
                        style={{
                          color: "var(--color-ink)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {item.title}
                      </strong>
                      {item.subtitle && (
                        <span
                          style={{
                            color: "var(--color-ink-muted)",
                            fontSize: "0.8rem",
                          }}
                        >
                          {item.subtitle}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
