import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const runner = path.resolve(
  process.cwd(),
  "scripts/run-jest-with-warning-classification.sh",
);
const expectedMessage = "Connection Error: Connection ended unexpectedly";

function runChild(source: string) {
  return spawnSync("bash", [runner, process.execPath, "-e", source], {
    encoding: "utf8",
  });
}

describe("Jest connection warning classification", () => {
  it("accepts only the exact expected reset message", () => {
    const result = runChild(
      `process.stdout.write(${JSON.stringify(expectedMessage)})`,
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "Classified 1 expected Medusa database-reset log(s)",
    );
  });

  it("fails closed for an annotated reset message", () => {
    const result = runChild(
      `process.stdout.write(${JSON.stringify(`${expectedMessage} (extra)`)})`,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unexpected connection log");
  });

  it("fails closed for a different connection error", () => {
    const result = runChild(
      'process.stdout.write("Connection Error: connection refused")',
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unexpected connection log");
  });

  it("preserves the wrapped command exit code", () => {
    const result = runChild("process.exit(7)");

    expect(result.status).toBe(7);
  });
});
