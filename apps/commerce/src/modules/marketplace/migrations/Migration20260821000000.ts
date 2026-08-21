import { Migration } from "@mikro-orm/migrations";

export class Migration20260821000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "parent_order"
        ADD COLUMN IF NOT EXISTS "order_number" text;

      UPDATE "parent_order"
      SET "order_number" = 'SYN-' || "id"
      WHERE "order_number" IS NULL;

      ALTER TABLE "parent_order"
        ALTER COLUMN "order_number" SET NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_parent_order_order_number"
        ON "parent_order" ("order_number");

      -- NULL provenance is intentional: legacy rows are not reclassified without an explicit source decision.
      ALTER TABLE "parent_order"
        ADD COLUMN IF NOT EXISTS "mode" text,
        ADD COLUMN IF NOT EXISTS "lifecycle_status" text NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "payment_status" text NOT NULL DEFAULT 'not_applicable',
        ADD COLUMN IF NOT EXISTS "payout_status" text NOT NULL DEFAULT 'not_applicable';

      UPDATE "parent_order"
      SET "lifecycle_status" = CASE
        WHEN "status" IN ('canceled', 'cancelled') THEN 'cancelled'
        WHEN "status" IN ('paid', 'processing') THEN 'processing'
        WHEN "status" = 'refunded' THEN 'cancelled'
        ELSE 'pending'
      END
      WHERE "lifecycle_status" = 'pending';
      UPDATE "parent_order"
      SET "payment_status" = CASE
        WHEN "status" = 'paid' THEN 'captured'
        WHEN "status" = 'refunded' THEN 'refunded'
        WHEN "status" = 'pending' THEN 'pending'
        ELSE 'not_applicable'
      END
      WHERE "payment_status" = 'not_applicable';
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CK_parent_order_mode'
        ) THEN
          ALTER TABLE "parent_order"
            ADD CONSTRAINT "CK_parent_order_mode"
            CHECK ("mode" IS NULL OR "mode" IN ('synthetic', 'live'));
        END IF;
      END $$;


      ALTER TABLE "vendor_child_order"
        ADD COLUMN IF NOT EXISTS "fulfillment_status" text NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "payout_status" text NOT NULL DEFAULT 'not_applicable';

      UPDATE "vendor_child_order"
      SET "fulfillment_status" = CASE
        WHEN "status" = 'shipped' THEN 'shipped'
        WHEN "status" = 'delivered' THEN 'delivered'
        WHEN "status" IN ('canceled', 'cancelled') THEN 'cancelled'
        ELSE 'pending'
      END
      WHERE "fulfillment_status" = 'pending';

      CREATE TABLE IF NOT EXISTS "order_line" (
        "id" text NOT NULL,
        "child_order_id" text NOT NULL,
        "parent_order_id" text NOT NULL,
        "vendor_id" text NOT NULL,
        "product_id" text NOT NULL,
        "catalog_listing_id" text NULL,
        "product_name_snapshot" text NOT NULL,
        "unit_price_uah" integer NOT NULL,
        "quantity" integer NOT NULL,
        "line_total_uah" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_order_line_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_line_child_order_id" FOREIGN KEY ("child_order_id") REFERENCES "vendor_child_order" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_line_parent_order_id" FOREIGN KEY ("parent_order_id") REFERENCES "parent_order" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_line_vendor_id" FOREIGN KEY ("vendor_id") REFERENCES "vendor" ("id") ON DELETE RESTRICT,
        CONSTRAINT "CK_order_line_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "CK_order_line_amounts_non_negative" CHECK ("unit_price_uah" >= 0 AND "line_total_uah" >= 0)
      );

      CREATE INDEX IF NOT EXISTS "IDX_order_line_parent_order_id" ON "order_line" ("parent_order_id");
      CREATE INDEX IF NOT EXISTS "IDX_order_line_child_order_id" ON "order_line" ("child_order_id");
      CREATE INDEX IF NOT EXISTS "IDX_order_line_product_id" ON "order_line" ("product_id");

      CREATE TABLE IF NOT EXISTS "shipment" (
        "id" text NOT NULL,
        "child_order_id" text NOT NULL,
        "carrier" text NOT NULL DEFAULT 'nova_poshta',
        "external_reference" text NULL,
        "ttn_number" text NULL,
        "source" text NOT NULL DEFAULT 'synthetic',
        "normalized_status" text NOT NULL DEFAULT 'created',
        "last_synced_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_shipment_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shipment_child_order_id" FOREIGN KEY ("child_order_id") REFERENCES "vendor_child_order" ("id") ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS "IDX_shipment_child_order_id" ON "shipment" ("child_order_id");
      CREATE INDEX IF NOT EXISTS "IDX_shipment_ttn_number" ON "shipment" ("ttn_number");

      CREATE TABLE IF NOT EXISTS "tracking_event" (
        "id" text NOT NULL,
        "shipment_id" text NOT NULL,
        "provider_status_code" integer NULL,
        "normalized_status" text NOT NULL,
        "label" text NOT NULL,
        "occurred_at" timestamptz NOT NULL,
        "source" text NOT NULL,
        "payload_hash" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_tracking_event_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tracking_event_shipment_id" FOREIGN KEY ("shipment_id") REFERENCES "shipment" ("id") ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS "IDX_tracking_event_shipment_time" ON "tracking_event" ("shipment_id", "occurred_at");

      CREATE TABLE IF NOT EXISTS "product_review" (
        "id" text NOT NULL,
        "customer_id" text NOT NULL,
        "order_line_id" text NOT NULL,
        "parent_order_id" text NOT NULL,
        "child_order_id" text NOT NULL,
        "product_id" text NOT NULL,
        "vendor_id" text NOT NULL,
        "mode" text NULL,
        "rating" integer NOT NULL,
        "body" text NOT NULL,
        "display_name" text NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "moderator_id" text NULL,
        "moderation_rationale" text NULL,
        "reviewed_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_product_review_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_review_order_line_id" FOREIGN KEY ("order_line_id") REFERENCES "order_line" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_product_review_parent_order_id" FOREIGN KEY ("parent_order_id") REFERENCES "parent_order" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_product_review_child_order_id" FOREIGN KEY ("child_order_id") REFERENCES "vendor_child_order" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_product_review_vendor_id" FOREIGN KEY ("vendor_id") REFERENCES "vendor" ("id") ON DELETE RESTRICT,
        CONSTRAINT "UQ_product_review_order_line_id" UNIQUE ("order_line_id"),
        CONSTRAINT "CK_product_review_rating" CHECK ("rating" BETWEEN 1 AND 5),
        CONSTRAINT "CK_product_review_body_non_empty" CHECK (length(trim("body")) > 0)
      );
      -- Reviews with unknown provenance stay hidden from the public synthetic projection.
      ALTER TABLE "product_review"
        ADD COLUMN IF NOT EXISTS "mode" text NULL;
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CK_product_review_mode'
        ) THEN
          ALTER TABLE "product_review"
            ADD CONSTRAINT "CK_product_review_mode"
            CHECK ("mode" IS NULL OR "mode" IN ('synthetic', 'live'));
        END IF;
      END $$;



      CREATE INDEX IF NOT EXISTS "IDX_product_review_product_status" ON "product_review" ("product_id", "status");
      CREATE INDEX IF NOT EXISTS "IDX_product_review_vendor_status" ON "product_review" ("vendor_id", "status");
      CREATE INDEX IF NOT EXISTS "IDX_product_review_customer_id" ON "product_review" ("customer_id");

      CREATE TABLE IF NOT EXISTS "review_moderation_decision" (
        "id" text NOT NULL,
        "review_id" text NOT NULL,
        "reviewer_id" text NOT NULL,
        "target_status" text NOT NULL,
        "rationale" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_review_moderation_decision_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_review_moderation_decision_review_id" FOREIGN KEY ("review_id") REFERENCES "product_review" ("id") ON DELETE CASCADE,
        CONSTRAINT "CK_review_moderation_decision_rationale" CHECK (length(trim("rationale")) > 0)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_review_moderation_decision_review_id"
        ON "review_moderation_decision" ("review_id");

      CREATE INDEX IF NOT EXISTS "IDX_review_moderation_decision_review_id" ON "review_moderation_decision" ("review_id", "created_at");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "review_moderation_decision";
      DROP TABLE IF EXISTS "product_review";
      DROP TABLE IF EXISTS "tracking_event";
      DROP TABLE IF EXISTS "shipment";
      DROP TABLE IF EXISTS "order_line";
      ALTER TABLE "vendor_child_order"
        DROP COLUMN IF EXISTS "payout_status",
        DROP COLUMN IF EXISTS "fulfillment_status";
      ALTER TABLE "parent_order"
        DROP COLUMN IF EXISTS "payout_status",
        DROP COLUMN IF EXISTS "payment_status",
        DROP COLUMN IF EXISTS "lifecycle_status",
        DROP COLUMN IF EXISTS "mode";
      DROP INDEX IF EXISTS "UQ_parent_order_order_number";
      ALTER TABLE "parent_order"
        DROP COLUMN IF EXISTS "order_number";
    `);
  }
}
