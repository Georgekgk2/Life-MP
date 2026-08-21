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
        CREATE ROLE life_medusa_test WITH LOGIN PASSWORD 'life_medusa_test_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END
$$;

SELECT 'CREATE DATABASE life_medusa_test OWNER life_medusa_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'life_medusa_test')\gexec

-- 3. Migration Integration Test Database & Role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'life_medusa_migration_test') THEN
        CREATE ROLE life_medusa_migration_test WITH LOGIN PASSWORD 'life_medusa_migration_test_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END
$$;

SELECT 'CREATE DATABASE life_medusa_migration_test OWNER life_medusa_migration_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'life_medusa_migration_test')\gexec

-- Development role security invariant: strict non-superuser, no CREATEDB, no CREATEROLE, no pg_signal_backend
ALTER ROLE life_medusa_dev NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- Integration test roles stay least-privilege application roles. The Medusa
-- test runner uses the separate local bootstrap connection from TEST_RUNNER_DATABASE_URL.
ALTER ROLE life_medusa_test NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER ROLE life_medusa_migration_test NOSUPERUSER NOCREATEDB NOCREATEROLE;
REVOKE pg_signal_backend FROM life_medusa_test, life_medusa_migration_test;
