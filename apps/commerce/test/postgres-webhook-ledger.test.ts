import { describe, expect, it, vi } from "vitest";
import {
  PostgresWebhookEventLedger,
  type PostgresPoolLike,
  type PostgresClientLike,
} from "../src/services/postgres-webhook-ledger.js";
import type { LedgerInvoiceRecord } from "../src/services/monobank-payment-adapter.js";

function createMockPostgresPool() {
  const invoiceDb = new Map<string, Record<string, unknown>>();
  const eventDb = new Map<string, Record<string, unknown>>();

  const client: PostgresClientLike = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      const trimmed = sql.trim().toUpperCase();

      if (
        trimmed.startsWith("BEGIN") ||
        trimmed.startsWith("COMMIT") ||
        trimmed.startsWith("ROLLBACK")
      ) {
        return { rows: [], rowCount: 0 };
      }

      if (
        trimmed.includes('FROM "PAYMENT_INVOICE_RECORD"') &&
        trimmed.includes("FOR UPDATE")
      ) {
        const id = params[0];
        const row = invoiceDb.get(id);
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }

      if (
        trimmed.includes('FROM "PAYMENT_WEBHOOK_EVENT"') &&
        trimmed.includes("LIMIT 1")
      ) {
        const [invoiceId, status, modifiedDate] = params;
        const key = `${invoiceId}:${status}:${modifiedDate}`;
        const row = eventDb.get(key);
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }

      if (trimmed.startsWith('INSERT INTO "PAYMENT_WEBHOOK_EVENT"')) {
        const [
          ,
          ,
          invoiceId,
          status,
          modifiedDate,
          payloadHash,
          rawPayload,
          receivedAt,
        ] = params;
        const key = `${invoiceId}:${status}:${modifiedDate}`;
        if (eventDb.has(key)) {
          const err = Object.assign(
            new Error("duplicate key value violates unique constraint"),
            { code: "23505" },
          );
          throw err;
        }
        const row = {
          id: params[0],
          provider: params[1],
          invoice_id: invoiceId,
          status,
          modified_date: modifiedDate,
          payload_hash: payloadHash,
          raw_payload: rawPayload,
          received_at: receivedAt,
          processed_at: new Date(),
        };
        eventDb.set(key, row);
        return { rows: [row], rowCount: 1 };
      }

      if (trimmed.startsWith('UPDATE "PAYMENT_INVOICE_RECORD"')) {
        const [newStatus, invoiceId] = params;
        const inv = invoiceDb.get(invoiceId);
        if (inv) {
          inv.status = newStatus;
          inv.updated_at = new Date();
        }
        return { rows: [], rowCount: inv ? 1 : 0 };
      }

      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
  };

  const pool: PostgresPoolLike = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      const trimmed = sql.trim().toUpperCase();

      if (
        trimmed.includes('FROM "PAYMENT_INVOICE_RECORD"') &&
        trimmed.includes("LIMIT 1")
      ) {
        const id = params[0];
        const row = invoiceDb.get(id);
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }

      if (trimmed.startsWith('INSERT INTO "PAYMENT_INVOICE_RECORD"')) {
        const [
          invoice_id,
          order_id,
          amount_kopecks,
          currency,
          payment_type,
          status,
          created_at,
          updated_at,
        ] = params;
        const row = {
          invoice_id,
          order_id,
          amount_kopecks,
          currency,
          payment_type,
          status,
          created_at,
          updated_at,
        };
        invoiceDb.set(invoice_id, row);
        return { rows: [row], rowCount: 1 };
      }

      if (trimmed.startsWith('UPDATE "PAYMENT_INVOICE_RECORD"')) {
        const [newStatus, invoiceId] = params;
        const inv = invoiceDb.get(invoiceId);
        if (inv) {
          inv.status = newStatus;
          inv.updated_at = new Date();
        }
        return { rows: [], rowCount: inv ? 1 : 0 };
      }

      if (trimmed.includes('FROM "PAYMENT_WEBHOOK_EVENT"')) {
        const [invoiceId, status, modifiedDate] = params;
        const key = `${invoiceId}:${status}:${modifiedDate}`;
        const row = eventDb.get(key);
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }

      return { rows: [], rowCount: 0 };
    }),
    connect: vi.fn(async () => client),
  };

  return { pool, client, invoiceDb, eventDb };
}

