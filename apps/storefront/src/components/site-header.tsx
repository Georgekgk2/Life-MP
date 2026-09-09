"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSaved } from "@/context/saved-context";
import { useCart } from "@/context/cart-context";
import { SearchAutocompleteModal } from "./search-autocomplete-modal";

type NavigationItem = Readonly<{
  href: `/${string}`;
  label: string;
}>;

const primaryNavigation: readonly NavigationItem[] = [
  { href: "/catalog", label: "Каталог" },
  { href: "/people", label: "Майстри" },
  { href: "/stories", label: "Історії" },
  { href: "/events", label: "Події" },
  { href: "/charity", label: "Підтримка" },
];

export function SiteHeader() {
  const { count, isHydrated: isSavedHydrated } = useSaved();
  const { totalItems, isHydrated: isCartHydrated, toggleCart } = useCart();
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileNotice, setShowProfileNotice] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const savedCount = mounted && isSavedHydrated ? count : 0;
  const cartCount = mounted && isCartHydrated ? totalItems : 0;
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Перейти до вмісту
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link
            aria-label="Life-MP — на головну"
            className="site-brand"
            href="/"
            onClick={closeMenu}
          >
            <span aria-hidden="true" className="site-brand__mark">
              Л
            </span>
            <span>Life-MP</span>
            <span className="site-brand__descriptor">демо</span>
          </Link>

          <nav
            id="primary-navigation"
            aria-label="Основна навігація"
            className={`site-navigation${isMenuOpen ? " site-navigation--open" : ""}`}
          >
            <ul className="site-navigation__list">
              {primaryNavigation.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    className="site-navigation__link"
                    href={href}
                    onClick={closeMenu}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="site-navigation__mobile-actions">
              <Link
                className="button button--secondary"
                href="/profile"
                prefetch={false}
                onClick={closeMenu}
              >
                Особистий кабінет
              </Link>
              <Link
                className="button button--primary"
                href="/join-as-artisan"
                onClick={closeMenu}
              >
                Стати майстром
              </Link>
            </div>
          </nav>

          <div className="site-header__actions">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="site-header__action site-header__search-btn"
              aria-label="Швидкий пошук (Cmd+K)"
            >
              <span aria-hidden="true">⌕</span>
              <span className="site-header__action-label">Пошук</span>
            </button>
            <Link
              href="/saved"
              className="site-header__action site-header__saved-link"
              aria-label={
                savedCount > 0
                  ? `Збережені товари: ${savedCount}`
                  : "Збережені товари"
              }
            >
              <span aria-hidden="true">♡</span>
              <span className="site-header__action-label">Збережене</span>
              {savedCount > 0 && (
                <span className="site-header__saved-badge" aria-hidden="true">
                  {savedCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={toggleCart}
              className="site-header__action site-header__cart-btn"
              aria-label={cartCount > 0 ? `Кошик: ${cartCount}` : "Кошик"}
            >
              <span aria-hidden="true">🧺</span>
              <span className="site-header__action-label">Кошик</span>
              {cartCount > 0 && (
                <span className="site-header__saved-badge" aria-hidden="true">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className="site-header__action site-header__profile-link"
              aria-label="Особистий кабінет покупця (у розробці)"
              onClick={() => setShowProfileNotice((prev) => !prev)}
            >
              <span aria-hidden="true">◯</span>
              <span className="site-header__action-label">Профіль</span>
            </button>
            <Link
              href="/join-as-artisan"
              className="button button--primary button--sm site-header__artisan-btn"
            >
              Стати майстром
            </Link>
            <button
              type="button"
              className="site-header__menu-toggle"
              aria-expanded={isMenuOpen}
              aria-controls="primary-navigation"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              <span className="site-header__menu-icon" aria-hidden="true">
                {isMenuOpen ? "×" : "☰"}
              </span>
              <span className="site-header__menu-label">Меню</span>
            </button>
          </div>
        </div>
      </header>

      {showProfileNotice && (
        <aside
          className="notice notice--warning"
          role="status"
          style={{
            margin: "0.5rem auto",
            maxWidth: "var(--page-max-width)",
            position: "relative",
          }}
        >
          <h2 className="notice__title">Особистий кабінет у розробці</h2>
          <p>
            У демонстраційній версії Life-MP функціонал особистого кабінету,
            авторизація та збереження даних покупця вимкнені.
          </p>
          <button
            type="button"
            onClick={() => setShowProfileNotice(false)}
            aria-label="Закрити повідомлення"
            style={{
              position: "absolute",
              right: "1rem",
              top: "0.5rem",
              background: "none",
              border: "none",
              fontSize: "1.25rem",
              cursor: "pointer",
              color: "inherit",
            }}
          >
            ✕
          </button>
        </aside>
      )}
      <SearchAutocompleteModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
