#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.example"

PRESET_TEST_URL="${TEST_DATABASE_URL:-${DATABASE_URL:-}}"
PRESET_RUNNER_URL="${TEST_RUNNER_DATABASE_URL:-}"

if [ -f "$ENV_FILE" ]; then
    eval "$(grep -E '^(TEST_DATABASE_URL|TEST_RUNNER_DATABASE_URL|REDIS_URL|JWT_SECRET|COOKIE_SECRET|STORE_CORS|ADMIN_CORS|AUTH_CORS)=' "$ENV_FILE")"
fi

export NODE_ENV="test"
export ALLOW_SYNTHETIC_CATALOG="true"
export ALLOW_SYNTHETIC_ORDERS="true"

# Preserve environment-supplied URLs (e.g. in CI) over local example defaults.
if [ -n "$PRESET_TEST_URL" ]; then
    export DATABASE_URL="$PRESET_TEST_URL"
    export TEST_DATABASE_URL="$PRESET_TEST_URL"
else
    export DATABASE_URL="${TEST_DATABASE_URL:-}"
fi
if [ -n "$PRESET_RUNNER_URL" ]; then
    export TEST_RUNNER_DATABASE_URL="$PRESET_RUNNER_URL"
fi

export REDIS_URL="${REDIS_URL:-}"
export JWT_SECRET="${JWT_SECRET:-}"
export COOKIE_SECRET="${COOKIE_SECRET:-}"
export STORE_CORS="${STORE_CORS:-}"
export ADMIN_CORS="${ADMIN_CORS:-}"
export AUTH_CORS="${AUTH_CORS:-}"

parse_database_url() {
    local database_url="$1"
    if [[ "$database_url" =~ ^postgres(ql)?://([^:]+):([^@]+)@([^:/]+)(:([0-9]+))?/([^?]+) ]]; then
        export DB_USERNAME="${BASH_REMATCH[2]}"
        export DB_PASSWORD="${BASH_REMATCH[3]}"
        export DB_HOST="${BASH_REMATCH[4]}"
        export DB_PORT="${BASH_REMATCH[6]:-5432}"
        export DB_NAME="${BASH_REMATCH[7]}"
        export DB_WAITINGROOM_DATABASE="postgres"
    fi
}

# The Medusa runner creates/restores isolated databases and therefore needs a
# separately configured control connection. The application URL stays bound to
# the non-superuser test role.
if [ -n "${TEST_RUNNER_DATABASE_URL:-}" ]; then
    parse_database_url "$TEST_RUNNER_DATABASE_URL"
elif [ -z "${DB_HOST:-}" ]; then
    parse_database_url "${DATABASE_URL:-}"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: TEST_DATABASE_URL is required for commerce integration tests." >&2
    exit 1
fi

exec "$@"
