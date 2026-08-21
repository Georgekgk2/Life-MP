#!/usr/bin/env bash
set -euo pipefail

for spec in integration-tests/http/*.spec.ts; do
  if [ -f "$spec" ]; then
    echo "=================================================="
    echo "Running integration test file: $spec"
    echo "=================================================="
    ./scripts/run-jest-with-warning-classification.sh \
      pnpm exec jest "$spec" --runInBand
  fi
done
