import { Migration } from "@mikro-orm/migrations";

export class Migration20260727000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "vendor" (
        "id" text NOT NULL,
        "handle" text NOT NULL,
        "name" text NOT NULL,
        "status" text NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_vendor_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vendor_handle" UNIQUE ("handle")
      );

      CREATE TABLE IF NOT EXISTS "vendor_member" (
        "id" text NOT NULL,
        "vendor_id" text NOT NULL,
        "auth_identity_id" text NOT NULL,
        "role" text NOT NULL DEFAULT 'owner',
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_vendor_member_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vendor_member_vendor_id" FOREIGN KEY ("vendor_id") REFERENCES "vendor" ("id") ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "vendor_profile" (
        "id" text NOT NULL,
        "vendor_id" text NOT NULL,
        "display_name" text NOT NULL,
        "summary" text NULL,
        "location" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_vendor_profile_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vendor_profile_vendor_id" FOREIGN KEY ("vendor_id") REFERENCES "vendor" ("id") ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "catalog_listing" (
        "id" text NOT NULL,
        "vendor_id" text NOT NULL,
        "title" text NOT NULL,
        "description" text NOT NULL,
        "state" text NOT NULL DEFAULT 'draft',
        "visibility" text NOT NULL DEFAULT 'internal',
        "synthetic" boolean NOT NULL DEFAULT false,
        "submitted_at" timestamptz NULL,
        "published_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_catalog_listing_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_catalog_listing_vendor_id" FOREIGN KEY ("vendor_id") REFERENCES "vendor" ("id") ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "moderation_decision" (
        "id" text NOT NULL,
        "listing_id" text NOT NULL,
        "reviewer_id" text NOT NULL,
        "from_state" text NOT NULL,
        "to_state" text NOT NULL,
        "rationale" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_moderation_decision_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_moderation_decision_listing_id" FOREIGN KEY ("listing_id") REFERENCES "catalog_listing" ("id") ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "staff_role_assignment" (
        "id" text NOT NULL,
        "user_id" text NOT NULL,
        "role" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_staff_role_assignment_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_staff_role_assignment_user_id" UNIQUE ("user_id")
      );

      CREATE TABLE IF NOT EXISTS "audit_event" (
        "id" text NOT NULL,
        "actor_id" text NOT NULL,
        "actor_type" text NOT NULL,
        "action" text NOT NULL,
        "tenant_id" text NULL,
        "listing_id" text NULL,
        "correlation_id" text NULL,
        "payload" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_audit_event_id" PRIMARY KEY ("id")
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "audit_event";
      DROP TABLE IF EXISTS "staff_role_assignment";
      DROP TABLE IF EXISTS "moderation_decision";
      DROP TABLE IF EXISTS "catalog_listing";
      DROP TABLE IF EXISTS "vendor_profile";
      DROP TABLE IF EXISTS "vendor_member";
      DROP TABLE IF EXISTS "vendor";
    `);
  }
}
