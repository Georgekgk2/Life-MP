import { describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import {
  MonobankSandboxPaymentAdapter,
  verifyEcdsaSignature,
  type MonobankWebhookPayload,
  type PublicKeyProvider,
  InMemoryWebhookLedger,
} from "../src/services/monobank-payment-adapter";

describe("MonobankSandboxPaymentAdapter (ADR 0014)", () => {
  // Helper to generate real in-memory ECDSA secp256k1 keypair for tests
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

  it("creates a sandbox invoice with hold type and positive amount", async () => {
    const { publicKey } = generateTestKeyPair();
    const adapter = new MonobankSandboxPaymentAdapter({
      publicKeyProvider: { getPublicKey: async () => publicKey },
    });

    const result = await adapter.createInvoice({
      orderId: "ord_test_001",
      amountKopecks: 68000,
      description: "Оплата замовлення ord_test_001 (демо)",
    });

    expect(result.invoiceId).toMatch(/^inv_sb_[a-f0-9]{12}$/);
    expect(result.pageUrl).toContain(result.invoiceId);
    expect(result.pageUrl).toContain("sandbox.monobank.ua");

    await expect(
      adapter.createInvoice({
        orderId: "ord_bad",
        amountKopecks: -50,
        description: "Bad amount",
      }),
    ).rejects.toThrow("Invoice amount must be positive");
  });

  it("verifies valid ECDSA signatures and rejects tampered bodies", () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const body = JSON.stringify({
      invoiceId: "inv_123",
      status: "hold",
      amount: 10000,
    });
    const signature = signPayload(body, privateKey);

    // 1. Valid signature
    expect(verifyEcdsaSignature(body, signature, publicKey)).toBe(true);

    // 2. Tampered body
    const tamperedBody = JSON.stringify({
      invoiceId: "inv_123",
      status: "hold",
      amount: 99999,
    });
    expect(verifyEcdsaSignature(tamperedBody, signature, publicKey)).toBe(
      false,
    );

    // 3. Foreign key
    const foreignPair = generateTestKeyPair();
    expect(verifyEcdsaSignature(body, signature, foreignPair.publicKey)).toBe(
      false,
    );
  });

  it("fails closed when signature header is missing or signature is invalid", async () => {
    const { publicKey } = generateTestKeyPair();
    const adapter = new MonobankSandboxPaymentAdapter({
      publicKeyProvider: { getPublicKey: async () => publicKey },
    });

    const payload: MonobankWebhookPayload = {
      invoiceId: "inv_sb_001",
      status: "hold",
      amount: 39000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_001",
    };
    const rawBody = JSON.stringify(payload);

    // Missing header
    const missingRes = await adapter.processWebhook({
      rawBody,
      signatureHeader: undefined,
      payload,
    });
    expect(missingRes.valid).toBe(false);
    if (!missingRes.valid) {
      expect(missingRes.statusCode).toBe(401);
      expect(missingRes.error).toContain("Missing X-Sign");
    }

    // Invalid signature
    const invalidRes = await adapter.processWebhook({
      rawBody,
      signatureHeader: "bad_signature_base64",
      payload,
    });
    expect(invalidRes.valid).toBe(false);
    if (!invalidRes.valid) {
      expect(invalidRes.statusCode).toBe(401);
      expect(invalidRes.error).toContain("Invalid ECDSA signature");
    }
  });

  it("performs forced cache-busting when initial key verification fails", async () => {
    const stalePair = generateTestKeyPair();
    const freshPair = generateTestKeyPair();

    let calls = 0;
    const keyProvider: PublicKeyProvider = {
      getPublicKey: vi.fn(async (forceRefresh?: boolean) => {
        calls++;
        return forceRefresh ? freshPair.publicKey : stalePair.publicKey;
      }),
    };

    const adapter = new MonobankSandboxPaymentAdapter({
      publicKeyProvider: keyProvider,
    });

    const payload: MonobankWebhookPayload = {
      invoiceId: "inv_sb_refresh",
      status: "hold",
      amount: 26000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_refresh",
    };
    const rawBody = JSON.stringify(payload);
    // Signed with FRESH private key (stale key will fail initially)
    const signature = signPayload(rawBody, freshPair.privateKey);

    const result = await adapter.processWebhook({
      rawBody,
      signatureHeader: signature,
      payload,
    });

    expect(result.valid).toBe(true);
    expect(keyProvider.getPublicKey).toHaveBeenCalledWith(true);
    expect(calls).toBe(2); // Stale first, then forced fresh
  });

  it("validates business invariants: non-UAH currency, amount, and reference mismatches", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const adapter = new MonobankSandboxPaymentAdapter({
      publicKeyProvider: { getPublicKey: async () => publicKey },
    });

    const basePayload: MonobankWebhookPayload = {
      invoiceId: "inv_sb_biz",
      status: "hold",
      amount: 10000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_biz_01",
    };

    // 1. Invalid currency (840 = USD)
    const usdPayload = { ...basePayload, ccy: 840 };
    const usdRaw = JSON.stringify(usdPayload);
    const usdRes = await adapter.processWebhook({
      rawBody: usdRaw,
      signatureHeader: signPayload(usdRaw, privateKey),
      payload: usdPayload,
    });
    expect(usdRes.valid).toBe(false);
    if (!usdRes.valid) {
      expect(usdRes.statusCode).toBe(400);
      expect(usdRes.error).toContain("Expected 980 (UAH)");
    }

    // 2. Amount mismatch
    const amtRaw = JSON.stringify(basePayload);
    const amtRes = await adapter.processWebhook({
      rawBody: amtRaw,
      signatureHeader: signPayload(amtRaw, privateKey),
      payload: basePayload,
      expectedAmountKopecks: 20000, // mismatch
    });
    expect(amtRes.valid).toBe(false);
    if (!amtRes.valid) {
      expect(amtRes.statusCode).toBe(422);
      expect(amtRes.error).toContain("Amount mismatch");
    }

    // 3. Reference mismatch
    const refRes = await adapter.processWebhook({
      rawBody: amtRaw,
      signatureHeader: signPayload(amtRaw, privateKey),
      payload: basePayload,
      expectedReference: "ord_different", // mismatch
    });
    expect(refRes.valid).toBe(false);
    if (!refRes.valid) {
      expect(refRes.statusCode).toBe(422);
      expect(refRes.error).toContain("Reference mismatch");
    }
  });

  it("handles duplicate webhooks idempotently via durable ledger", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({
      publicKeyProvider: { getPublicKey: async () => publicKey },
      ledger,
    });

    const payload: MonobankWebhookPayload = {
      invoiceId: "inv_sb_idemp",
      status: "hold",
      amount: 45000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_idemp",
    };
    const rawBody = JSON.stringify(payload);
    const signature = signPayload(rawBody, privateKey);

    // First delivery
    const firstRes = await adapter.processWebhook({
      rawBody,
      signatureHeader: signature,
      payload,
    });
    expect(firstRes.valid).toBe(true);
    if (firstRes.valid) {
      expect(firstRes.isDuplicate).toBe(false);
      expect(firstRes.medusaStatus).toBe("authorized");
    }

    // Second delivery (exact retry from Monobank)
    const secondRes = await adapter.processWebhook({
      rawBody,
      signatureHeader: signature,
      payload,
    });
    expect(secondRes.valid).toBe(true);
    if (secondRes.valid) {
      expect(secondRes.isDuplicate).toBe(true);
      expect(secondRes.medusaStatus).toBe("authorized");
    }
  });

  it("enforces strict FSM state transitions and rejects backward mutations", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({
      publicKeyProvider: { getPublicKey: async () => publicKey },
      ledger,
    });

    const invoiceId = "inv_sb_fsm";

    // 1. Initial hold
    const holdPayload: MonobankWebhookPayload = {
      invoiceId,
      status: "hold",
      amount: 50000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_fsm",
    };
    const holdRaw = JSON.stringify(holdPayload);
    const holdRes = await adapter.processWebhook({
      rawBody: holdRaw,
      signatureHeader: signPayload(holdRaw, privateKey),
      payload: holdPayload,
    });
    expect(holdRes.valid).toBe(true);

    // 2. Transition hold -> success (captured)
    const successPayload: MonobankWebhookPayload = {
      invoiceId,
      status: "success",
      amount: 50000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:05:00Z",
      reference: "ord_fsm",
    };
    const successRaw = JSON.stringify(successPayload);
    const successRes = await adapter.processWebhook({
      rawBody: successRaw,
      signatureHeader: signPayload(successRaw, privateKey),
      payload: successPayload,
    });
    expect(successRes.valid).toBe(true);
    if (successRes.valid) {
      expect(successRes.medusaStatus).toBe("captured");
    }

    // 3. Illegal backward transition attempt: success -> hold
    const backwardPayload: MonobankWebhookPayload = {
      invoiceId,
      status: "hold",
      amount: 50000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:10:00Z",
      reference: "ord_fsm",
    };
    const backwardRaw = JSON.stringify(backwardPayload);
    const backwardRes = await adapter.processWebhook({
      rawBody: backwardRaw,
      signatureHeader: signPayload(backwardRaw, privateKey),
      payload: backwardPayload,
    });
    expect(backwardRes.valid).toBe(false);
    if (!backwardRes.valid) {
      expect(backwardRes.statusCode).toBe(422);
      expect(backwardRes.error).toContain(
        "Invalid status transition from captured to authorized",
      );
    }
  });

  it("finalizes and cancels authorization holds properly", async () => {
    const { publicKey } = generateTestKeyPair();
    const ledger = new InMemoryWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({
      publicKeyProvider: { getPublicKey: async () => publicKey },
      ledger,
    });

    const inv1 = (
      await adapter.createInvoice({
        orderId: "ord_fin",
        amountKopecks: 10000,
        description: "Test finalize",
      })
    ).invoiceId;

    // Transition to authorized first
    await ledger.updatePaymentStatus(inv1, "authorized");

    const finRes = await adapter.finalizeHold(inv1, 10000);
    expect(finRes.success).toBe(true);
    expect(await ledger.getCurrentPaymentStatus(inv1)).toBe("captured");

    const inv2 = (
      await adapter.createInvoice({
        orderId: "ord_can",
        amountKopecks: 10000,
        description: "Test cancel",
      })
    ).invoiceId;

    const canRes = await adapter.cancelHold(inv2);
    expect(canRes.success).toBe(true);
    expect(await ledger.getCurrentPaymentStatus(inv2)).toBe("canceled");
  });
});
