#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.example"

PRESET_MIGRATION_URL="${MIGRATION_TEST_DATABASE_URL:-${DATABASE_URL:-}}"

if [ -f "$ENV_FILE" ]; then
    eval "$(grep -E '^(MIGRATION_TEST_DATABASE_URL|REDIS_URL|JWT_SECRET|COOKIE_SECRET|STORE_CORS|ADMIN_CORS|AUTH_CORS)=' "$ENV_FILE")"
fi

export NODE_ENV="test"
export ALLOW_SYNTHETIC_CATALOG="true"

# Preserve environment-supplied MIGRATION_TEST_DATABASE_URL / DATABASE_URL if present (e.g. in CI)
if [ -n "$PRESET_MIGRATION_URL" ]; then
    export DATABASE_URL="$PRESET_MIGRATION_URL"
    export MIGRATION_TEST_DATABASE_URL="$PRESET_MIGRATION_URL"
else
    export DATABASE_URL="${MIGRATION_TEST_DATABASE_URL:-}"
fi

export REDIS_URL="${REDIS_URL:-}"
export JWT_SECRET="${JWT_SECRET:-}"
export COOKIE_SECRET="${COOKIE_SECRET:-}"
export STORE_CORS="${STORE_CORS:-}"
export ADMIN_CORS="${ADMIN_CORS:-}"
export AUTH_CORS="${AUTH_CORS:-}"

# Parse DATABASE_URL for Medusa test runner if DB_HOST is not explicitly pre-configured
if [ -z "${DB_HOST:-}" ]; then
    if [[ "$DATABASE_URL" =~ ^postgres(ql)?://([^:]+):([^@]+)@([^:/]+)(:([0-9]+))?/([^?]+) ]]; then
        export DB_USERNAME="${BASH_REMATCH[2]}"
        export DB_PASSWORD="${BASH_REMATCH[3]}"
        export DB_HOST="${BASH_REMATCH[4]}"
        export DB_PORT="${BASH_REMATCH[6]:-5432}"
        export DB_NAME="${BASH_REMATCH[7]}"
        export DB_WAITINGROOM_DATABASE="${DB_NAME}"
    fi
fi

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: MIGRATION_TEST_DATABASE_URL is required for commerce migration tests." >&2
    exit 1
fi

exec "$@"
