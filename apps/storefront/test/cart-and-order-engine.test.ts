import { describe, expect, it } from "vitest";
import { SandboxOrderEngine } from "../src/sandbox/order-engine";
import type { CartItem, CheckoutCustomerInput } from "@life/types";

describe("Sandbox Multi-Vendor Order Engine (Phase 4C)", () => {
  const customer: CheckoutCustomerInput = {
    fullName: "Тарас Шевченко",
    phone: "+380 50 111 22 33",
    email: "taras@example.ua",
    city: "Львів",
    novaPoshtaBranch: "Відділення №1 (вул. Городоцька, 112)",
    paymentMethod: "sandbox_escrow",
  };

  const sampleItems: readonly CartItem[] = [
    {
      id: "p1",
      slug: "chashka",
      name: "Глиняна чашка",
      categorySlug: "dim",
      priceUah: 400,
      quantity: 2,
      vendorHandle: "olena",
      vendorName: "Майстерня Олени",
    },
    {
      id: "p2",
      slug: "rushnyk",
      name: "Тканий рушник",
      categorySlug: "odiah",
      priceUah: 600,
      quantity: 1,
      vendorHandle: "berehynia",
      vendorName: "Ткацтво Берегиня",
    },
  ];

  it("creates parent order and splits into distinct child orders per vendor", () => {
    const { parentOrder, childOrders, escrowHold } =
      SandboxOrderEngine.createOrder({
        customer,
        items: sampleItems,
      });

    expect(parentOrder.orderNumber).toMatch(/^LF-\d{8}-\d{4}$/);
    expect(parentOrder.totalAmountUah).toBe(1400); // (400*2) + (600*1)
    expect(parentOrder.status).toBe("escrow_held");
    expect(childOrders).toHaveLength(2);

    // Olena child order
    const olenaChild = childOrders.find((c) => c.vendorHandle === "olena")!;
    expect(olenaChild.subtotalUah).toBe(800);
    expect(olenaChild.platformCommissionUah).toBe(80); // 10%
    expect(olenaChild.vendorPayoutUah).toBe(720); // 90%
    expect(olenaChild.status).toBe("pending");
    expect(olenaChild.trackingNumber).toMatch(/^2045\d{10}$/);

    // Berehynia child order
    const berehyniaChild = childOrders.find(
      (c) => c.vendorHandle === "berehynia",
    )!;
    expect(berehyniaChild.subtotalUah).toBe(600);
    expect(berehyniaChild.platformCommissionUah).toBe(60); // 10%
    expect(berehyniaChild.vendorPayoutUah).toBe(540); // 90%

    // Escrow hold
    expect(escrowHold.amountUah).toBe(1400);
    expect(escrowHold.status).toBe("held");
  });

  it("updates Nova Poshta tracking and triggers automatic settlement upon delivery (Status 9)", () => {
    const { parentOrder, childOrders } = SandboxOrderEngine.createOrder({
      customer,
      items: sampleItems,
    });

    const firstChild = childOrders[0];
    const secondChild = childOrders[1];
    expect(firstChild).toBeDefined();
    expect(secondChild).toBeDefined();

    if (!firstChild || !secondChild) return;

    // 1. Shipped status
    const shippedRes = SandboxOrderEngine.updateTrackingStatus(
      firstChild.id,
      4,
    );
    expect(shippedRes.childOrder?.status).toBe("shipped");
    expect(shippedRes.childOrder?.trackingStatusCode).toBe(4);

    // 2. Delivered status for first workshop
    const deliveredRes = SandboxOrderEngine.updateTrackingStatus(
      firstChild.id,
      9,
    );
    expect(deliveredRes.childOrder?.status).toBe("delivered");
    expect(deliveredRes.settlement).toBeDefined();
    expect(deliveredRes.settlement?.payoutAmountUah).toBe(
      firstChild.vendorPayoutUah,
    );
    expect(deliveredRes.settlement?.status).toBe("settled");

    // Parent is not yet completed because second child is still pending
    const orderMid = SandboxOrderEngine.getOrder(parentOrder.orderNumber);
    expect(orderMid.parentOrder?.status).toBe("escrow_held");

    // 3. Delivered status for second workshop -> completes full order
    const finalRes = SandboxOrderEngine.updateTrackingStatus(secondChild.id, 9);
    expect(finalRes.childOrder?.status).toBe("delivered");

    const orderFinal = SandboxOrderEngine.getOrder(parentOrder.orderNumber);
    expect(orderFinal.parentOrder?.status).toBe("completed");
    expect(orderFinal.escrowHold?.status).toBe("captured");
    expect(orderFinal.settlements).toHaveLength(2);
  });
});
