import { Migration } from "@mikro-orm/migrations";

export class Migration20260727200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "artisan_application" (
        "id" text NOT NULL,
        "name" text NOT NULL,
        "workshop_name" text NOT NULL,
        "category" text NOT NULL,
        "description" text NOT NULL,
        "email" text NOT NULL,
        "phone" text NOT NULL,
        "portfolio_url" text NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "reviewer_notes" text NULL,
        "reviewed_by" text NULL,
        "reviewed_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_artisan_application_id" PRIMARY KEY ("id")
      );

      CREATE INDEX IF NOT EXISTS "IDX_artisan_application_status" ON "artisan_application" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_artisan_application_email" ON "artisan_application" ("email");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "artisan_application" CASCADE;
    `);
  }
}
