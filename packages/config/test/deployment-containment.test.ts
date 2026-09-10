import { describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  scanDeploymentContainment,
  MANDATORY_POLICY_GATES,
  PERMITTED_SCRIPT_PATHS,
  PERMITTED_GHCR_REPOSITORIES,
  FORBIDDEN_REMOTE_COMMAND_PATTERNS,
  FORBIDDEN_SCRIPT_FILENAMES,
  getPermittedScripts,
  isPermittedScript,
} from "../src/deployment-containment.js";

// Independent literal specification of expected mandatory gates (decoupled from production constant)
const EXPECTED_POLICY_GATES = [
  "allow_remote_deployment",
  "allow_ssh_execution",
  "allow_ghcr_image_push",
  "allow_production_dns_tls",
  "allow_live_payment_gateway",
  "allow_live_shipping_api",
  "allow_live_fiscalization",
] as const;

// Independent literal specification of expected permitted scripts (decoupled from production constant)
const EXPECTED_PERMITTED_SCRIPTS = [
  "scripts/check-docs.mjs",
  "scripts/generate-marketplace-images.mjs",
  "scripts/generate-pwa-icons.mjs",
  "scripts/test-fresh-state-repro.sh",
  "scripts/verify-deployment-containment.mjs",
  "scripts/with-commerce-migration-test-env.sh",
  "scripts/with-commerce-test-env.sh",
  "scripts/with-local-commerce-env.sh",
] as const;

function createValidPolicyGates(): Record<string, boolean> {
  const gates: Record<string, boolean> = {};
  for (const gate of EXPECTED_POLICY_GATES) {
    gates[gate] = false;
  }
  return gates;
}

