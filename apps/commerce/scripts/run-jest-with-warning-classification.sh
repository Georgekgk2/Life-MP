#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 2
fi

output_file="$(mktemp "${TMPDIR:-/tmp}/life-commerce-jest.XXXXXX")"
cleanup() {
  rm -f "$output_file"
}
trap cleanup EXIT

set +e
"$@" 2>&1 | tee "$output_file"
status=${PIPESTATUS[0]}
set -e

node - "$output_file" <<'NODE'
const fs = require("fs");

const outputPath = process.argv[2];
const output = fs.readFileSync(outputPath, "utf8");
const expected = "Connection Error: Connection ended unexpectedly";
const lines = output.split(/\r?\n/);
const normalize = (line) =>
  line.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "").trim();
const connectionLogs = lines.filter((line) =>
  line.includes("Connection Error:"),
);
const expectedConnectionLogs = connectionLogs.filter(
  (line) => normalize(line) === expected,
);
const unexpected = connectionLogs.filter(
  (line) => normalize(line) !== expected,
);

if (unexpected.length > 0) {
  console.error(
    `[commerce-test] Unexpected connection log(s):\n${unexpected.join("\n")}`,
  );
  process.exit(1);
}

console.log(
  `[commerce-test] Classified ${expectedConnectionLogs.length} expected Medusa database-reset log(s); no unexpected connection logs.`,
);
NODE

exit "$status"
