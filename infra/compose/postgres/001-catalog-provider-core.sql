-- =============================================================================
-- Catalog & Provider Core (Phase 2) Database & Role Provisioning
-- =============================================================================
-- Idempotent initialization script mounted into /docker-entrypoint-initdb.d/

-- 1. Development Database & Role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'life_medusa_dev') THEN
        CREATE ROLE life_medusa_dev WITH LOGIN PASSWORD 'life_medusa_dev_password';
    END IF;
END
$$;

SELECT 'CREATE DATABASE life_medusa_dev OWNER life_medusa_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'life_medusa_dev')\gexec

-- 2. HTTP Integration Test Database & Role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'life_medusa_test') THEN
        CREATE ROLE life_medusa_test WITH LOGIN PASSWORD 'life_medusa_test_password' SUPERUSER CREATEDB;
    END IF;
END
$$;

SELECT 'CREATE DATABASE life_medusa_test OWNER life_medusa_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'life_medusa_test')\gexec

-- 3. Migration Integration Test Database & Role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'life_medusa_migration_test') THEN
        CREATE ROLE life_medusa_migration_test WITH LOGIN PASSWORD 'life_medusa_migration_test_password' SUPERUSER CREATEDB;
    END IF;
END
$$;

SELECT 'CREATE DATABASE life_medusa_migration_test OWNER life_medusa_migration_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'life_medusa_migration_test')\gexec

-- Development role security invariant: strict non-superuser, no CREATEDB, no CREATEROLE, no pg_signal_backend
ALTER ROLE life_medusa_dev NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- Integration test roles: SUPERUSER CREATEDB required for Medusa test runner template database creation & connection termination
ALTER ROLE life_medusa_test SUPERUSER CREATEDB NOCREATEROLE;
ALTER ROLE life_medusa_migration_test SUPERUSER CREATEDB NOCREATEROLE;

-- Grant connect on default postgres database for test-runner database management
GRANT CONNECT ON DATABASE postgres TO life_medusa_test, life_medusa_migration_test;
GRANT pg_signal_backend TO life_medusa_test, life_medusa_migration_test;
