import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanDeploymentContainment } from "../src/deployment-containment.js";

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
          gates: {
            allow_remote_deployment: false,
            allow_ssh_execution: false,
          },
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

  it("fails when any gate in deployment-policy is true", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "life-containment-fail-gate-"));
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          version: "1.0.0",
          status: "CONTAINED",
          gates: {
            allow_remote_deployment: true,
          },
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
          gates: { allow_remote_deployment: false },
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
          gates: { allow_remote_deployment: false },
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

  it("fails when forbidden scripts exist in scripts/deploy", () => {
    const tempDir = mkdtempSync(
      join(tmpdir(), "life-containment-fail-scripts-"),
    );
    try {
      mkdirSync(join(tempDir, "infra"), { recursive: true });
      writeFileSync(
        join(tempDir, "infra", "deployment-policy.json"),
        JSON.stringify({
          status: "CONTAINED",
          gates: { allow_remote_deployment: false },
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
});
