"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSaved } from "@/context/saved-context";

type NavigationItem = Readonly<{
  href: `/${string}`;
  label: string;
}>;

const primaryNavigation: readonly NavigationItem[] = [
  { href: "/catalog", label: "Каталог" },
  { href: "/people", label: "Люди" },
  { href: "/stories", label: "Історії" },
  { href: "/events", label: "Події" },
  { href: "/charity", label: "Підтримка" },
];

export function SiteHeader() {
  const { count, isHydrated } = useSaved();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const savedCount = mounted && isHydrated ? count : 0;

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
          >
            <span aria-hidden="true" className="site-brand__mark">
              Л
            </span>
            <span>Life-MP</span>
            <span className="site-brand__descriptor">демо</span>
          </Link>
          <nav aria-label="Основна навігація" className="site-navigation">
            <ul className="site-navigation__list">
              {primaryNavigation.map(({ href, label }) => (
                <li key={href}>
                  <Link className="site-navigation__link" href={href}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="site-header__actions">
            <Link
              href="/saved"
              className="site-header__saved-link"
              aria-label={
                savedCount > 0
                  ? `Збережені товари: ${savedCount}`
                  : "Збережені товари"
              }
            >
              <span aria-hidden="true">❤️</span>
              <span className="site-header__saved-text">Збережене</span>
              {savedCount > 0 && (
                <span className="site-header__saved-badge" aria-hidden="true">
                  {savedCount}
                </span>
              )}
            </Link>
            <Link
              href="/join-as-artisan"
              className="button button--secondary button--sm site-header__artisan-btn"
            >
              Стати майстром
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
