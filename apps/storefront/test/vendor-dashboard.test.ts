import { describe, expect, it } from "vitest";
import { SandboxOrderEngine } from "../src/sandbox/order-engine";

describe("Vendor Dashboard Logic & Accounting (Phase 2)", () => {
  it("calculates 10% platform commission and 90% payout for vendor child orders", () => {
    const parentOrders = SandboxOrderEngine.getAllOrders();
    expect(parentOrders.length).toBeGreaterThanOrEqual(1);

    const firstOrder = parentOrders[0]!;
    const details = SandboxOrderEngine.getOrder(firstOrder.orderNumber);

    expect(details.childOrders.length).toBeGreaterThanOrEqual(1);

    for (const child of details.childOrders) {
      expect(child.vendorPayoutUah).toBe(
        child.subtotalUah - child.platformCommissionUah,
      );
      expect(child.platformCommissionUah).toBe(
        Math.round(child.subtotalUah * 0.1),
      );
    }
  });

  it("updates child order tracking status and records settlements properly", () => {
    const parentOrders = SandboxOrderEngine.getAllOrders();
    const firstOrder = parentOrders[0]!;
    const details = SandboxOrderEngine.getOrder(firstOrder.orderNumber);
    const firstChild = details.childOrders[0]!;

    const updateRes = SandboxOrderEngine.updateTrackingStatus(firstChild.id, 9);
    expect(updateRes.childOrder?.status).toBe("delivered");
    expect(updateRes.childOrder?.trackingStatusCode).toBe(9);
    expect(updateRes.settlement).toBeDefined();
    expect(updateRes.settlement?.status).toBe("settled");
  });
});
