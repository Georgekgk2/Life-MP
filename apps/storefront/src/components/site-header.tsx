import Link from "next/link";

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
        </div>
      </header>
    </>
  );
}
