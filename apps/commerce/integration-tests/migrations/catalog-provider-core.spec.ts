import { Client } from "pg";

const EXPECTED_TABLES = [
  "vendor",
  "vendor_member",
  "catalog_listing",
  "moderation_decision",
  "audit_event",
  "parent_order",
  "vendor_child_order",
  "order_line",
  "shipment",
  "tracking_event",
  "product_review",
  "review_moderation_decision",
] as const;

const EXPECTED_CONSTRAINTS = [
  "CK_parent_order_mode",
  "CK_product_review_mode",
  "FK_order_line_child_order_id",
  "FK_order_line_parent_order_id",
  "FK_order_line_vendor_id",
  "FK_product_review_child_order_id",
  "FK_product_review_order_line_id",
  "FK_product_review_parent_order_id",
  "FK_product_review_vendor_id",
  "UQ_product_review_order_line_id",
] as const;

const EXPECTED_INDEXES = [
  "UQ_parent_order_order_number",
  "UQ_review_moderation_decision_review_id",
  "UQ_vendor_member_active_auth_identity_id",
] as const;

describe("Migration contract (catalog-provider-core)", () => {
  const dbUrl = process.env["DATABASE_URL"] || "";

  beforeAll(() => {
    if (
      !dbUrl.endsWith("/life_medusa_migration_test") &&
      !dbUrl.includes("life_medusa_migration_test")
    ) {
      throw new Error(
        `[test:migrations] Refusing to run migration test on database URL '${dbUrl}'. Expected database 'life_medusa_migration_test'.`,
      );
    }
  });

  it("uses the isolated migration database role", async () => {
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    try {
      const res = await client.query(
        "SELECT current_database(), current_user;",
      );
      const row = res.rows[0];
      expect(row.current_database).toBe("life_medusa_migration_test");
      expect(row.current_user).toBe("life_medusa_migration_test");
    } finally {
      await client.end();
    }
  });

  it("contains the complete marketplace order, shipment, and review schema", async () => {
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    try {
      const tables = await client.query<{ table_name: string }>(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
        ORDER BY table_name;
      `,
        [EXPECTED_TABLES],
      );

      expect(tables.rows.map((row) => row.table_name)).toEqual(
        [...EXPECTED_TABLES].sort(),
      );

      const listingColumns = await client.query<{ column_name: string }>(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'catalog_listing'
          AND column_name = 'price_uah';
      `,
      );
      expect(listingColumns.rows.map((row) => row.column_name)).toEqual([
        "price_uah",
      ]);

      const constraints = await client.query<{ conname: string }>(
        `
        SELECT conname
        FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace
          AND conname = ANY($1::text[])
        ORDER BY conname;
      `,
        [EXPECTED_CONSTRAINTS],
      );

      expect(constraints.rows.map((row) => row.conname)).toEqual(
        [...EXPECTED_CONSTRAINTS].sort(),
      );
      const indexes = await client.query<{ indexname: string }>(
        `
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = ANY($1::text[])
        ORDER BY indexname;
      `,
        [EXPECTED_INDEXES],
      );

      expect(indexes.rows.map((row) => row.indexname)).toEqual(
        [...EXPECTED_INDEXES].sort(),
      );

      const membershipIndex = await client.query<{
        indisunique: boolean;
        predicate: string | null;
      }>(
        `
        SELECT
          index_class.relname AS indexname,
          pg_index.indisunique,
          pg_get_expr(pg_index.indpred, pg_index.indrelid) AS predicate
        FROM pg_index
        INNER JOIN pg_class AS index_class
          ON index_class.oid = pg_index.indexrelid
        WHERE index_class.relname = 'UQ_vendor_member_active_auth_identity_id';
      `,
      );

      expect(membershipIndex.rows).toHaveLength(1);
      expect(membershipIndex.rows[0]?.indisunique).toBe(true);
      expect(membershipIndex.rows[0]?.predicate).toMatch(
        /active\s*=\s*true.*deleted_at\s+IS\s+NULL/,
      );
    } finally {
      await client.end();
    }
  });
});