describe("packages/config deployment-containment scanner", () => {
  it("passes when deployment policy is strictly contained and no deploy surfaces exist", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "life-containment-pass-"));
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          version: "1.0.0",
          policy_name: "Test Policy",
          status: "CONTAINED",
          gates: createValidPolicyGates(),
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "ci.yml"),
        "name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n",
      );

      writeFileSync(
        join(tempDir, "Makefile"),
        "deploy-staging:\n\t@echo 'disabled'; exit 1\n",
      );

      mkdirSync(join(tempDir, "scripts"), { recursive: true });
      writeFileSync(
        join(tempDir, "scripts", "check-docs.mjs"),
        "// local docs verification helper\nconsole.log('ok');\n",
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(true);
      expect(result.violations.length).toBe(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when deployment policy is missing", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-fail-nopolicy-"),
    );
    try {
      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === "P0-POLICY-EXISTS")).toBe(
        true,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when gates object is empty (mandatory schema check)", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-fail-emptygates-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          version: "1.0.0",
          status: "CONTAINED",
          gates: {},
        }),
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === "P0-GATE-MISSING")).toBe(
        true,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when any mandatory gate is missing from deployment policy", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-fail-missinggate-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const partialGates = createValidPolicyGates();
      delete partialGates["allow_ssh_execution"];

      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          version: "1.0.0",
          status: "CONTAINED",
          gates: partialGates,
        }),
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) =>
            v.rule === "P0-GATE-MISSING" &&
            v.message.includes("allow_ssh_execution"),
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when any gate in deployment-policy is true", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "life-containment-fail-gate-"));
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const activeGates = createValidPolicyGates();
      activeGates["allow_remote_deployment"] = true;

      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          version: "1.0.0",
          status: "CONTAINED",
          gates: activeGates,
        }),
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === "P0-GATE-LOCKED")).toBe(
        true,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when deploy.yml workflow exists", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-fail-deployyml-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED",
          gates: createValidPolicyGates(),
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "deploy.yml"),
        "name: Deploy",
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "P0-NO-DEPLOY-WORKFLOW"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when forbidden actions or secrets are referenced in workflows", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-fail-actions-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED",
          gates: createValidPolicyGates(),
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "ci.yml"),
        "uses: appleboy/ssh-action@v1\npackages: write\nuses: docker/build-push-action@v5\nhost: ${{ secrets.DEPLOY_HOST }}\nskip_tests:\n",
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === "P0-NO-SSH-ACTION")).toBe(
        true,
      );
      expect(
        result.violations.some((v) => v.rule === "P0-NO-BUILD-PUSH-ACTION"),
      ).toBe(true);
      expect(
        result.violations.some((v) => v.rule === "P0-NO-PACKAGES-WRITE"),
      ).toBe(true);
      expect(
        result.violations.some((v) => v.rule === "P0-NO-DEPLOY-SECRETS"),
      ).toBe(true);
      expect(result.violations.some((v) => v.rule === "P0-NO-SKIP-TESTS")).toBe(
        true,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when root scripts/deploy_prod.sh exists in repository", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-fail-deployprod-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED",
          gates: createValidPolicyGates(),
        }),
      );

      mkdirSync(join(tempDir, "scripts"), { recursive: true });
      writeFileSync(
        join(tempDir, "scripts", "deploy_prod.sh"),
        "#!/bin/bash\necho 'deploying'\n",
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) =>
            v.rule === "P0-NO-REMOTE-SCRIPTS" &&
            v.path === "scripts/deploy_prod.sh",
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when script files contain remote execution commands (ssh, rsync, scp, docker -H)", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-fail-commands-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED",
          gates: createValidPolicyGates(),
        }),
      );

      mkdirSync(join(tempDir, "scripts"), { recursive: true });
      writeFileSync(
        join(tempDir, "scripts", "sync-runner.sh"),
        "#!/bin/bash\nssh -i key medgemma-user@host 'uptime'\nrsync -avz ./ host:/opt/life-mp/\n",
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "P0-NO-REMOTE-COMMANDS"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when forbidden scripts exist in scripts/deploy subdirectory", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-fail-subdir-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED",
          gates: createValidPolicyGates(),
        }),
      );

      mkdirSync(join(tempDir, "scripts", "deploy"), { recursive: true });
      writeFileSync(
        join(tempDir, "scripts", "deploy", "remote-setup.sh"),
        "#!/bin/bash\n",
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "P0-NO-REMOTE-SCRIPTS"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when any deploy filename variant exists (deploy.sh, deployfoo.sh, deployment.sh, deploy-prod.bash)", () => {
    for (const forbiddenName of [
      "deploy.sh",
      "deployfoo.sh",
      "deployment.sh",
      "deploy-prod.bash",
      "release.sh",
      "rollback-v2.sh",
    ]) {
      const tempDir = mkdtempSync(
        join(
          tmpdir(),
          `life-containment-fail-${forbiddenName.replace(/[^a-z0-9]/g, "")}-`,
        ),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED",
            gates: createValidPolicyGates(),
          }),
        );

        mkdirSync(join(tempDir, "scripts"), { recursive: true });
        writeFileSync(
          join(tempDir, "scripts", forbiddenName),
          "#!/bin/bash\necho 'forbidden'\n",
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some(
            (v) =>
              v.rule === "P0-NO-REMOTE-SCRIPTS" ||
              v.rule === "P0-UNAUTHORIZED-SCRIPT",
          ),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails when unauthorized non-shell script extensions exist in scripts directory (tool.py, tool.zsh)", () => {
    for (const [scriptName, content] of [
      ["tool.py", "import subprocess\nsubprocess.run(['ssh', 'host'])\n"],
      ["tool.zsh", "#!/bin/zsh\nssh medgemma-user@host uptime\n"],
    ]) {
      const tempDir = mkdtempSync(join(tmpdir(), "life-containment-fail-ext-"));
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED",
            gates: createValidPolicyGates(),
          }),
        );

        mkdirSync(join(tempDir, "scripts"), { recursive: true });
        writeFileSync(join(tempDir, "scripts", scriptName), content);

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some((v) => v.rule === "P0-UNAUTHORIZED-SCRIPT"),
        ).toBe(true);
        expect(
          result.violations.some((v) => v.rule === "P0-NO-REMOTE-COMMANDS"),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails when advanced remote patterns exist (docker --context, Node execFile/spawn ssh/rsync)", () => {
    for (const [scriptName, content] of [
      [
        "check-docs.mjs",
        'import { execFile } from "node:child_process";\nexecFile("ssh", ["host"]);\n',
      ],
      ["verify-deployment-containment.mjs", "docker --context prod ps\n"],
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-fail-advpattern-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED",
            gates: createValidPolicyGates(),
          }),
        );

        mkdirSync(join(tempDir, "scripts"), { recursive: true });
        writeFileSync(join(tempDir, "scripts", scriptName), content);

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some((v) => v.rule === "P0-NO-REMOTE-COMMANDS"),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("enforces that MANDATORY_POLICY_GATES is runtime frozen and resistant to mutation", () => {
    expect(Object.isFrozen(MANDATORY_POLICY_GATES)).toBe(true);
    expect([...MANDATORY_POLICY_GATES].sort()).toEqual(
      [...EXPECTED_POLICY_GATES].sort(),
    );
    expect(MANDATORY_POLICY_GATES.length).toBe(7);

    expect(() => {
      (MANDATORY_POLICY_GATES as unknown as string[]).pop();
    }).toThrow();

    expect(() => {
      (MANDATORY_POLICY_GATES as unknown as string[]).push("allow_new_gate");
    }).toThrow();

    expect(() => {
      (MANDATORY_POLICY_GATES as unknown as string[])[0] = "mutated_gate";
    }).toThrow();

    expect(() => {
      (MANDATORY_POLICY_GATES as unknown as { length: number }).length = 0;
    }).toThrow();
  });

  it("enforces that FORBIDDEN_REMOTE_COMMAND_PATTERNS is runtime frozen and resistant to mutation", () => {
    expect(Object.isFrozen(FORBIDDEN_REMOTE_COMMAND_PATTERNS)).toBe(true);
    expect(FORBIDDEN_REMOTE_COMMAND_PATTERNS.length).toBeGreaterThan(0);

    expect(() => {
      (FORBIDDEN_REMOTE_COMMAND_PATTERNS as unknown as RegExp[]).pop();
    }).toThrow();

    expect(() => {
      (FORBIDDEN_REMOTE_COMMAND_PATTERNS as unknown as RegExp[]).push(/evil/);
    }).toThrow();

    expect(() => {
      (FORBIDDEN_REMOTE_COMMAND_PATTERNS as unknown as RegExp[])[0] = /noop/;
    }).toThrow();

    expect(() => {
      (
        FORBIDDEN_REMOTE_COMMAND_PATTERNS as unknown as { length: number }
      ).length = 0;
    }).toThrow();

    // Deep freeze enforcement: every single RegExp pattern must be frozen
    for (const pattern of FORBIDDEN_REMOTE_COMMAND_PATTERNS) {
      expect(Object.isFrozen(pattern)).toBe(true);

      // Attempting to monkey-patch .test must throw
      expect(() => {
        (pattern as unknown as { test: () => boolean }).test = () => false;
      }).toThrow();

      // Attempting to mutate lastIndex must throw
      expect(() => {
        (pattern as unknown as { lastIndex: number }).lastIndex = 5;
      }).toThrow();
    }

    // Verify pattern functionality remains intact
    const sshPattern = FORBIDDEN_REMOTE_COMMAND_PATTERNS[0];
    expect(sshPattern.test("ssh host uptime")).toBe(true);
  });

  it("enforces that FORBIDDEN_SCRIPT_FILENAMES is runtime frozen and resistant to mutation", () => {
    expect(Object.isFrozen(FORBIDDEN_SCRIPT_FILENAMES)).toBe(true);
    expect(FORBIDDEN_SCRIPT_FILENAMES.length).toBeGreaterThan(0);

    expect(() => {
      (FORBIDDEN_SCRIPT_FILENAMES as unknown as string[]).pop();
    }).toThrow();

    expect(() => {
      (FORBIDDEN_SCRIPT_FILENAMES as unknown as string[]).push("evil.sh");
    }).toThrow();

    expect(() => {
      (FORBIDDEN_SCRIPT_FILENAMES as unknown as string[])[0] = "noop.sh";
    }).toThrow();

    expect(() => {
      (FORBIDDEN_SCRIPT_FILENAMES as unknown as { length: number }).length = 0;
    }).toThrow();
  });

  it("fails closed when any symlink is created in scripts directory (permitted name or unauthorized)", () => {
    for (const symlinkName of ["check-docs.mjs", "deploy-symlink.sh"]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-fail-symlink-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED",
            gates: createValidPolicyGates(),
          }),
        );

        mkdirSync(join(tempDir, "scripts"), { recursive: true });
        // Create an outside target script with remote commands
        const outsideScript = join(tempDir, "outside-remote.sh");
        writeFileSync(outsideScript, "#!/bin/bash\nssh host uptime\n");

        // Symlink from scripts/ into outside target
        symlinkSync(outsideScript, join(tempDir, "scripts", symlinkName));

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some((v) => v.rule === "P0-FORBIDDEN-SYMLINK"),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("enforces that permitted script paths are runtime frozen and cannot be mutated", () => {
    expect(Object.isFrozen(PERMITTED_SCRIPT_PATHS)).toBe(true);
    expect(PERMITTED_SCRIPT_PATHS).toEqual(EXPECTED_PERMITTED_SCRIPTS);
    expect(PERMITTED_SCRIPT_PATHS.length).toBe(8);

    // Direct mutation attempts on PERMITTED_SCRIPT_PATHS must throw in strict mode
    expect(() => {
      (PERMITTED_SCRIPT_PATHS as unknown as string[]).push("scripts/evil.mjs");
    }).toThrow();

    expect(() => {
      (PERMITTED_SCRIPT_PATHS as unknown as string[])[0] = "scripts/evil.mjs";
    }).toThrow();

    expect(() => {
      (PERMITTED_SCRIPT_PATHS as unknown as { length: number }).length = 0;
    }).toThrow();

    // Verify lookup helper remains unmutated
    expect(isPermittedScript("scripts/evil.mjs")).toBe(false);
    expect(isPermittedScript("scripts/check-docs.mjs")).toBe(true);

    // Verify getPermittedScripts() returns exact expected paths
    const list = getPermittedScripts();
    expect(list).toEqual(EXPECTED_PERMITTED_SCRIPTS);
    expect(list.length).toBe(8);

    // Mutating the returned array copy does not affect internal lookup
    (list as string[]).push("scripts/evil.mjs");
    expect(isPermittedScript("scripts/evil.mjs")).toBe(false);
    expect(getPermittedScripts().length).toBe(8);

    // Verify no mutable Set is exported (no add/delete/clear on returned list)
    expect("add" in getPermittedScripts()).toBe(false);
    expect("delete" in getPermittedScripts()).toBe(false);
    expect("clear" in getPermittedScripts()).toBe(false);
  });

  it("fails closed when scripts path itself is a symbolic link (root directory symlink bypass)", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-fail-root-symlink-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED",
          gates: createValidPolicyGates(),
        }),
      );

      // Create external scripts directory with an allowlisted filename
      const externalScriptsDir = join(tempDir, "external-scripts");
      mkdirSync(externalScriptsDir, { recursive: true });
      writeFileSync(
        join(externalScriptsDir, "check-docs.mjs"),
        "#!/usr/bin/env node\nconsole.log('benign');\n",
      );

      // Symlink scripts/ -> external-scripts
      symlinkSync(externalScriptsDir, join(tempDir, "scripts"));

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "P0-FORBIDDEN-SYMLINK" && v.path === "scripts",
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails closed when scripts entry is a regular file instead of a directory", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-fail-file-root-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED",
          gates: createValidPolicyGates(),
        }),
      );

      // Create a file named "scripts" instead of a directory
      writeFileSync(join(tempDir, "scripts"), "#!/bin/bash\nexit 0\n");

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "P0-NON-REGULAR-FILE" && v.path === "scripts",
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails closed when a subdirectory inside scripts is a symbolic link", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-fail-sub-symlink-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED",
          gates: createValidPolicyGates(),
        }),
      );

      mkdirSync(join(tempDir, "scripts"), { recursive: true });

      const externalSubDir = join(tempDir, "external-sub");
      mkdirSync(externalSubDir, { recursive: true });
      writeFileSync(
        join(externalSubDir, "nested.sh"),
        "#!/bin/bash\necho test\n",
      );

      // Symlink scripts/sub -> external-sub
      symlinkSync(externalSubDir, join(tempDir, "scripts", "sub"));

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "P0-FORBIDDEN-SYMLINK" && v.path === "scripts/sub",
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("enforces that PERMITTED_GHCR_REPOSITORIES is runtime frozen and contains exact allowlisted repos", () => {
    expect(Object.isFrozen(PERMITTED_GHCR_REPOSITORIES)).toBe(true);
    expect(PERMITTED_GHCR_REPOSITORIES).toEqual([
      "ghcr.io/georgekgk2/life-commerce",
      "ghcr.io/georgekgk2/life-storefront",
    ]);
  });

  it("passes when deployment policy is in Phase P2 (CONTAINED_PHASE_P2) and conforms to contract", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "life-containment-p2-pass-"));
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "release-images.yml"),
        `name: Release
on:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - run: docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when deployment policy has an unknown status", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-unknown-status-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "UNRESTRICTED",
          gates: createValidPolicyGates(),
        }),
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === "P0-POLICY-STATUS")).toBe(
        true,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if allow_ghcr_image_push is false or missing", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-gate-fail-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = false;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === "P2-GATE-STATE")).toBe(
        true,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if any commercial or remote gate is set to true", () => {
    for (const forbiddenGate of [
      "allow_remote_deployment",
      "allow_live_fiscalization",
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-bad-gate-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        p2Gates[forbiddenGate] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(result.violations.some((v) => v.rule === "P0-GATE-LOCKED")).toBe(
          true,
        );
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails in Phase P2 if release-images.yml contains top-level packages: write", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-toplevel-write-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "release-images.yml"),
        `name: Release
