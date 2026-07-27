#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="docker-compose.dev.yml"

# Safeguard 1: Destructive reset explicit permission check
if [ "${LIFE_ALLOW_DESTRUCTIVE_LOCAL_RESET:-false}" != "true" ]; then
  echo "ERROR: Refusing destructive local database/volume reset."
  echo "To allow local state wipe, set LIFE_ALLOW_DESTRUCTIVE_LOCAL_RESET=true."
  exit 1
fi

# Safeguard 2: Reject execution if compose file is not docker-compose.dev.yml
if [ ! -f "$COMPOSE_FILE" ] || [[ "$COMPOSE_FILE" == *"production"* ]] || [[ "$COMPOSE_FILE" == *"staging"* ]]; then
  echo "ERROR: Refusing execution on non-development or production Compose file '$COMPOSE_FILE'."
  exit 1
fi

echo "==> [Fresh State Test] 1. Tearing down containers and volume state..."
docker compose --env-file .env.example -f "$COMPOSE_FILE" down -v --remove-orphans

echo "==> [Fresh State Test] 2. Starting fresh PostgreSQL and Redis data services..."
docker compose --env-file .env.example -f "$COMPOSE_FILE" up -d

echo "==> [Fresh State Test] 3. Waiting for PostgreSQL and Redis healthchecks..."
make dev-infra-wait

echo "==> [Fresh State Test] 4. Bootstrapping application databases and roles..."
make db-bootstrap

echo "==> [Fresh State Test] 5. Running database migrations on dev database..."
scripts/with-local-commerce-env.sh pnpm --filter @life/commerce run db:migrate

echo "==> [Fresh State Test] 6. Seeding synthetic catalog data into dev database..."
ALLOW_SYNTHETIC_CATALOG=true scripts/with-local-commerce-env.sh pnpm --filter @life/commerce run seed

echo "==> [Fresh State Test] 7. Running migration idempotency tests..."
pnpm run test:migrations

echo "==> [Fresh State Test] 8. Running HTTP integration & authorization tests..."
pnpm run test:integration

echo "==> [Fresh State Test] Success! Clean-state reproduction completed flawlessly."
