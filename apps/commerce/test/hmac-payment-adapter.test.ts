import { describe, expect, it } from "vitest";
import { HmacSandboxPaymentAdapter } from "../src/services/payment-adapter.js";
import { InMemoryTestWebhookLedger } from "../src/services/monobank-payment-adapter.js";

const TEST_SECRET = "super_secret_key_minimum_16_chars_long";

describe("HmacSandboxPaymentAdapter (ADR 0014)", () => {
  it("rejects secrets that are too short", () => {
    expect(() => new HmacSandboxPaymentAdapter("short")).toThrow(
      "must be at least 16 characters long",
    );
  });

  it("verifies valid HMAC-SHA256 signature", () => {
    const adapter = new HmacSandboxPaymentAdapter(TEST_SECRET);
    const body = JSON.stringify({ test: "data" });
    const signature = adapter.computeSignature(body, "sha256");

    expect(adapter.verifySignature(body, signature, "sha256")).toBe(true);
  });

  it("verifies valid HMAC-SHA1 signature", () => {
    const adapter = new HmacSandboxPaymentAdapter(TEST_SECRET);
    const body = JSON.stringify({ test: "data_sha1" });
    const signature = adapter.computeSignature(body, "sha1");

    expect(adapter.verifySignature(body, signature, "sha1")).toBe(true);
  });

  it("fails closed on invalid signature", () => {
    const adapter = new HmacSandboxPaymentAdapter(TEST_SECRET);
    const body = JSON.stringify({ test: "data" });
    const signature =
      "0000000000000000000000000000000000000000000000000000000000000000";

    expect(adapter.verifySignature(body, signature, "sha256")).toBe(false);
    expect(adapter.verifySignature(body, "malformed", "sha256")).toBe(false);
    expect(adapter.verifySignature(body, "", "sha256")).toBe(false);
  });

  it("processes signed webhook successfully and maps status to Medusa", async () => {
    const adapter = new HmacSandboxPaymentAdapter(TEST_SECRET);
    const timestamp = Math.floor(Date.now() / 1000);

    const payload = {
      transactionId: "tx_12345",
      orderId: "order_67890",
      amountKopecks: 25000,
      currency: "UAH",
      status: "authorized" as const,
      timestamp,
    };

    const rawBody = JSON.stringify(payload);
    const signature = adapter.computeSignature(rawBody, "sha256");

    const result = await adapter.processSignedWebhook(
      rawBody,
      signature,
      "sha256",
    );

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.transactionId).toBe("tx_12345");
      expect(result.medusaStatus).toBe("authorized");
      expect(result.isDuplicate).toBe(false);
    }
  });

  it("rejects webhook when signature is tampered with 401 Unauthorized", async () => {
    const adapter = new HmacSandboxPaymentAdapter(TEST_SECRET);
    const rawBody = JSON.stringify({ transactionId: "tx_123" });

    const result = await adapter.processSignedWebhook(rawBody, "bad_sig");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.statusCode).toBe(401);
      expect(result.error).toContain("401 Unauthorized");
    }
  });

  it("rejects webhook when clock skew / replay window is exceeded", async () => {
    const adapter = new HmacSandboxPaymentAdapter(TEST_SECRET, undefined, 300);
    // Timestamp from 10 minutes ago (> 300s skew)
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600;

    const payload = {
      transactionId: "tx_replay",
      orderId: "order_replay",
      amountKopecks: 10000,
      currency: "UAH",
      status: "success" as const,
      timestamp: oldTimestamp,
    };

    const rawBody = JSON.stringify(payload);
    const signature = adapter.computeSignature(rawBody);

    const result = await adapter.processSignedWebhook(rawBody, signature);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain(
        "timestamp expired or clock skew exceeded",
      );
    }
  });

  it("integrates with WebhookEventLedger for durable idempotency", async () => {
    const ledger = new InMemoryTestWebhookLedger();
    const adapter = new HmacSandboxPaymentAdapter(TEST_SECRET, ledger);

    // Pre-create invoice record in ledger
    await ledger.saveInvoice({
      invoiceId: "tx_idempotent",
      orderId: "order_idempotent",
      amountKopecks: 12000,
      currency: 980,
      paymentType: "hold",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      transactionId: "tx_idempotent",
      orderId: "order_idempotent",
      amountKopecks: 12000,
      currency: "UAH",
      status: "authorized" as const,
      timestamp,
    };

    const rawBody = JSON.stringify(payload);
    const signature = adapter.computeSignature(rawBody);

    // First delivery
    const firstResult = await adapter.processSignedWebhook(rawBody, signature);
    expect(firstResult.valid).toBe(true);
    if (firstResult.valid) {
      expect(firstResult.isDuplicate).toBe(false);
      expect(firstResult.medusaStatus).toBe("authorized");
    }

    // Duplicate delivery of identical webhook
    const duplicateResult = await adapter.processSignedWebhook(
      rawBody,
      signature,
    );
    expect(duplicateResult.valid).toBe(true);
    if (duplicateResult.valid) {
      expect(duplicateResult.isDuplicate).toBe(true);
      expect(duplicateResult.medusaStatus).toBe("authorized");
    }

    // Tampered duplicate payload (hash conflict)
    const tamperedPayload = { ...payload, amountKopecks: 99999 };
    const tamperedRawBody = JSON.stringify(tamperedPayload);
    const tamperedSignature = adapter.computeSignature(tamperedRawBody);

    const conflictResult = await adapter.processSignedWebhook(
      tamperedRawBody,
      tamperedSignature,
    );
    expect(conflictResult.valid).toBe(false);
    if (!conflictResult.valid) {
      expect(conflictResult.statusCode).toBe(409);
      expect(conflictResult.error).toContain("Payload hash conflict");
    }
  });
});