on:
  push:
    branches: [main]
permissions:
  packages: write
jobs:
  publish:
    runs-on: ubuntu-latest
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "P2-TOPLEVEL-WRITE-PERMISSIONS",
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if release-images.yml triggers on pull_request", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-pr-trigger-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "release-images.yml"),
        `name: Release
on:
  pull_request:
    branches: [main]
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "P2-FORBIDDEN-TRIGGER"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if an unauthorized secondary workflow contains packages: write", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-unauth-wf-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "ci.yml"),
        `name: CI
jobs:
  rogue:
    permissions:
      packages: write
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "P0-UNAUTHORIZED-PUBLISH-WORKFLOW",
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("validates .trivyignore format and fails closed when entries are expired, invalid, or leak across blank lines", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-trivyignore-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED",
          gates: createValidPolicyGates(),
        }),
      );

      // Expired entry
      writeFileSync(
        join(tempDir, ".trivyignore"),
        `# reason: test | owner: security | expires: 2020-01-01\nCVE-2020-1234\n`,
      );
      let result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "P0-TRIVYIGNORE-EXPIRED"),
      ).toBe(true);

      // Unannotated entry
      writeFileSync(join(tempDir, ".trivyignore"), `CVE-2025-9999\n`);
      result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "P0-TRIVYIGNORE-UNANNOTATED"),
      ).toBe(true);

      // Metadata must NOT leak across blank lines to subsequent unannotated entries
      writeFileSync(
        join(tempDir, ".trivyignore"),
        `# reason: test valid | owner: security | expires: 2099-12-31\nCVE-2025-9991\n\nCVE-2025-9992\n`,
      );
      result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "P0-TRIVYIGNORE-UNANNOTATED"),
      ).toBe(true);

      // Invalid calendar date (e.g. 2099-99-99)
      writeFileSync(
        join(tempDir, ".trivyignore"),
        `# reason: test invalid date | owner: security | expires: 2099-99-99\nCVE-2025-9993\n`,
      );
      result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "P0-TRIVYIGNORE-INVALID-DATE"),
      ).toBe(true);

      // Valid annotated entry
      writeFileSync(
        join(tempDir, ".trivyignore"),
        `# reason: test valid | owner: security | expires: 2099-12-31\nCVE-2025-9999\n`,
      );
      result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if release-images.yml contains workflow_dispatch or schedule trigger", () => {
    for (const triggerSnippet of [
      "workflow_dispatch:",
      "schedule:\n  - cron: '0 0 * * *'",
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-bad-trigger-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
        writeFileSync(
          join(tempDir, ".github", "workflows", "release-images.yml"),
          `name: Release
on:
  ${triggerSnippet}
`,
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some((v) => v.rule === "P2-FORBIDDEN-TRIGGER"),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails in Phase P2 if a non-publish job inside release-images.yml has write permissions", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-rogue-job-write-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "release-images.yml"),
        `name: Release
on:
  push:
    branches: [main]
jobs:
  rogue:
    runs-on: ubuntu-latest
    permissions:
      packages: write
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "P2-JOB-FORBIDDEN-WRITE-PERMISSIONS",
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if release-images.yml contains unpinned mutable action reference", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-mutable-action-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "release-images.yml"),
        `name: Release
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "P2-MUTABLE-ACTION-REF"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if release-images.yml targets a branch other than main", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-dev-branch-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "release-images.yml"),
        `name: Release
on:
  push:
    branches: [dev]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - run: docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "P2-FORBIDDEN-BRANCH"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if release-images.yml pushes to an unauthorized additional registry", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-bad-registry-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "release-images.yml"),
        `name: Release
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - run: docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
      - run: docker push docker.io/rogue/image:latest
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "P2-UNAUTHORIZED-IMAGE-REPO"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if publish job contains excessive write permissions", () => {
    for (const forbiddenPerm of ["contents: write", "actions: write"]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-excess-perms-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
        writeFileSync(
          join(tempDir, ".github", "workflows", "release-images.yml"),
          `name: Release
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      ${forbiddenPerm}
`,
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some(
            (v) => v.rule === "P2-PUBLISH-FORBIDDEN-PERMISSIONS",
          ),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails in Phase P2 if release-images.yml uses local actions or docker actions", () => {
    for (const actionSnippet of [
      "uses: ./local-action",
      "uses: docker://alpine:latest",
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-bad-action-type-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
        writeFileSync(
          join(tempDir, ".github", "workflows", "release-images.yml"),
          `name: Release
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - ${actionSnippet}
`,
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some(
            (v) =>
              v.rule === "P2-FORBIDDEN-LOCAL-ACTION" ||
              v.rule === "P2-FORBIDDEN-DOCKER-ACTION",
          ),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails in Phase P2 if publish job has flow mapping with excessive write permissions or write-all", () => {
    for (const badPerms of [
      "permissions: {contents: write, packages: write, actions: write}",
      "permissions: write-all",
      "permissions: [contents, packages]",
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-flow-perms-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
        writeFileSync(
          join(tempDir, ".github", "workflows", "release-images.yml"),
          `name: Release
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    ${badPerms}
    steps:
      - run: docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
`,
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some(
            (v) => v.rule === "P2-PUBLISH-FORBIDDEN-PERMISSIONS",
          ),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails in Phase P2 if release-images.yml contains extra push trigger filters like tags or paths", () => {
    for (const triggerSnippet of [
      `on:
  push:
    branches: [main]
    tags: [v*]`,
      `on:
  push:
    branches: [main]
    paths: ["apps/**"]`,
      `on:
  push:
    branches: [main]
  workflow_dispatch:`,
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-bad-trigger-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
        writeFileSync(
          join(tempDir, ".github", "workflows", "release-images.yml"),
          `name: Release
${triggerSnippet}
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - run: docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
`,
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some((v) => v.rule === "P2-FORBIDDEN-TRIGGER"),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails in Phase P2 if release-images.yml only contains echo of image names without actual docker push in publish", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-fake-push-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "release-images.yml"),
        `name: Release
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - run: echo "ghcr.io/georgekgk2/life-commerce and ghcr.io/georgekgk2/life-storefront"
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "P2-MISSING-EXPECTED-IMAGE-PUSH",
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if release-images.yml contains job-level reusable workflow (uses)", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-job-uses-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "release-images.yml"),
        `name: Release
on:
  push:
    branches: [main]
jobs:
  rogue:
    uses: evil-org/reusable-workflow/.github/workflows/publish.yml@v1
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - run: docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "P2-FORBIDDEN-REUSABLE-WORKFLOW",
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if release-images.yml contains forbidden container publishing commands", () => {
    for (const forbiddenCommand of [
      "docker buildx build --push -t docker.io/rogue/image .",
      "docker image push ghcr.io/georgekgk2/life-commerce:123",
      "podman push ghcr.io/georgekgk2/life-commerce:123",
      "crane push image.tar ghcr.io/georgekgk2/life-commerce:123",
      "oras push ghcr.io/georgekgk2/life-commerce:123",
      "skopeo copy docker-archive:image.tar docker://ghcr.io/georgekgk2/life-commerce:123",
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-forbidden-publish-cmd-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
        writeFileSync(
          join(tempDir, ".github", "workflows", "release-images.yml"),
          `name: Release
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - run: ${forbiddenCommand}
      - run: docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
`,
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some(
            (v) => v.rule === "P2-FORBIDDEN-PUBLISH-COMMAND",
          ),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails in Phase P2 if docker push uses variable or dynamic target", () => {
    for (const dynamicTarget of [
      "docker push $IMAGE_TARGET",
      "docker push ${IMAGE_NAME}:latest",
      "docker push $(cat image.txt)",
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-dynamic-target-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
        writeFileSync(
          join(tempDir, ".github", "workflows", "release-images.yml"),
          `name: Release
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - run: ${dynamicTarget}
      - run: docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
`,
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some(
            (v) => v.rule === "P2-UNAUTHORIZED-IMAGE-REPO",
          ),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails in Phase P2 if docker push is attempted in a non-publish job in release-images.yml", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-push-rogue-job-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "release-images.yml"),
        `name: Release
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - run: docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "P2-UNAUTHORIZED-PUBLISH-JOB"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if chained push via && or || contains unauthorized registry target", () => {
    for (const chainedCmd of [
      "docker push ghcr.io/georgekgk2/life-commerce:sha-${{ github.sha }} && docker push docker.io/rogue/image:latest",
      "docker push ghcr.io/georgekgk2/life-commerce:sha-${{ github.sha }} || docker push docker.io/rogue/image:latest",
      "docker push ghcr.io/georgekgk2/life-commerce:sha-${{ github.sha }}; docker push docker.io/rogue/image:latest",
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-chained-push-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
        writeFileSync(
          join(tempDir, ".github", "workflows", "release-images.yml"),
          `name: Release
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - run: ${chainedCmd}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
`,
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some(
            (v) => v.rule === "P2-UNAUTHORIZED-IMAGE-REPO",
          ),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails in Phase P2 if push commands are only in shell comments", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-comment-push-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "release-images.yml"),
        `name: Release
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - run: |
          # docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}
          # docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
          echo "Done"
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "P2-MISSING-EXPECTED-IMAGE-PUSH",
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if secondary workflow contains write-all, id-token: write, or other write permissions", () => {
    for (const writePerm of [
      "permissions: write-all",
      "permissions:\n      id-token: write",
      "permissions:\n      attestations: write",
      "permissions:\n      contents: write",
      "permissions:\n      actions: write",
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-secondary-write-perms-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
        writeFileSync(
          join(tempDir, ".github", "workflows", "ci.yml"),
          `name: CI
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    ${writePerm}
    steps:
      - run: echo "testing"
`,
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some(
            (v) => v.rule === "P2-SECONDARY-WORKFLOW-WRITE-PERMISSIONS",
          ),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails in Phase P2 if secondary workflow contains docker buildx --push or docker push", () => {
    for (const forbiddenPub of [
      "docker buildx build --push -t ghcr.io/georgekgk2/life-commerce:sha-${{ github.sha }} .",
      "docker push ghcr.io/georgekgk2/life-commerce:sha-${{ github.sha }}",
      "docker image push ghcr.io/georgekgk2/life-commerce:sha-${{ github.sha }}",
      "podman push ghcr.io/georgekgk2/life-commerce:sha-${{ github.sha }}",
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-secondary-publish-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
        writeFileSync(
          join(tempDir, ".github", "workflows", "ci.yml"),
          `name: CI
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: ${forbiddenPub}
`,
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some(
            (v) =>
              v.rule === "P2-FORBIDDEN-PUBLISH-COMMAND" ||
              v.rule === "P2-UNAUTHORIZED-PUBLISH-WORKFLOW",
          ),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails in Phase P2 if release-images.yml pushes mutable tags (like :latest or :dev)", () => {
    for (const mutableTag of [
      "docker push ghcr.io/georgekgk2/life-commerce:latest",
      "docker push ghcr.io/georgekgk2/life-commerce:dev",
      "docker push ghcr.io/georgekgk2/life-commerce:v1.0.0",
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-mutable-tag-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
        writeFileSync(
          join(tempDir, ".github", "workflows", "release-images.yml"),
          `name: Release
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - run: ${mutableTag}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
`,
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some((v) => v.rule === "P2-MUTABLE-IMAGE-TAG"),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails in Phase P2 if release-images.yml uses non-exact commit tags like sha-manual or sha-anything", () => {
    for (const badTag of [
      "docker push ghcr.io/georgekgk2/life-commerce:sha-manual",
      "docker push ghcr.io/georgekgk2/life-commerce:sha-anything",
      "docker push ghcr.io/georgekgk2/life-commerce:sha-123",
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-nonexact-tag-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
        writeFileSync(
          join(tempDir, ".github", "workflows", "release-images.yml"),
          `name: Release
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - run: ${badTag}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
`,
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some((v) => v.rule === "P2-MUTABLE-IMAGE-TAG"),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("fails in Phase P2 if push commands are wrapped in echo or printf strings", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-string-wrapped-push-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "release-images.yml"),
        `name: Release
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - run: |
          echo "docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}"
          printf 'docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}\\n'
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "P2-MISSING-EXPECTED-IMAGE-PUSH",
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if arbitrary external actions are used even if pinned to 40-char SHA", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-p2-unauthorized-action-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      const p2Gates = createValidPolicyGates();
      p2Gates["allow_ghcr_image_push"] = true;
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED_PHASE_P2",
          gates: p2Gates,
        }),
      );

      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "release-images.yml"),
        `name: Release
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - uses: evil-org/steal-token@0123456789abcdef0123456789abcdef01234567
      - run: docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
`,
      );

      const result = scanDeploymentContainment(tempDir);
      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "P2-UNAUTHORIZED-ACTION"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails in Phase P2 if docker/login-action specifies registry other than ghcr.io or omits registry", () => {
    for (const loginConfig of [
      "with:\n          registry: docker.io",
      "with:\n          registry: quay.io",
      "with:\n          username: test",
    ]) {
      const tempDir = mkdtempSync(
        join(tmpdir(), "life-containment-p2-bad-login-registry-"),
      );
      try {
        mkdirSync(join(tempDir, "infra"), { recursive: true });
        const p2Gates = createValidPolicyGates();
        p2Gates["allow_ghcr_image_push"] = true;
        writeFileSync(
          join(tempDir, "infra", "deployment-policy.json"),
          JSON.stringify({
            status: "CONTAINED_PHASE_P2",
            gates: p2Gates,
          }),
        );

        mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
        writeFileSync(
          join(tempDir, ".github", "workflows", "release-images.yml"),
          `name: Release
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
    steps:
      - uses: docker/login-action@c94ce9fb468520275223c153574b00df6fe4bcc9
        ${loginConfig}
      - run: docker push ghcr.io/georgekgk2/life-commerce:sha-\${{ github.sha }}
      - run: docker push ghcr.io/georgekgk2/life-storefront:sha-\${{ github.sha }}
`,
        );

        const result = scanDeploymentContainment(tempDir);
        expect(result.valid).toBe(false);
        expect(
          result.violations.some(
            (v) => v.rule === "P2-UNAUTHORIZED-REGISTRY-LOGIN",
          ),
        ).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
});
