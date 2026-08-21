import { Migration } from "@mikro-orm/migrations";

/**
 * Enforce the tenant invariant at the database boundary.
 *
 * The application-level membership lookup remains a friendly validation, but
 * this partial unique index closes the concurrent-create race and excludes
 * soft-deleted memberships from the active identity namespace.
 */
export class Migration20260821213000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_vendor_member_active_auth_identity_id"
        ON "vendor_member" ("auth_identity_id")
        WHERE "active" = true AND "deleted_at" IS NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      DROP INDEX IF EXISTS "UQ_vendor_member_active_auth_identity_id";
    `);
  }
}
