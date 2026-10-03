import crypto from "node:crypto";
import type {
  WebhookEventLedger,
  LedgerInvoiceRecord,
  LedgerEventRecord,
  MedusaPaymentStatus,
} from "./monobank-payment-adapter.js";

export type PostgresQueryResult<R = Record<string, unknown>> = {
  rows: R[];
  rowCount: number | null;
};

export type PostgresClientLike = {
  query<R = Record<string, unknown>>(
    queryText: string,
    values?: unknown[],
  ): Promise<PostgresQueryResult<R>>;
  release(err?: Error | boolean): void;
};

export type PostgresPoolLike = {
  query<R = Record<string, unknown>>(
    queryText: string,
    values?: unknown[],
  ): Promise<PostgresQueryResult<R>>;
  connect(): Promise<PostgresClientLike>;
};

type DbInvoiceRow = {
  invoice_id: string;
  order_id: string;
  amount_kopecks: number;
  currency: number;
  payment_type: string;
  status: string;
  created_at: string | Date;
  updated_at: string | Date;
};

type DbEventRow = {
  id: string;
  provider: string;
  invoice_id: string;
  status: string;
  modified_date: string;
  payload_hash: string;
  raw_payload: string;
  received_at: string | Date;
  processed_at: string | Date | null;
};

