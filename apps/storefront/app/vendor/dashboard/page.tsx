import type { Metadata } from "next";
import { VendorDashboard } from "@/components";

export const metadata: Metadata = {
  title: "Кабінет майстра — потрібна автентифікація",
  description:
    "Доступ до кабінету майстра буде відкрито після підключення серверної автентифікації та перевірки дозволів.",
};

export default function VendorDashboardPage() {
  return <VendorDashboard />;
}
