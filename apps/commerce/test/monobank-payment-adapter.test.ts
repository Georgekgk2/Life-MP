import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import {
  MonobankSandboxPaymentAdapter,
  MonobankCommercePaymentAdapter,
  FakeMonobankTransport,
  InMemoryWebhookLedger,
  verifyEcdsaSignature,
  normalizePublicKeyPem,
  type MonobankWebhookPayload,
} from "../src/services/monobank-payment-adapter";

describe("MonobankSandboxPaymentAdapter (ADR 0014 Hardened)", () => {
  function generateTestKeyPair() {
    return crypto.generateKeyPairSync("ec", {
      namedCurve: "secp256k1",
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
  }

  function signPayload(payloadString: string, privateKeyPem: string): string {
    const signer = crypto.createSign("SHA256");
    signer.update(payloadString);
    return signer.sign(privateKeyPem, "base64");
  }

  it("decodes Base64-encoded PEM public key (standard Monobank acquiring format)", () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    // Simulate Monobank: base64-encode the PEM public key
    const base64Pem = Buffer.from(publicKey).toString("base64");

    const normalized = normalizePublicKeyPem(base64Pem);
    expect(normalized).toBe(publicKey.trim());

    // Verify signature using the Base64-encoded PEM
    const data = "test-data-for-monobank";
    const signature = signPayload(data, privateKey);
    expect(verifyEcdsaSignature(data, signature, base64Pem)).toBe(true);
  });

  it("creates a sandbox invoice and records pending status in durable ledger", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const result = await adapter.createInvoice({
      orderId: "ord_test_001",
      amountKopecks: 68000,
      description: "Оплата замовлення ord_test_001 (демо)",
    });

    expect(result.invoiceId).toMatch(/^inv_sb_[a-f0-9]{12}$/);
    expect(result.pageUrl).toContain(result.invoiceId);
    expect(result.pageUrl).toContain("sandbox.monobank.ua");

    const record = await ledger.getInvoice(result.invoiceId);
    expect(record).not.toBeNull();
    expect(record?.status).toBe("pending");
    expect(record?.amountKopecks).toBe(68000);
    expect(record?.orderId).toBe("ord_test_001");

    // Invalid amount or empty orderId
    await expect(
      adapter.createInvoice({
        orderId: "ord_bad",
        amountKopecks: -50,
        description: "Bad amount",
      }),
    ).rejects.toThrow(
      "Invoice amount must be a positive safe integer in kopecks",
    );

    await expect(
      adapter.createInvoice({
        orderId: "",
        amountKopecks: 1000,
        description: "Empty order",
      }),
    ).rejects.toThrow("Invoice orderId must not be empty");
  });

  it("fails closed on missing signature or invalid signature header", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const rawBody = JSON.stringify({ invoiceId: "inv_1", status: "hold" });

    // Missing header
    const missingRes = await adapter.processWebhook({
      rawBody,
      signatureHeader: undefined,
    });
    expect(missingRes.valid).toBe(false);
    if (!missingRes.valid) {
      expect(missingRes.statusCode).toBe(401);
      expect(missingRes.error).toContain("Missing X-Sign");
    }

    // Invalid signature
    const invalidRes = await adapter.processWebhook({
      rawBody,
      signatureHeader: "invalid_sig_base64",
    });
    expect(invalidRes.valid).toBe(false);
    if (!invalidRes.valid) {
      expect(invalidRes.statusCode).toBe(401);
      expect(invalidRes.error).toContain("Invalid ECDSA signature");
    }
  });

  it("rejects malformed raw body JSON", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const rawBody = "{ malformed json: true, ";
    const signature = signPayload(rawBody, privateKey);

    const res = await adapter.processWebhook({
      rawBody,
      signatureHeader: signature,
    });
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.statusCode).toBe(400);
      expect(res.error).toContain("Malformed JSON payload");
    }
  });

  it("performs forced cache-busting on rotated public key", async () => {
    const stalePair = generateTestKeyPair();
    const freshPair = generateTestKeyPair();

    const transport = new FakeMonobankTransport(stalePair.publicKey);
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    // Create invoice so ledger knows about it
    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_refresh",
      amountKopecks: 26000,
      description: "Testing key rotation",
    });

    // Provider rotates key on their side
    transport.setPublicKey(freshPair.publicKey);

    const payload: MonobankWebhookPayload = {
      invoiceId,
      status: "hold",
      amount: 26000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_refresh",
    };
    const rawBody = JSON.stringify(payload);
    // Signed with NEW private key
    const signature = signPayload(rawBody, freshPair.privateKey);

    const result = await adapter.processWebhook({
      rawBody,
      signatureHeader: signature,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.medusaStatus).toBe("authorized");
    }
  });

  it("rejects webhooks for unknown invoices not present in ledger", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const payload: MonobankWebhookPayload = {
      invoiceId: "inv_unknown_999",
      status: "hold",
      amount: 50000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_unknown",
    };
    const rawBody = JSON.stringify(payload);
    const signature = signPayload(rawBody, privateKey);

    const res = await adapter.processWebhook({
      rawBody,
      signatureHeader: signature,
    });
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.statusCode).toBe(422);
      expect(res.error).toContain(
        "Invoice inv_unknown_999 not found in ledger",
      );
    }
  });

  it("validates currency, amount, and reference against ledger record", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_biz_01",
      amountKopecks: 10000,
      description: "Order biz 01",
    });

    // 1. Invalid currency code (840 = USD)
    const usdPayload: MonobankWebhookPayload = {
      invoiceId,
      status: "hold",
      amount: 10000,
      ccy: 840,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_biz_01",
    };
    const usdRaw = JSON.stringify(usdPayload);
    const usdRes = await adapter.processWebhook({
      rawBody: usdRaw,
      signatureHeader: signPayload(usdRaw, privateKey),
    });
    expect(usdRes.valid).toBe(false);
    if (!usdRes.valid) {
      expect(usdRes.statusCode).toBe(400);
      expect(usdRes.error).toContain("Expected 980 (UAH)");
    }

    // 2. Amount mismatch with ledger record
    const mismatchAmtPayload: MonobankWebhookPayload = {
      invoiceId,
      status: "hold",
      amount: 99999, // ledger expects 10000
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_biz_01",
    };
    const amtRaw = JSON.stringify(mismatchAmtPayload);
    const amtRes = await adapter.processWebhook({
      rawBody: amtRaw,
      signatureHeader: signPayload(amtRaw, privateKey),
    });
    expect(amtRes.valid).toBe(false);
    if (!amtRes.valid) {
      expect(amtRes.statusCode).toBe(422);
      expect(amtRes.error).toContain(
        "Amount mismatch: expected 10000, got 99999",
      );
    }

    // 3. Reference mismatch with ledger record
    const mismatchRefPayload: MonobankWebhookPayload = {
      invoiceId,
      status: "hold",
      amount: 10000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_wrong_ref",
    };
    const refRaw = JSON.stringify(mismatchRefPayload);
    const refRes = await adapter.processWebhook({
      rawBody: refRaw,
      signatureHeader: signPayload(refRaw, privateKey),
    });
    expect(refRes.valid).toBe(false);
    if (!refRes.valid) {
      expect(refRes.statusCode).toBe(422);
      expect(refRes.error).toContain(
        "Reference mismatch: expected ord_biz_01, got ord_wrong_ref",
      );
    }
  });

  it("handles concurrent duplicate webhooks safely and atomically", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_concurrent",
      amountKopecks: 45000,
      description: "Testing concurrency",
    });

    const payload: MonobankWebhookPayload = {
      invoiceId,
      status: "hold",
      amount: 45000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_concurrent",
    };
    const rawBody = JSON.stringify(payload);
    const signatureHeader = signPayload(rawBody, privateKey);

    // Fire 5 concurrent webhook deliveries simulating Monobank retry flood
    const results = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        adapter.processWebhook({ rawBody, signatureHeader }),
      ),
    );

    // All should be valid
    expect(results.every((r) => r.valid)).toBe(true);

    const validResults = results.filter((r) => r.valid) as Array<{
      isDuplicate: boolean;
      medusaStatus: string;
    }>;

    // Exactly one should be the original execution
    const original = validResults.filter((r) => !r.isDuplicate);
    const duplicates = validResults.filter((r) => r.isDuplicate);

    expect(original.length).toBe(1);
    expect(duplicates.length).toBe(4);
    expect(original[0].medusaStatus).toBe("authorized");
  });

  it("prevents illegal backward status transitions in FSM", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_fsm_test",
      amountKopecks: 50000,
      description: "Testing FSM",
    });

    // 1. Move to hold (authorized)
    const holdPayload: MonobankWebhookPayload = {
      invoiceId,
      status: "hold",
      amount: 50000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_fsm_test",
    };
    const holdRaw = JSON.stringify(holdPayload);
    const holdRes = await adapter.processWebhook({
      rawBody: holdRaw,
      signatureHeader: signPayload(holdRaw, privateKey),
    });
    expect(holdRes.valid).toBe(true);

    // 2. Move to success (captured)
    const successPayload: MonobankWebhookPayload = {
      invoiceId,
      status: "success",
      amount: 50000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:05:00Z",
      reference: "ord_fsm_test",
    };
    const successRaw = JSON.stringify(successPayload);
    const successRes = await adapter.processWebhook({
      rawBody: successRaw,
      signatureHeader: signPayload(successRaw, privateKey),
    });
    expect(successRes.valid).toBe(true);

    // 3. Attempt backward transition: success -> hold
    const backwardPayload: MonobankWebhookPayload = {
      invoiceId,
      status: "hold",
      amount: 50000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:10:00Z",
      reference: "ord_fsm_test",
    };
    const backwardRaw = JSON.stringify(backwardPayload);
    const backwardRes = await adapter.processWebhook({
      rawBody: backwardRaw,
      signatureHeader: signPayload(backwardRaw, privateKey),
    });
    expect(backwardRes.valid).toBe(false);
    if (!backwardRes.valid) {
      expect(backwardRes.statusCode).toBe(422);
      expect(backwardRes.error).toContain(
        "Invalid status transition from captured to authorized",
      );
    }
  });

  it("prevents over-capture in finalizeHold", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_overcap",
      amountKopecks: 10000,
      description: "Testing overcapture",
    });

    await ledger.updateInvoiceStatus(invoiceId, "authorized");

    // Over-capture (15000 > 10000)
    await expect(adapter.finalizeHold(invoiceId, 15000)).rejects.toThrow(
      "Cannot finalize amount 15000 greater than hold amount 10000",
    );

    // Partial or exact capture is permitted
    const res = await adapter.finalizeHold(invoiceId, 8000);
    expect(res.success).toBe(true);
    expect((await ledger.getInvoice(invoiceId))?.status).toBe("captured");
  });

  it("fails closed without local status mutation if provider transport fails", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_prov_fail",
      amountKopecks: 10000,
      description: "Testing transport failure",
    });

    await ledger.updateInvoiceStatus(invoiceId, "authorized");

    // Simulate network / provider error in transport
    transport.shouldFailRequests = true;

    await expect(adapter.finalizeHold(invoiceId, 10000)).rejects.toThrow(
      "Simulated Monobank network error",
    );

    // Status MUST remain authorized, NOT prematurely updated to captured!
    expect((await ledger.getInvoice(invoiceId))?.status).toBe("authorized");

    await expect(adapter.cancelHold(invoiceId)).rejects.toThrow(
      "Simulated Monobank network error",
    );

    // Status MUST still remain authorized, NOT prematurely canceled!
    expect((await ledger.getInvoice(invoiceId))?.status).toBe("authorized");
  });

  it("prohibits cancelHold after captured (prevents backward mutation)", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_no_cancel",
      amountKopecks: 10000,
      description: "Testing cancel restrictions",
    });

    await ledger.updateInvoiceStatus(invoiceId, "authorized");
    await adapter.finalizeHold(invoiceId, 10000);
    expect((await ledger.getInvoice(invoiceId))?.status).toBe("captured");

    // Now attempt cancelHold on captured invoice
    await expect(adapter.cancelHold(invoiceId)).rejects.toThrow(
      "Cannot cancel invoice in status captured",
    );
    expect((await ledger.getInvoice(invoiceId))?.status).toBe("captured");
  });

  it("bridges Monobank adapter to generic MarketplacePaymentAdapter", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryWebhookLedger();
    const core = new MonobankSandboxPaymentAdapter({ transport, ledger });
    const commerceAdapter = new MonobankCommercePaymentAdapter(core);

    const session = await commerceAdapter.createPaymentSession({
      orderId: "ord_commerce_001",
      amountUah: 450,
    });

    expect(session.transactionId).toMatch(/^inv_sb_[a-f0-9]{12}$/);
    expect(session.paymentUrl).toContain(session.transactionId);

    // Verify invoice saved in ledger with correct converted amount in kopecks (45000)
    const record = await core.getInvoice(session.transactionId);
    expect(record?.amountKopecks).toBe(45000);
    expect(record?.orderId).toBe("ord_commerce_001");
  });
});
