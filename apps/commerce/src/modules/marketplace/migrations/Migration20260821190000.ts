import { Migration } from "@mikro-orm/migrations";

/**
 * Additive upgrade for catalog listing price authority.
 *
 * Migration20260821000000 is already applied in some development/test
 * databases and must remain immutable. Keep this schema change in a new
 * migration so existing databases receive the column as well.
 */
export class Migration20260821190000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "catalog_listing"
        ADD COLUMN IF NOT EXISTS "price_uah" integer NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "catalog_listing"
        DROP COLUMN IF EXISTS "price_uah";
    `);
  }
}
