import { Client } from "pg";

async function bootstrapCiTestDatabase() {
  const bootstrapUrl = process.env["TEST_BOOTSTRAP_DATABASE_URL"];
  const appUrl = process.env["TEST_APPLICATION_DATABASE_URL"];

  if (!bootstrapUrl || !appUrl) {
    throw new Error(
      "[bootstrap-ci-test-database] Missing required environment variables TEST_BOOTSTRAP_DATABASE_URL or TEST_APPLICATION_DATABASE_URL",
    );
  }

  const bootstrapParsed = new URL(bootstrapUrl);
  const appParsed = new URL(appUrl);

  if (
    !["postgres:", "postgresql:"].includes(bootstrapParsed.protocol) ||
    !["postgres:", "postgresql:"].includes(appParsed.protocol)
  ) {
    throw new Error(
      "[bootstrap-ci-test-database] Both database URLs must use the postgres or postgresql protocol.",
    );
  }

  const allowedHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  if (
    !allowedHosts.has(bootstrapParsed.hostname) ||
    !allowedHosts.has(appParsed.hostname)
  ) {
    throw new Error(
      "[bootstrap-ci-test-database] Database bootstrap is restricted to loopback hosts.",
    );
  }

  if (
    bootstrapParsed.hostname !== appParsed.hostname ||
    bootstrapParsed.port !== appParsed.port
  ) {
    throw new Error(
      "[bootstrap-ci-test-database] Bootstrap and application URLs must target the same loopback endpoint.",
    );
  }

  const bootstrapUser = bootstrapParsed.username;
  if (bootstrapUser !== "ci_bootstrap") {
    throw new Error(
      `[bootstrap-ci-test-database] Expected bootstrap role 'ci_bootstrap', got '${bootstrapUser}'.`,
    );
  }

  const bootstrapDb = bootstrapParsed.pathname.replace(/^\//, "");
  const appDb = appParsed.pathname.replace(/^\//, "");

  if (bootstrapDb !== "ci_control") {
    throw new Error(
      `[bootstrap-ci-test-database] Expected bootstrap database 'ci_control', got '${bootstrapDb}'`,
    );
  }

  if (appDb !== "life_medusa_test" && appDb !== "life_medusa_migration_test") {
    throw new Error(
      `[bootstrap-ci-test-database] Expected application database 'life_medusa_test' or 'life_medusa_migration_test', got '${appDb}'`,
    );
  }

  const appUser = appParsed.username;
  const appPassword = appParsed.password;

  if (appUser !== appDb || !/^[a-z_][a-z0-9_]*$/i.test(appUser)) {
    throw new Error(
      "[bootstrap-ci-test-database] Application role must be a safe identifier matching its database name.",
    );
  }

  if (!appPassword) {
    throw new Error(
      "[bootstrap-ci-test-database] Target application database URL must contain a password.",
    );
  }

  const escapedPassword = appPassword.replace(/'/g, "''");

  const client = new Client({ connectionString: bootstrapUrl });
  await client.connect();

  try {
    const roleCheck = await client.query(
      "SELECT 1 FROM pg_roles WHERE rolname = $1",
      [appUser],
    );
    if (roleCheck.rowCount === 0) {
      await client.query(
        `CREATE ROLE "${appUser}" WITH LOGIN PASSWORD '${escapedPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE;`,
      );
    }

    // Ensure default 'postgres' database exists
    const postgresDbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'postgres'",
    );
    if (postgresDbCheck.rowCount === 0) {
      await client.query(`CREATE DATABASE "postgres" OWNER "${appUser}";`);
    }

    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [appDb],
    );
    if (dbCheck.rowCount === 0) {
      await client.query(`CREATE DATABASE "${appDb}" OWNER "${appUser}";`);
    }

    await client.query(
      `ALTER ROLE "${appUser}" NOSUPERUSER NOCREATEDB NOCREATEROLE;`,
    );

    await client.query(`REVOKE pg_signal_backend FROM "${appUser}";`);

    const privilegeCheck = await client.query(
      "SELECT rolsuper, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = $1",
      [appUser],
    );
    const role = privilegeCheck.rows[0] as
      | { rolsuper: boolean; rolcreaterole: boolean; rolcreatedb: boolean }
      | undefined;
    if (!role || role.rolsuper || role.rolcreaterole || role.rolcreatedb) {
      throw new Error(
        "[bootstrap-ci-test-database] Application role privilege check failed: expected NOSUPERUSER, NOCREATEDB, NOCREATEROLE.",
      );
    }

    console.log(
      `[bootstrap-ci-test-database] Successfully bootstrapped CI database '${appDb}' owned by '${appUser}'.`,
    );
  } finally {
    await client.end();
  }
}

bootstrapCiTestDatabase().catch((err) => {
  console.error(err);
  process.exit(1);
});
