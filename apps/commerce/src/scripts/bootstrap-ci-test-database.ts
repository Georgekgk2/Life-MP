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

  if (!appUser || !appPassword) {
    throw new Error(
      "[bootstrap-ci-test-database] Target application database URL must contain username and password.",
    );
  }

  const client = new Client({ connectionString: bootstrapUrl });
  await client.connect();

  try {
    const roleCheck = await client.query(
      "SELECT 1 FROM pg_roles WHERE rolname = $1",
      [appUser],
    );
    if (roleCheck.rowCount === 0) {
      await client.query(
        `CREATE ROLE "${appUser}" WITH LOGIN PASSWORD '${appPassword.replace(/'/g, "''")}' SUPERUSER CREATEDB;`,
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
      `ALTER ROLE "${appUser}" SUPERUSER CREATEDB NOCREATEROLE;`,
    );

    await client.query(`GRANT pg_signal_backend TO "${appUser}";`);

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
