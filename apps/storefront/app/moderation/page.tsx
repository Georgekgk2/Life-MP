import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ModerationDashboard, SectionHeading } from "@/components";

export const metadata: Metadata = {
  title: "Кабінет модератора",
  description:
    "Панель модерації та верифікації заявок майстерень до каталогу маркетплейсу Life-MP.",
};

export default async function ModerationPage() {
  const cookieStore = await cookies();
  const authSession = cookieStore.get("life_mp_auth_session")?.value;
  if (!authSession) {
    notFound();
  }

  return (
    <div className="page-shell page-section page-section--spacious">
      <SectionHeading
        level="h1"
        eyebrow="Внутрішній контроль та комплаєнс"
        title="Кабінет модератора платформи"
        description="Панель розгляду анкет українських майстерень, перевірки автентичності складу та допуску виробів до каталогу Life-MP."
      />

      <aside
        className="notice"
        aria-label="Правила модерації"
        style={{ marginTop: "1.5rem", marginBottom: "2rem" }}
      >
        <h2 className="notice__title">
          Режим комплаєнс-контролю (Phase P0 Containment)
        </h2>
        <p>
          Розгляд заявок здійснюється уповноваженими ролями платформи. Рішення
          модератора фіксуються в журналі аудиту та синхронізуються з базою
          даних Medusa v2 (@life/commerce).
        </p>
      </aside>

      <ModerationDashboard />
    </div>
  );
}
