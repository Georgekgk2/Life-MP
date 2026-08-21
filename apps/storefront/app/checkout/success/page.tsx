import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckoutSuccessView } from "@/components";

export const metadata: Metadata = {
  title: "Чернетка оформлення",
  description: "Тестовий стан без створення авторитетного замовлення",
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          className="section"
          style={{ textAlign: "center", padding: "4rem 1rem" }}
        >
          Завантаження стану чернетки...
        </div>
      }
    >
      <CheckoutSuccessView />
    </Suspense>
  );
}
