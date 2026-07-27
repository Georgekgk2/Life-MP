#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> [Fresh State Test] 1. Tearing down containers and volume state..."
docker compose --env-file .env.example -f docker-compose.dev.yml down -v --remove-orphans

echo "==> [Fresh State Test] 2. Starting fresh PostgreSQL and Redis data services..."
docker compose --env-file .env.example -f docker-compose.dev.yml up -d

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
