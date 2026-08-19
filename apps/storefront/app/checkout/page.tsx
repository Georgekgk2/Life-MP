import type { Metadata } from "next";
import { CheckoutView } from "@/components";

export const metadata: Metadata = {
  title: "Оформлення замовлення",
  description: "Оформлення замовлення на крафтовому маркетплейсі ЛАЙФ",
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
