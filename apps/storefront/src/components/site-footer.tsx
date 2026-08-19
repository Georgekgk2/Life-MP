import Link from "next/link";

type NavigationItem = Readonly<{
  href: `/${string}`;
  label: string;
}>;

const footerNavigation: readonly NavigationItem[] = [
  { href: "/catalog", label: "Каталог" },
  { href: "/people", label: "Люди" },
  { href: "/stories", label: "Історії" },
  { href: "/events", label: "Події" },
  { href: "/charity", label: "Підтримка" },
  { href: "/partners", label: "Партнери" },
  { href: "/moderation", label: "Модерація" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
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
          <p className="site-footer__description">
            Некомерційний прототип із локальними демонстраційними даними про
            людей, вироби та спільноту.
          </p>
        </div>
        <nav
          aria-label="Навігація у підвалі"
          className="site-footer__navigation"
        >
          <p className="site-footer__heading">Розділи</p>
          <ul className="site-footer__list">
            {footerNavigation.map(({ href, label }) => (
              <li key={href}>
                <Link className="site-footer__link" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="site-footer__legal">
          Це демонстрація: купівля, оплата, доставка, реєстрація та збір даних
          недоступні.
        </p>
      </div>
    </footer>
  );
}
