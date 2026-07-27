import { Migration } from "@mikro-orm/migrations";

export class Migration20260727180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "parent_order" (
        "id" text NOT NULL,
        "customer_id" text NOT NULL,
        "total_amount_uah" integer NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "payment_transaction_id" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_parent_order_id" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "vendor_child_order" (
        "id" text NOT NULL,
        "parent_order_id" text NOT NULL,
        "vendor_id" text NOT NULL,
        "gross_amount_uah" integer NOT NULL,
        "commission_amount_uah" integer NOT NULL,
        "net_payable_uah" integer NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "ttn_number" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_vendor_child_order_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vendor_child_order_parent_id" FOREIGN KEY ("parent_order_id") REFERENCES "parent_order" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vendor_child_order_vendor_id" FOREIGN KEY ("vendor_id") REFERENCES "vendor" ("id") ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "vendor_payable" (
        "id" text NOT NULL,
        "vendor_id" text NOT NULL,
        "child_order_id" text NOT NULL,
        "amount_uah" integer NOT NULL,
        "status" text NOT NULL DEFAULT 'unsettled',
        "settlement_batch_id" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_vendor_payable_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vendor_payable_vendor_id" FOREIGN KEY ("vendor_id") REFERENCES "vendor" ("id") ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "settlement_batch" (
        "id" text NOT NULL,
        "vendor_id" text NOT NULL,
        "total_amount_uah" integer NOT NULL,
        "status" text NOT NULL DEFAULT 'draft',
        "processed_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_settlement_batch_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_settlement_batch_vendor_id" FOREIGN KEY ("vendor_id") REFERENCES "vendor" ("id") ON DELETE CASCADE
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "settlement_batch";
      DROP TABLE IF EXISTS "vendor_payable";
      DROP TABLE IF EXISTS "vendor_child_order";
      DROP TABLE IF EXISTS "parent_order";
    `);
  }
}
