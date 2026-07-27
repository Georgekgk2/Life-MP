import { describe, it, expect } from "vitest";
import { SandboxPaymentAdapter } from "../src/services/payment-adapter";
import { MockFiscalAdapter } from "../src/services/fiscal-adapter";
import { MockNovaPoshtaAdapter } from "../src/services/shipping-adapter";

describe("Phase 4A Commerce Adapters", () => {
  it("SandboxPaymentAdapter creates payment session and enforces webhook idempotency", async () => {
    const payment = new SandboxPaymentAdapter();
    const session = await payment.createPaymentSession({
      amountUah: 1500,
      orderId: "ord_123",
    });

    expect(session.transactionId).toContain("tx_sb_");
    expect(session.paymentUrl).toContain("sandbox.life.ua");

    const webhook1 = await payment.processWebhook({
      transactionId: session.transactionId,
      status: "success",
      idempotencyKey: "idemp_key_001",
    });
    expect(webhook1.success).toBe(true);
    expect(webhook1.isDuplicate).toBe(false);

    const webhook2 = await payment.processWebhook({
      transactionId: session.transactionId,
      status: "success",
      idempotencyKey: "idemp_key_001",
    });
    expect(webhook2.isDuplicate).toBe(true);
  });

  it("MockFiscalAdapter issues electronic receipt", async () => {
    const fiscal = new MockFiscalAdapter();
    const receipt = await fiscal.issueReceipt({
      parentOrderId: "ord_123",
      amountUah: 1500,
      items: [{ title: "Батончик горіховий", priceUah: 150, quantity: 10 }],
    });

    expect(receipt.receiptId).toContain("rcpt_mock_");
    expect(receipt.fiscalCode).toContain("FISC-");
    expect(receipt.pdfUrl).toContain("sandbox.life.ua/receipts/");
  });

  it("MockNovaPoshtaAdapter calculates shipping and generates TTN", async () => {
    const np = new MockNovaPoshtaAdapter();
    const fee = await np.calculateShippingFee({
      vendorId: "vnd_123",
      recipientCity: "Київ",
      weightKg: 2.5,
    });
    expect(fee.feeUah).toBe(110);

    const ttn = await np.generateTTN({
      childOrderId: "child_123",
      senderVendorId: "vnd_123",
      recipientName: "Тарас Шевченко",
      recipientPhone: "+380501112233",
      recipientCity: "Київ",
      recipientAddress: "вул. Хрещатик, 1",
    });
    expect(ttn.ttnNumber).toMatch(/^204500/);
  });
});
