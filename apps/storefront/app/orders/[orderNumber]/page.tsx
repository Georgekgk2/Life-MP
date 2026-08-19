import type { Metadata } from "next";
import { OrderTrackerView } from "@/components";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Відстеження замовлення #${orderNumber}`,
    description: `Деталі та статус доставки замовлення #${orderNumber} на маркетплейсі ЛАЙФ`,
  };
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return <OrderTrackerView orderNumber={orderNumber} />;
}
