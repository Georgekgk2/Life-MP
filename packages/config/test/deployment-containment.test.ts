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

  it("enforces that production scanner mandatory gates exactly match expected specification", () => {
    expect([...MANDATORY_POLICY_GATES].sort()).toEqual(
      [...EXPECTED_POLICY_GATES].sort(),
    );
    expect(MANDATORY_POLICY_GATES.length).toBe(7);
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
});
