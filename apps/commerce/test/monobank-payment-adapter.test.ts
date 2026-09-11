import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import {
  MonobankSandboxPaymentAdapter,
  FakeMonobankTransport,
  MonobankHttpTransport,
  InMemoryTestWebhookLedger,
  verifyEcdsaSignature,
  normalizePublicKeyPem,
  MonobankReconciliationError,
  MonobankCancelResponseSchema,
  MonobankInvoiceStatusResponseSchema,
  type MonobankWebhookPayload,
} from "../src/services/monobank-payment-adapter";

describe("MonobankSandboxPaymentAdapter (ADR 0014 Contract Core)", () => {
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

  it("creates a sandbox invoice and records hold paymentType in durable ledger", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const result = await adapter.createInvoice({
      orderId: "ord_test_001",
      amountKopecks: 68000,
      description: "Оплата замовлення ord_test_001 (демо)",
      paymentType: "hold",
    });

    expect(result.invoiceId).toMatch(/^inv_sb_[a-f0-9]{12}$/);
    expect(result.pageUrl).toContain(result.invoiceId);
    expect(result.pageUrl).toContain("sandbox.monobank.ua");

    const record = await ledger.getInvoice(result.invoiceId);
    expect(record).not.toBeNull();
    expect(record?.status).toBe("pending");
    expect(record?.amountKopecks).toBe(68000);
    expect(record?.orderId).toBe("ord_test_001");
    expect(record?.paymentType).toBe("hold");

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

  it("fails closed on missing signature or invalid signature header (401)", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
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

  it("rejects malformed raw body JSON with 400", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
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

  it("validates payload against strict Zod schema (rejects missing dates, invalid fields, or unrecognized keys with 400)", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_schema_test",
      amountKopecks: 10000,
      description: "Testing schema",
    });

    // 1. Missing modifiedDate
    const invalidPayload = {
      invoiceId,
      status: "hold",
      amount: 10000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      // modifiedDate missing
      reference: "ord_schema_test",
    };
    const raw1 = JSON.stringify(invalidPayload);
    const res1 = await adapter.processWebhook({
      rawBody: raw1,
      signatureHeader: signPayload(raw1, privateKey),
    });
    expect(res1.valid).toBe(false);
    if (!res1.valid) {
      expect(res1.statusCode).toBe(400);
      expect(res1.error).toContain("Payload validation failed");
    }

    // 2. Invalid date format
    const badDatePayload = {
      ...invalidPayload,
      modifiedDate: "invalid-date-string",
    };
    const raw2 = JSON.stringify(badDatePayload);
    const res2 = await adapter.processWebhook({
      rawBody: raw2,
      signatureHeader: signPayload(raw2, privateKey),
    });
    expect(res2.valid).toBe(false);
    if (!res2.valid) {
      expect(res2.statusCode).toBe(400);
      expect(res2.error).toContain("Payload validation failed");
    }

    // 3. Strict schema: reject unexpected arbitrary properties
    const unknownFieldPayload = {
      invoiceId,
      status: "hold",
      amount: 10000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_schema_test",
      unrecognizedSecretBackdoorField: "forbidden",
    };
    const raw3 = JSON.stringify(unknownFieldPayload);
    const res3 = await adapter.processWebhook({
      rawBody: raw3,
      signatureHeader: signPayload(raw3, privateKey),
    });
    expect(res3.valid).toBe(false);
    if (!res3.valid) {
      expect(res3.statusCode).toBe(400);
      expect(res3.error).toContain("Payload validation failed");
      expect(res3.error).toContain("Unrecognized key");
    }
  });

  it("performs forced cache-busting on rotated public key and respects 24h TTL", async () => {
    const stalePair = generateTestKeyPair();
    const freshPair = generateTestKeyPair();

    const transport = new FakeMonobankTransport(stalePair.publicKey);
    const ledger = new InMemoryTestWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

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

  it("limits forced public key refresh to rate-limited cooldown (amplification protection)", async () => {
    const { publicKey } = generateTestKeyPair();
    let getPublicKeyCalls = 0;
    const transport: FakeMonobankTransport = new FakeMonobankTransport(
      publicKey,
    );
    const originalGetPubKey = transport.getPublicKey.bind(transport);
    transport.getPublicKey = async () => {
      getPublicKeyCalls++;
      return originalGetPubKey();
    };

    const ledger = new InMemoryTestWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    // First call caches the key
    await adapter.getPublicKey(false);
    expect(getPublicKeyCalls).toBe(1);

    // Repeated forceRefresh immediately should be blocked by cooldown (60s)
    await adapter.getPublicKey(true);
    expect(getPublicKeyCalls).toBe(2);

    await adapter.getPublicKey(true);
    expect(getPublicKeyCalls).toBe(2); // Still 2, cooldown active
  });

  it("rejects webhooks for unknown invoices not present in ledger with 422", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
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
    const ledger = new InMemoryTestWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_biz_01",
      amountKopecks: 10000,
      description: "Order biz 01",
    });

    // 1. Invalid currency code (840 = USD)
    const usdPayload = {
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
      expect(usdRes.error).toContain("Payload validation failed");
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

  it("detects payload hash conflicts on duplicate event key and rejects with 409 (fail-closed)", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_conflict_test",
      amountKopecks: 10000,
      description: "Testing conflict",
    });

    const payloadA: MonobankWebhookPayload = {
      invoiceId,
      status: "hold",
      amount: 10000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_conflict_test",
      failureReason: "None",
    };
    const rawA = JSON.stringify(payloadA);
    const resA = await adapter.processWebhook({
      rawBody: rawA,
      signatureHeader: signPayload(rawA, privateKey),
    });
    expect(resA.valid).toBe(true);

    // Same (invoiceId, status, modifiedDate) but DIFFERENT payload content (different hash)
    const payloadB: MonobankWebhookPayload = {
      invoiceId,
      status: "hold",
      amount: 10000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_conflict_test",
      failureReason: "Different reason that alters hash",
    };
    const rawB = JSON.stringify(payloadB);
    const resB = await adapter.processWebhook({
      rawBody: rawB,
      signatureHeader: signPayload(rawB, privateKey),
    });

    expect(resB.valid).toBe(false);
    if (!resB.valid) {
      expect(resB.statusCode).toBe(409);
      expect(resB.error).toContain("Payload hash conflict");
    }
  });

  it("handles concurrent duplicate webhooks safely and atomically", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
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

  it("returns sanitized 503 internal error without leaking infrastructure details", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();

    // Mock ledger throwing database connection error
    ledger.getInvoice = async () => {
      throw new Error(
        "FATAL: PostgreSQL connection pool exhausted on port 5432",
      );
    };

    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const payload: MonobankWebhookPayload = {
      invoiceId: "inv_db_fail",
      status: "hold",
      amount: 10000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_db_fail",
    };
    const rawBody = JSON.stringify(payload);
    const res = await adapter.processWebhook({
      rawBody,
      signatureHeader: signPayload(rawBody, privateKey),
    });

    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.statusCode).toBe(503);
      // Verify no leakage of PostgreSQL internal connection error
      expect(res.error).not.toContain("PostgreSQL");
      expect(res.error).toBe(
        "Temporary infrastructure failure. Please retry later.",
      );
    }
  });

  it("enforces hold-only FSM: capture REQUIRES prior authorization (cannot capture from pending)", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_fsm_hold_req",
      amountKopecks: 50000,
      description: "Testing capture requires hold",
    });

    // Direct finalize attempt while still in pending state MUST be rejected
    await expect(adapter.finalizeHold(invoiceId, 50000)).rejects.toThrow(
      "Cannot finalize invoice in status pending. Invoice must be in authorized (hold) status before capture.",
    );

    // Direct webhook attempt to transition pending -> success (bypassing hold)
    const directSuccessPayload: MonobankWebhookPayload = {
      invoiceId,
      status: "success",
      amount: 50000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_fsm_hold_req",
    };
    const directSuccessRaw = JSON.stringify(directSuccessPayload);
    const directRes = await adapter.processWebhook({
      rawBody: directSuccessRaw,
      signatureHeader: signPayload(directSuccessRaw, privateKey),
    });
    expect(directRes.valid).toBe(false);
    if (!directRes.valid) {
      expect(directRes.statusCode).toBe(422);
      expect(directRes.error).toContain(
        "Invalid status transition from pending to captured",
      );
    }
  });

  it("prevents illegal backward status transitions in FSM", async () => {
    const { publicKey, privateKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
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
    if (successRes.valid) {
      expect(successRes.medusaStatus).toBe("captured");
    }

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

  it("prohibits partial finalization in initial sandbox slice (rejects amount !== holdAmount)", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_partial_test",
      amountKopecks: 10000,
      description: "Testing partial",
    });

    await ledger.updateInvoiceStatus(invoiceId, "authorized");

    // Partial capture (8000 !== 10000)
    await expect(adapter.finalizeHold(invoiceId, 8000)).rejects.toThrow(
      "Partial hold finalization is not supported in the initial sandbox slice",
    );

    // Over-capture (12000 !== 10000)
    await expect(adapter.finalizeHold(invoiceId, 12000)).rejects.toThrow(
      "Partial hold finalization is not supported in the initial sandbox slice",
    );

    // Exactly full amount succeeds
    const res = await adapter.finalizeHold(invoiceId, 10000);
    expect(res.success).toBe(true);
    expect((await ledger.getInvoice(invoiceId))?.status).toBe("captured");
  });

  it("prevents race conditions between concurrent finalizeHold calls", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_race_fin",
      amountKopecks: 10000,
      description: "Testing finalize race",
    });

    await ledger.updateInvoiceStatus(invoiceId, "authorized");

    // Fire 3 concurrent finalize calls
    const results = await Promise.all([
      adapter.finalizeHold(invoiceId, 10000),
      adapter.finalizeHold(invoiceId, 10000),
      adapter.finalizeHold(invoiceId, 10000),
    ]);

    expect(results.every((r) => r.success)).toBe(true);
    expect((await ledger.getInvoice(invoiceId))?.status).toBe("captured");
  });

  it("fails closed without local status mutation if provider transport fails", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
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

  it("throws MonobankReconciliationError when provider succeeds but local ledger update fails", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();

    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });
    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_reconcile_test",
      amountKopecks: 10000,
      description: "Testing reconciliation error",
    });

    await ledger.updateInvoiceStatus(invoiceId, "authorized");

    // Make ledger update fail after provider call
    ledger.updateInvoiceStatus = async () => {
      throw new Error("DB write disk full");
    };

    await expect(adapter.finalizeHold(invoiceId, 10000)).rejects.toThrowError(
      MonobankReconciliationError,
    );
  });

  it("differentiates cancelHold (authorized only) from removeInvoice (pending only)", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_diff_test",
      amountKopecks: 10000,
      description: "Testing cancel vs remove",
    });

    // 1. Calling cancelHold on pending invoice is rejected
    await expect(adapter.cancelHold(invoiceId)).rejects.toThrow(
      "Cannot cancel hold for pending invoice. Use removeInvoice() to void unpaid invoices.",
    );

    // 2. Calling removeInvoice on pending invoice succeeds
    const removeRes = await adapter.removeInvoice(invoiceId);
    expect(removeRes.success).toBe(true);
    expect((await ledger.getInvoice(invoiceId))?.status).toBe("canceled");

    // 3. Calling cancelHold on authorized hold succeeds
    const { invoiceId: inv2 } = await adapter.createInvoice({
      orderId: "ord_diff_test_2",
      amountKopecks: 10000,
      description: "Testing cancel hold authorized",
    });
    await ledger.updateInvoiceStatus(inv2, "authorized");
    const cancelRes = await adapter.cancelHold(inv2);
    expect(cancelRes.success).toBe(true);
    expect((await ledger.getInvoice(inv2))?.status).toBe("canceled");
  });

  it("prohibits cancelHold after captured, refunded, or failed", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_no_cancel",
      amountKopecks: 10000,
      description: "Testing cancel restrictions",
    });

    await ledger.updateInvoiceStatus(invoiceId, "authorized");
    await adapter.finalizeHold(invoiceId, 10000);
    expect((await ledger.getInvoice(invoiceId))?.status).toBe("captured");

    // Attempt cancelHold on captured invoice
    await expect(adapter.cancelHold(invoiceId)).rejects.toThrow(
      "Cannot cancel invoice in status captured. Only authorized holds can be canceled.",
    );
    expect((await ledger.getInvoice(invoiceId))?.status).toBe("captured");

    // Attempt cancelHold on failed invoice
    await ledger.updateInvoiceStatus(invoiceId, "failed");
    await expect(adapter.cancelHold(invoiceId)).rejects.toThrow(
      "Cannot cancel invoice in status failed. Only authorized holds can be canceled.",
    );
  });

  it("queries and reconciles invoice status via syncInvoiceStatus with strict invariant & FSM checks", async () => {
    const { publicKey } = generateTestKeyPair();
    const transport = new FakeMonobankTransport(publicKey);
    const ledger = new InMemoryTestWebhookLedger();
    const adapter = new MonobankSandboxPaymentAdapter({ transport, ledger });

    const { invoiceId } = await adapter.createInvoice({
      orderId: "ord_sync_test",
      amountKopecks: 10000,
      description: "Testing sync",
    });

    // 1. Unknown invoice throws
    await expect(adapter.syncInvoiceStatus("inv_non_existent")).rejects.toThrow(
      "Invoice inv_non_existent not found in ledger",
    );

    // 2. Normal sync from created -> pending succeeds
    const sync1 = await adapter.syncInvoiceStatus(invoiceId);
    expect(sync1.status).toBe("pending");
    expect(sync1.providerStatus).toBe("created");

    // 3. Amount mismatch throws
    transport.getInvoiceStatus = async () => ({
      invoiceId,
      status: "hold",
      amount: 99999, // Mismatched amount
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_sync_test",
    });
    await expect(adapter.syncInvoiceStatus(invoiceId)).rejects.toThrow(
      "Amount mismatch: expected 10000, got 99999",
    );

    // 4. Currency mismatch throws
    transport.getInvoiceStatus = async () => ({
      invoiceId,
      status: "hold",
      amount: 10000,
      ccy: 840 as unknown as 980, // Mismatched currency (USD)
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_sync_test",
    });
    await expect(adapter.syncInvoiceStatus(invoiceId)).rejects.toThrow(
      "Currency mismatch: expected 980, got 840",
    );

    // 5. Illegal transition pending -> captured directly without hold throws
    transport.getInvoiceStatus = async () => ({
      invoiceId,
      status: "success",
      amount: 10000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_sync_test",
    });
    await expect(adapter.syncInvoiceStatus(invoiceId)).rejects.toThrow(
      "Invalid status transition from pending to captured during status sync",
    );

    // 6. Valid transition pending -> hold (authorized) succeeds
    transport.getInvoiceStatus = async () => ({
      invoiceId,
      status: "hold",
      amount: 10000,
      ccy: 980,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_sync_test",
    });
    const sync2 = await adapter.syncInvoiceStatus(invoiceId);
    expect(sync2.status).toBe("authorized");
    expect((await ledger.getInvoice(invoiceId))?.status).toBe("authorized");
  });

  it("enforces NO-RETRY policy on mutating POST requests in MonobankHttpTransport", async () => {
    const transport = new MonobankHttpTransport({
      token: "test_token_sandbox",
      timeoutMs: 50,
      maxRetries: 2, // Configured for 2 retries on GET
    });

    // Calling invalid local port with POST createInvoice
    await expect(
      transport.createInvoice({
        amount: 10000,
        ccy: 980,
        merchantPaymInfo: {
          reference: "ord_no_post_retry",
          destination: "Test",
        },
        paymentType: "hold",
      }),
    ).rejects.toThrow();

    // Verify exactly ONE request attempt occurred for POST (zero retries!)
    expect(transport.logs.length).toBe(1);
    expect(transport.logs[0].method).toBe("POST");
    expect(transport.logs[0].path).toBe("/api/merchant/invoice/create");
  });

  it("validates MonobankCancelResponseSchema with status 'processing' or 'success' and optional dates", () => {
    // 1. Success without dates
    expect(
      MonobankCancelResponseSchema.safeParse({ status: "success" }).success,
    ).toBe(true);

    // 2. Processing with dates
    expect(
      MonobankCancelResponseSchema.safeParse({
        status: "processing",
        createdDate: "2026-09-11T12:00:00Z",
        modifiedDate: "2026-09-11T12:01:00Z",
      }).success,
    ).toBe(true);

    // 3. Invalid status
    expect(
      MonobankCancelResponseSchema.safeParse({ status: "invalid_status" })
        .success,
    ).toBe(false);

    // 4. Unknown property rejected
    expect(
      MonobankCancelResponseSchema.safeParse({
        status: "success",
        unknownProperty: 123,
      }).success,
    ).toBe(false);
  });

  it("validates MonobankInvoiceStatusResponseSchema with full official fields", () => {
    const fullOfficialResponse = {
      invoiceId: "inv_status_001",
      status: "hold",
      amount: 45000,
      ccy: 980,
      finalAmount: 45000,
      createdDate: "2026-09-11T12:00:00Z",
      modifiedDate: "2026-09-11T12:01:00Z",
      reference: "ord_full_001",
      destination: "Payment for order ord_full_001",
      paymentInfo: { maskedPan: "444400******1111" },
      cancelList: [],
      tipsInfo: {},
      walletData: { cardToken: "token_123" },
      failureReason: undefined,
      errCode: undefined,
    };

    expect(
      MonobankInvoiceStatusResponseSchema.safeParse(fullOfficialResponse)
        .success,
    ).toBe(true);

    // Without optional reference and dates
    const minimalResponse = {
      invoiceId: "inv_status_002",
      status: "created",
      amount: 20000,
      ccy: 980,
    };
    expect(
      MonobankInvoiceStatusResponseSchema.safeParse(minimalResponse).success,
    ).toBe(true);
  });

  it("validates provider response shapes via strict Zod schemas in MonobankHttpTransport", async () => {
    const originalFetch = global.fetch;
    const transport = new MonobankHttpTransport({
      token: "test_token",
      baseUrl: "https://mock.monobank.local",
    });

    try {
      // 1. Mock invalid public key response (e.g. key is a number instead of string)
      global.fetch = async () =>
        new Response(JSON.stringify({ key: 12345 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      await expect(transport.getPublicKey()).rejects.toThrow(
        "Monobank response validation failed",
      );

      // 2. Mock valid public key response
      global.fetch = async () =>
        new Response(JSON.stringify({ key: "valid_public_key_string" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      const key = await transport.getPublicKey();
      expect(key).toBe("valid_public_key_string");

      // 3. Mock invalid createInvoice response (missing pageUrl)
      global.fetch = async () =>
        new Response(JSON.stringify({ invoiceId: "inv_bad" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      await expect(
        transport.createInvoice({
          amount: 1000,
          ccy: 980,
          merchantPaymInfo: { reference: "ref", destination: "desc" },
          paymentType: "hold",
        }),
      ).rejects.toThrow("Monobank response validation failed");

      // 4. Mock cancel response with "processing"
      global.fetch = async () =>
        new Response(
          JSON.stringify({
            status: "processing",
            createdDate: "2026-09-11T12:00:00Z",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );

      const cancelRes = await transport.cancelHold({ invoiceId: "inv_cancel" });
      expect(cancelRes.status).toBe("processing");

      // 5. Mock getInvoiceStatus response
      global.fetch = async () =>
        new Response(
          JSON.stringify({
            invoiceId: "inv_stat",
            status: "hold",
            amount: 5000,
            ccy: 980,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );

      const statusRes = await transport.getInvoiceStatus("inv_stat");
      expect(statusRes.status).toBe("hold");
      expect(statusRes.amount).toBe(5000);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