describe("PostgresWebhookEventLedger (ADR 0014 Slice 2)", () => {
  it("saves and retrieves invoice record correctly", async () => {
    const { pool } = createMockPostgresPool();
    const ledger = new PostgresWebhookEventLedger(pool);

    const record: LedgerInvoiceRecord = {
      invoiceId: "inv_123",
      orderId: "order_abc",
      amountKopecks: 45000,
      currency: 980,
      paymentType: "hold",
      status: "pending",
      createdAt: new Date("2026-10-02T10:00:00Z"),
      updatedAt: new Date("2026-10-02T10:00:00Z"),
    };

    await ledger.saveInvoice(record);

    const retrieved = await ledger.getInvoice("inv_123");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.invoiceId).toBe("inv_123");
    expect(retrieved?.orderId).toBe("order_abc");
    expect(retrieved?.amountKopecks).toBe(45000);
    expect(retrieved?.status).toBe("pending");
  });

  it("updates invoice status directly", async () => {
    const { pool } = createMockPostgresPool();
    const ledger = new PostgresWebhookEventLedger(pool);

    const record: LedgerInvoiceRecord = {
      invoiceId: "inv_456",
      orderId: "order_def",
      amountKopecks: 60000,
      currency: 980,
      paymentType: "hold",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await ledger.saveInvoice(record);
    await ledger.updateInvoiceStatus("inv_456", "authorized");

    const updated = await ledger.getInvoice("inv_456");
    expect(updated?.status).toBe("authorized");
  });

  it("rejects webhook if invoice does not exist", async () => {
    const { pool } = createMockPostgresPool();
    const ledger = new PostgresWebhookEventLedger(pool);

    const result = await ledger.atomicApplyWebhook(
      {
        invoiceId: "nonexistent",
        status: "hold",
        modifiedDate: "2026-10-02T12:00:00Z",
        payloadHash: "hash_abc",
        rawPayload: "{}",
        receivedAt: new Date(),
      },
      "authorized",
    );

    expect(result.applied).toBe(false);
    expect(result.isDuplicate).toBe(false);
    expect(result.error).toContain("does not exist in ledger");
  });

  it("applies new webhook event atomically within a transaction", async () => {
    const { pool, client } = createMockPostgresPool();
    const ledger = new PostgresWebhookEventLedger(pool);

    await ledger.saveInvoice({
      invoiceId: "inv_atomic",
      orderId: "order_1",
      amountKopecks: 10000,
      currency: 980,
      paymentType: "hold",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await ledger.atomicApplyWebhook(
      {
        invoiceId: "inv_atomic",
        status: "hold",
        modifiedDate: "2026-10-02T12:00:00Z",
        payloadHash: "hash_first",
        rawPayload: '{"status":"hold"}',
        receivedAt: new Date(),
      },
      "authorized",
    );

    expect(result.applied).toBe(true);
    expect(result.isDuplicate).toBe(false);
    expect(result.currentStatus).toBe("authorized");

    expect(client.query).toHaveBeenCalledWith("BEGIN");
    expect(client.query).toHaveBeenCalledWith("COMMIT");

    const updatedInvoice = await ledger.getInvoice("inv_atomic");
    expect(updatedInvoice?.status).toBe("authorized");
  });

  it("detects duplicate webhook and returns idempotent success without double mutation", async () => {
    const { pool } = createMockPostgresPool();
    const ledger = new PostgresWebhookEventLedger(pool);

    await ledger.saveInvoice({
      invoiceId: "inv_dup",
      orderId: "order_dup",
      amountKopecks: 15000,
      currency: 980,
      paymentType: "hold",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const event = {
      invoiceId: "inv_dup",
      status: "hold" as const,
      modifiedDate: "2026-10-02T13:00:00Z",
      payloadHash: "identical_hash",
      rawPayload: '{"status":"hold"}',
      receivedAt: new Date(),
    };

    const first = await ledger.atomicApplyWebhook(event, "authorized");
    expect(first.applied).toBe(true);
    expect(first.isDuplicate).toBe(false);

    // Second delivery of the identical event
    const second = await ledger.atomicApplyWebhook(event, "authorized");
    expect(second.applied).toBe(false);
    expect(second.isDuplicate).toBe(true);
    expect(second.currentStatus).toBe("authorized");
  });

  it("flags payload hash conflict on identical key with divergent payload", async () => {
    const { pool } = createMockPostgresPool();
    const ledger = new PostgresWebhookEventLedger(pool);

    await ledger.saveInvoice({
      invoiceId: "inv_conflict",
      orderId: "order_conflict",
      amountKopecks: 20000,
      currency: 980,
      paymentType: "hold",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // First delivery
    await ledger.atomicApplyWebhook(
      {
        invoiceId: "inv_conflict",
        status: "hold",
        modifiedDate: "2026-10-02T14:00:00Z",
        payloadHash: "hash_original",
        rawPayload: '{"status":"hold","amount":20000}',
        receivedAt: new Date(),
      },
      "authorized",
    );

    // Tampered or divergent second delivery with same modifiedDate but different payloadHash
    const conflictResult = await ledger.atomicApplyWebhook(
      {
        invoiceId: "inv_conflict",
        status: "hold",
        modifiedDate: "2026-10-02T14:00:00Z",
        payloadHash: "hash_divergent",
        rawPayload: '{"status":"hold","amount":99999}',
        receivedAt: new Date(),
      },
      "authorized",
    );

    expect(conflictResult.applied).toBe(false);
    expect(conflictResult.isDuplicate).toBe(false);
    expect(conflictResult.isHashConflict).toBe(true);
    expect(conflictResult.error).toContain("Payload hash conflict detected");
  });
});
