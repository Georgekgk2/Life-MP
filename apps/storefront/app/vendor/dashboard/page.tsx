import type { Metadata } from "next";
import { VendorDashboard } from "@/components";

export const metadata: Metadata = {
  title: "Кабінет Майстра — керування замовленнями та виплатами",
  description:
    "Робочий простір майстерні: облік замовлень, ТТН Нової Пошти, розрахунки та виплати на IBAN",
};

export default function VendorDashboardPage() {
  return <VendorDashboard />;
}