function mapInvoiceRow(row: DbInvoiceRow): LedgerInvoiceRecord {
  return {
    invoiceId: row.invoice_id,
    orderId: row.order_id,
    amountKopecks: Number(row.amount_kopecks),
    currency: Number(row.currency),
    paymentType: row.payment_type as "hold",
    status: row.status as MedusaPaymentStatus,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * PostgreSQL persistent webhook event ledger (ADR 0014 Slice 2).
 *
 * Enforces idempotency, payload hash conflict detection, and transactional
 * state updates using PostgreSQL transactions and composite unique index.
 */
export class PostgresWebhookEventLedger implements WebhookEventLedger {
  private inMemoryLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly pool: PostgresPoolLike,
    private readonly providerName: string = "monobank",
  ) {}

  async acquireLock(invoiceId: string): Promise<() => void> {
    while (this.inMemoryLocks.has(invoiceId)) {
      await this.inMemoryLocks.get(invoiceId);
    }
    let release!: () => void;
    const lockPromise = new Promise<void>((res) => {
      release = res;
    });
    this.inMemoryLocks.set(invoiceId, lockPromise);
    return () => {
      this.inMemoryLocks.delete(invoiceId);
      release();
    };
  }

  async getInvoice(invoiceId: string): Promise<LedgerInvoiceRecord | null> {
    const res = await this.pool.query<DbInvoiceRow>(
      `SELECT invoice_id, order_id, amount_kopecks, currency, payment_type, status, created_at, updated_at
       FROM "payment_invoice_record"
       WHERE "invoice_id" = $1
       LIMIT 1`,
      [invoiceId],
    );

    if (res.rows.length === 0) {
      return null;
    }
    return mapInvoiceRow(res.rows[0]);
  }

  async saveInvoice(record: LedgerInvoiceRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO "payment_invoice_record" (
         "invoice_id", "order_id", "amount_kopecks", "currency", "payment_type", "status", "created_at", "updated_at"
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT ("invoice_id") DO UPDATE SET
         "status" = EXCLUDED."status",
         "updated_at" = EXCLUDED."updated_at"`,
      [
        record.invoiceId,
        record.orderId,
        record.amountKopecks,
        record.currency,
        record.paymentType,
        record.status,
        record.createdAt,
        record.updatedAt,
      ],
    );
  }

  async updateInvoiceStatus(
    invoiceId: string,
    newStatus: MedusaPaymentStatus,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE "payment_invoice_record"
       SET "status" = $1, "updated_at" = NOW()
       WHERE "invoice_id" = $2`,
      [newStatus, invoiceId],
    );
  }

  async atomicApplyWebhook(
    event: LedgerEventRecord,
    nextStatus: MedusaPaymentStatus,
  ): Promise<{
    applied: boolean;
    isDuplicate: boolean;
    isHashConflict?: boolean;
    currentStatus: MedusaPaymentStatus;
    error?: string;
  }> {
    const memoryRelease = await this.acquireLock(event.invoiceId);
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Lock and fetch current invoice row
      const invoiceRes = await client.query<DbInvoiceRow>(
        `SELECT invoice_id, order_id, amount_kopecks, currency, payment_type, status, created_at, updated_at
         FROM "payment_invoice_record"
         WHERE "invoice_id" = $1
         FOR UPDATE`,
        [event.invoiceId],
      );

      if (invoiceRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return {
          applied: false,
          isDuplicate: false,
          currentStatus: nextStatus,
          error: `Invoice ${event.invoiceId} does not exist in ledger`,
        };
      }

      const invoice = mapInvoiceRow(invoiceRes.rows[0]);

      // 2. Check for duplicate event record
      const eventRes = await client.query<DbEventRow>(
        `SELECT id, provider, invoice_id, status, modified_date, payload_hash, raw_payload, received_at, processed_at
         FROM "payment_webhook_event"
         WHERE "invoice_id" = $1 AND "status" = $2 AND "modified_date" = $3
         LIMIT 1`,
        [event.invoiceId, event.status, event.modifiedDate],
      );

      if (eventRes.rows.length > 0) {
        const existing = eventRes.rows[0];
        await client.query("ROLLBACK");

        if (existing.payload_hash !== event.payloadHash) {
          return {
            applied: false,
            isDuplicate: false,
            isHashConflict: true,
            currentStatus: invoice.status,
            error: `Payload hash conflict detected for invoice ${event.invoiceId}, status ${event.status}`,
          };
        }

        return {
          applied: false,
          isDuplicate: true,
          currentStatus: invoice.status,
        };
      }

      // 3. Insert new event record
      const eventId = `pwe_${crypto.randomUUID()}`;
      try {
        await client.query(
          `INSERT INTO "payment_webhook_event" (
             "id", "provider", "invoice_id", "status", "modified_date", "payload_hash", "raw_payload", "received_at", "processed_at"
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            eventId,
            this.providerName,
            event.invoiceId,
            event.status,
            event.modifiedDate,
            event.payloadHash,
            event.rawPayload,
            event.receivedAt,
          ],
        );
      } catch (insertErr: unknown) {
        // Handle Postgres unique constraint violation (code 23505)
        if (
          insertErr !== null &&
          typeof insertErr === "object" &&
          "code" in insertErr &&
          insertErr.code === "23505"
        ) {
          await client.query("ROLLBACK");
          // Re-fetch to evaluate if it's identical or a hash conflict
          const conflictRes = await this.pool.query<DbEventRow>(
            `SELECT payload_hash FROM "payment_webhook_event"
             WHERE "invoice_id" = $1 AND "status" = $2 AND "modified_date" = $3
             LIMIT 1`,
            [event.invoiceId, event.status, event.modifiedDate],
          );

          if (
            conflictRes.rows.length > 0 &&
            conflictRes.rows[0].payload_hash !== event.payloadHash
          ) {
            return {
              applied: false,
              isDuplicate: false,
              isHashConflict: true,
              currentStatus: invoice.status,
              error: `Payload hash conflict on duplicate insertion for invoice ${event.invoiceId}`,
            };
          }

          return {
            applied: false,
            isDuplicate: true,
            currentStatus: invoice.status,
          };
        }
        throw insertErr;
      }

      // 4. Update invoice status
      await client.query(
        `UPDATE "payment_invoice_record"
         SET "status" = $1, "updated_at" = NOW()
         WHERE "invoice_id" = $2`,
        [nextStatus, event.invoiceId],
      );

      await client.query("COMMIT");

      return {
        applied: true,
        isDuplicate: false,
        currentStatus: nextStatus,
      };
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore rollback errors if client was aborted
      }
      throw err;
    } finally {
      client.release();
      memoryRelease();
    }
  }
}
