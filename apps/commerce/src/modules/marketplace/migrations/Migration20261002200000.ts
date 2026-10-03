import { Migration } from "@mikro-orm/migrations";

/**
 * ADR 0014 Slice 2: Payment Webhook Events Ledger and Invoices.
 *
 * Provides persistent database backing for webhook idempotency, replay protection,
 * and invoice tracking with composite unique index (invoice_id, status, modified_date).
 */
export class Migration20261002200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "payment_invoice_record" (
        "invoice_id" text NOT NULL,
        "order_id" text NOT NULL,
        "amount_kopecks" integer NOT NULL,
        "currency" integer NOT NULL,
        "payment_type" text NOT NULL,
        "status" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_invoice_record" PRIMARY KEY ("invoice_id")
      );

      CREATE INDEX IF NOT EXISTS "IDX_payment_invoice_record_order_id"
        ON "payment_invoice_record" ("order_id");

      CREATE TABLE IF NOT EXISTS "payment_webhook_event" (
        "id" text NOT NULL,
        "provider" text NOT NULL,
        "invoice_id" text NOT NULL,
        "status" text NOT NULL,
        "modified_date" text NOT NULL,
        "payload_hash" text NOT NULL,
        "raw_payload" text NOT NULL,
        "received_at" timestamptz NOT NULL DEFAULT now(),
        "processed_at" timestamptz,
        CONSTRAINT "PK_payment_webhook_event" PRIMARY KEY ("id")
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payment_webhook_event_invoice_status_date"
        ON "payment_webhook_event" ("invoice_id", "status", "modified_date");

      CREATE INDEX IF NOT EXISTS "IDX_payment_webhook_event_invoice_id"
        ON "payment_webhook_event" ("invoice_id");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "payment_webhook_event";
      DROP TABLE IF EXISTS "payment_invoice_record";
    `);
  }
}
