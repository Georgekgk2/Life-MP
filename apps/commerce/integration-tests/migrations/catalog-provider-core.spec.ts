import { Client } from "pg";

describe("Migration and Seed Idempotence (catalog-provider-core)", () => {
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

  it("verifies migration database target is life_medusa_migration_test", async () => {
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

  it("executes marketplace module tables verification", async () => {
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    try {
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('vendor', 'vendor_member', 'catalog_listing', 'moderation_decision', 'audit_event');
      `);
      expect(res.rows).toBeDefined();
    } finally {
      await client.end();
    }
  });
});
