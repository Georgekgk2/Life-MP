#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.example"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: .env.example file not found at $ENV_FILE" >&2
    exit 1
fi

eval "$(grep -E '^(DATABASE_URL|TEST_DATABASE_URL|MIGRATION_TEST_DATABASE_URL|REDIS_URL|JWT_SECRET|COOKIE_SECRET|STORE_CORS|ADMIN_CORS|AUTH_CORS)=' "$ENV_FILE")"

export NODE_ENV="test"
export ALLOW_SYNTHETIC_CATALOG="true"

# Explicitly map MIGRATION_TEST_DATABASE_URL unless CI set a specific migration database URL
if [ -n "${MIGRATION_TEST_DATABASE_URL:-}" ] && [[ "${DATABASE_URL:-}" != *"life_medusa_migration_test"* ]]; then
    export DATABASE_URL="${MIGRATION_TEST_DATABASE_URL}"
fi

export REDIS_URL="${REDIS_URL:-}"
export JWT_SECRET="${JWT_SECRET:-}"
export COOKIE_SECRET="${COOKIE_SECRET:-}"
export STORE_CORS="${STORE_CORS:-}"
export ADMIN_CORS="${ADMIN_CORS:-}"
export AUTH_CORS="${AUTH_CORS:-}"

# Parse DATABASE_URL dynamically for Medusa test runner
if [[ "$DATABASE_URL" =~ ^postgres(ql)?://([^:]+):([^@]+)@([^:/]+)(:([0-9]+))?/([^?]+) ]]; then
    export DB_USERNAME="${BASH_REMATCH[2]}"
    export DB_PASSWORD="${BASH_REMATCH[3]}"
    export DB_HOST="${BASH_REMATCH[4]}"
    export DB_PORT="${BASH_REMATCH[6]:-5432}"
    export DB_NAME="${BASH_REMATCH[7]}"
    export DB_WAITINGROOM_DATABASE="postgres"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: MIGRATION_TEST_DATABASE_URL is required for commerce migration tests." >&2
    exit 1
fi

exec "$@"
