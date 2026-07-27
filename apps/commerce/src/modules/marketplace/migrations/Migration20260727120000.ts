import { Migration } from "@mikro-orm/migrations";

export class Migration20260727120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "vendor_verification" (
        "id" text NOT NULL,
        "vendor_id" text NOT NULL,
        "tax_identifier" text NOT NULL,
        "legal_name" text NOT NULL,
        "legal_address" text NULL,
        "verification_status" text NOT NULL DEFAULT 'pending',
        "reviewed_by" text NULL,
        "reviewed_at" timestamptz NULL,
        "notes" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_vendor_verification_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vendor_verification_vendor_id" FOREIGN KEY ("vendor_id") REFERENCES "vendor" ("id") ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "compliance_document" (
        "id" text NOT NULL,
        "vendor_id" text NOT NULL,
        "owner_type" text NOT NULL DEFAULT 'vendor',
        "owner_id" text NOT NULL,
        "document_type" text NOT NULL,
        "document_number" text NOT NULL,
        "issuer" text NULL,
        "issued_at" timestamptz NULL,
        "expires_at" timestamptz NULL,
        "file_url" text NOT NULL,
        "status" text NOT NULL DEFAULT 'submitted',
        "reviewer_comment" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_compliance_document_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_compliance_document_vendor_id" FOREIGN KEY ("vendor_id") REFERENCES "vendor" ("id") ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "product_claim" (
        "id" text NOT NULL,
        "catalog_listing_id" text NOT NULL,
        "claim_type" text NOT NULL,
        "public_badge_text" text NOT NULL,
        "evidence_document_id" text NULL,
        "review_status" text NOT NULL DEFAULT 'draft',
        "public_visibility" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_product_claim_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_claim_listing_id" FOREIGN KEY ("catalog_listing_id") REFERENCES "catalog_listing" ("id") ON DELETE CASCADE
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "product_claim";
      DROP TABLE IF EXISTS "compliance_document";
      DROP TABLE IF EXISTS "vendor_verification";
    `);
  }
}
