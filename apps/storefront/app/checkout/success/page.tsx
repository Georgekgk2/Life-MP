import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckoutSuccessView } from "@/components";

export const metadata: Metadata = {
  title: "Замовлення прийнято",
  description: "Підтвердження оформлення замовлення на маркетплейсі ЛАЙФ",
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          className="section"
          style={{ textAlign: "center", padding: "4rem 1rem" }}
        >
          Завантаження деталей замовлення...
        </div>
      }
    >
      <CheckoutSuccessView />
    </Suspense>
  );
}
