import type { Metadata } from "next";
import Link from "next/link";
import { CustomerProfileView, SectionHeading } from "@/components";

export const metadata: Metadata = {
  title: "Особистий кабінет",
  description:
    "Персональний простір покупця на маркетплейсі Life-MP: збережені вироби, підписки на майстерні та сповіщення.",
};

export default function ProfilePage() {
  return (
    <div className="page-shell page-section page-section--spacious">
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
            <Link href="/" style={{ color: "var(--color-primary)" }}>
              Головна
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" style={{ color: "var(--color-ink-muted)" }}>
            Особистий кабінет
          </li>
        </ol>
      </nav>

      <SectionHeading
        level="h1"
        eyebrow="Персональний простір"
        title="Особистий кабінет покупця"
        description="Керуйте збереженими виробами, підписками на улюблені українські майстерні та налаштуваннями сповіщень про нові ярмарки й воркшопи."
      />

      <CustomerProfileView />
    </div>
  );
}
