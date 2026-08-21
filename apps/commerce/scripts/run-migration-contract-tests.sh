#!/usr/bin/env bash
set -euo pipefail

# The migration contract suite owns its isolated database setup. Running the
# migrator twice proves both fresh application and repeat execution before the
# schema assertions are evaluated.
pnpm run db:migrate
pnpm run db:migrate
pnpm exec jest --silent=false --runInBand --forceExit
