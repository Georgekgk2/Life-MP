import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { VendorDashboard } from "@/components";

export const metadata: Metadata = {
  title: "Кабінет майстра — потрібна автентифікація",
  description:
    "Доступ до кабінету майстра буде відкрито після підключення серверної автентифікації та перевірки дозволів.",
};

export default async function VendorDashboardPage() {
  const cookieStore = await cookies();
  const authSession = cookieStore.get("life_mp_auth_session")?.value;
  if (!authSession) {
    notFound();
  }

  return <VendorDashboard />;
}
