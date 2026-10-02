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
import { createHash } from "node:crypto";
import { readDemoUpdateAuthorization } from "../src/demo-update-authorization.js";
import { scanDeploymentContainment } from "../src/deployment-containment.js";

const CONTRACT_RUNNER_PATH = "scripts/promote-public-demo.mjs";
const CONTRACT_REMOTE_SCRIPT_PATH = "infra/scripts/promote-public-demo.sh";
const CONTRACT_COMPOSE_PATH = "deploy/docker-compose.prod.yml";

const CONTRACT_P2_GATES = Object.freeze({
  allow_remote_deployment: false,
  allow_ssh_execution: false,
  allow_ghcr_image_push: true,
  allow_production_dns_tls: false,
  allow_live_payment_gateway: false,
  allow_live_shipping_api: false,
  allow_live_fiscalization: false,
});

const DEFAULT_RUNNER_SCRIPT = `#!/usr/bin/env node
// Real promote-public-demo.mjs runner script
import { execFileSync } from "node:child_process";
console.log("Starting scoped demo update DEMO-UPDATE-d3b5afec");
execFileSync("ssh", ["medgemma-user@34.139.21.224", "whoami"], { stdio: "inherit" });
`;

const DEFAULT_REMOTE_SCRIPT = `#!/usr/bin/env bash
# Real promote-public-demo.sh remote script
set -euo pipefail
echo "Executing promote-public-demo remote payload"
docker compose -f /opt/life-mp/current/deploy/docker-compose.prod.yml pull
docker compose -f /opt/life-mp/current/deploy/docker-compose.prod.yml up -d
`;

const DEFAULT_COMPOSE_YAML = `services:
  postgres:
    image: postgres:16-alpine@sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685
  redis:
    image: redis:7-alpine@sha256:ff02b58f971e7d7d156a1267e283fcbbeee91773b6aa36c49dac28ecfe28eadf
  commerce:
    image: ghcr.io/georgekgk2/life-commerce@sha256:d1a7c65d58a3b1244f04d273c1921e7a278b932b8274265086e98be49ba76bb3
    environment:
      NODE_ENV: production
  storefront:
    image: ghcr.io/georgekgk2/life-storefront@sha256:545473fc7cb3d5a53a7f21a4ddf7db1d4cbe4a2f5c5fcb689bb88fdd69f1c076
    environment:
      NODE_ENV: production
      LIFE_RUNTIME_ENV: public-demo
      CATALOG_SOURCE: fixtures
      ALLOW_PUBLIC_DEMO_CATALOG: "true"
      ALLOW_SYNTHETIC_CATALOG: "false"
`;

function setupFixture(
  dir: string,
  options: {
    status?: string;
    gates?: Record<string, boolean>;
    grantOverrides?: Record<string, unknown>;
    includeGrant?: boolean;
    runnerContent?: string;
    remoteContent?: string;
    composeYaml?: string;
  } = {},
) {
  const {
    status = "CONTAINED_PHASE_P2",
    gates = { ...CONTRACT_P2_GATES },
    grantOverrides = {},
    includeGrant = true,
    runnerContent = DEFAULT_RUNNER_SCRIPT,
    remoteContent = DEFAULT_REMOTE_SCRIPT,
    composeYaml = DEFAULT_COMPOSE_YAML,
  } = options;

  // Write runner script
  mkdirSync(join(dir, "scripts"), { recursive: true });
  writeFileSync(join(dir, CONTRACT_RUNNER_PATH), runnerContent);

  // Write remote script
  mkdirSync(join(dir, "infra", "scripts"), { recursive: true });
  writeFileSync(join(dir, CONTRACT_REMOTE_SCRIPT_PATH), remoteContent);

  // Write Compose file
  mkdirSync(join(dir, "deploy"), { recursive: true });
  writeFileSync(join(dir, CONTRACT_COMPOSE_PATH), composeYaml);

  // Build policy file
  const runnerHash = createHash("sha256").update(runnerContent).digest("hex");
  const remoteHash = createHash("sha256").update(remoteContent).digest("hex");

  const policy: Record<string, unknown> = {
    version: "1.0.0",
    policy_name: "Phase P2 Deployment Policy with Bounded Demo Update",
    status,
    gates,
  };

  if (includeGrant) {
    policy["scoped_demo_update"] = {
      id: "DEMO-UPDATE-d3b5afec",
      environment: "public-demo",
      host: "34.139.21.224",
      ssh_user: "medgemma-user",
      public_origin: "https://life-mp.pp.ua",
      source_commit: "d3b5afec16a043fcb9192bfbbc8c882628c8b831",
      release_run_id: 36925554797,
      compose_path: CONTRACT_COMPOSE_PATH,
      project_name: "life-mp",
      host_deploy_directory: "/opt/life-mp/current/deploy",
      host_backup_directory: "/var/backups/life-mp/demo-d3b5afec",
      images: {
        commerce:
          "ghcr.io/georgekgk2/life-commerce@sha256:d1a7c65d58a3b1244f04d273c1921e7a278b932b8274265086e98be49ba76bb3",
        storefront:
          "ghcr.io/georgekgk2/life-storefront@sha256:545473fc7cb3d5a53a7f21a4ddf7db1d4cbe4a2f5c5fcb689bb88fdd69f1c076",
      },
      operations: ["discovery", "promote", "verify", "rollback"],
      runner: {
        path: CONTRACT_RUNNER_PATH,
        sha256: runnerHash,
      },
      remote_script: {
        path: CONTRACT_REMOTE_SCRIPT_PATH,
        sha256: remoteHash,
      },
      ...grantOverrides,
    };
  }

  writeFileSync(
    join(dir, "infra", "deployment-policy.json"),
    JSON.stringify(policy, null, 2),
  );
}

describe("DEMO-UPDATE-d3b5afec authorization & containment integration", () => {
  it("passes scanner and authorization when valid bounded grant is present", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-pass-"));
    try {
      setupFixture(tempDir);

      const grant = readDemoUpdateAuthorization(tempDir);
      expect(grant.id).toBe("DEMO-UPDATE-d3b5afec");
      expect(grant.environment).toBe("public-demo");
      expect(grant.host).toBe("34.139.21.224");
      expect(grant.images.commerce).toBe(
        "ghcr.io/georgekgk2/life-commerce@sha256:d1a7c65d58a3b1244f04d273c1921e7a278b932b8274265086e98be49ba76bb3",
      );
      expect(grant.images.storefront).toBe(
        "ghcr.io/georgekgk2/life-storefront@sha256:545473fc7cb3d5a53a7f21a4ddf7db1d4cbe4a2f5c5fcb689bb88fdd69f1c076",
      );

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(true);
      expect(scanResult.violations).toEqual([]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when wrong host is specified in grant", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-bad-host-"));
    try {
      setupFixture(tempDir, {
        grantOverrides: { host: "34.139.21.225" },
      });

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when wrong source_commit is specified in grant", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-bad-commit-"));
    try {
      setupFixture(tempDir, {
        grantOverrides: {
          source_commit: "0000000000000000000000000000000000000000",
        },
      });

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when wrong commerce or storefront image is specified in grant", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-bad-image-"));
    try {
      setupFixture(tempDir, {
        grantOverrides: {
          images: {
            commerce:
              "ghcr.io/georgekgk2/life-commerce@sha256:0000000000000000000000000000000000000000000000000000000000000000",
            storefront:
              "ghcr.io/georgekgk2/life-storefront@sha256:545473fc7cb3d5a53a7f21a4ddf7db1d4cbe4a2f5c5fcb689bb88fdd69f1c076",
          },
        },
      });

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
  it("fails when release_run_id is a string instead of number (contract requires number only)", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-str-runid-"));
    try {
      setupFixture(tempDir, {
        grantOverrides: {
          release_run_id: "36925554797",
        },
      });

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when wrong operations are specified in grant", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-bad-ops-"));
    try {
      setupFixture(tempDir, {
        grantOverrides: {
          operations: ["discovery", "promote", "destroy", "rollback"],
        },
      });

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when unknown fields are present in grant (strict Zod rejection)", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-unknown-fields-"));
    try {
      setupFixture(tempDir, {
        grantOverrides: {
          unauthorized_extra_capability: "unrestricted_shell",
        },
      });

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when runner script content is altered (hash mismatch)", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-runner-hash-"));
    try {
      setupFixture(tempDir);
      // Alter runner content after policy creation
      writeFileSync(
        join(tempDir, CONTRACT_RUNNER_PATH),
        DEFAULT_RUNNER_SCRIPT + "\n// unexpected modification\n",
      );

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
      // When grant is invalid, the runner script also triggers unauthorized script/commands violations
      expect(
        scanResult.violations.some((v) => v.rule === "P0-UNAUTHORIZED-SCRIPT"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when remote payload script content is altered (hash mismatch)", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-remote-hash-"));
    try {
      setupFixture(tempDir);
      // Alter remote script payload content
      writeFileSync(
        join(tempDir, CONTRACT_REMOTE_SCRIPT_PATH),
        DEFAULT_REMOTE_SCRIPT + "\n# payload tampering\n",
      );

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when runner script is a symlink", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-runner-symlink-"));
    try {
      setupFixture(tempDir);
      const runnerPath = join(tempDir, CONTRACT_RUNNER_PATH);
      const targetPath = join(tempDir, "scripts", "target-runner.mjs");
      rmSync(runnerPath);
      writeFileSync(targetPath, DEFAULT_RUNNER_SCRIPT);
      symlinkSync(targetPath, runnerPath);

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when remote payload script is a symlink", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-remote-symlink-"));
    try {
      setupFixture(tempDir);
      const remotePath = join(tempDir, CONTRACT_REMOTE_SCRIPT_PATH);
      const targetPath = join(tempDir, "infra", "scripts", "target-remote.sh");
      rmSync(remotePath);
      writeFileSync(targetPath, DEFAULT_REMOTE_SCRIPT);
      symlinkSync(targetPath, remotePath);

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when Compose file is a symlink", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-compose-symlink-"));
    try {
      setupFixture(tempDir);
      const composePath = join(tempDir, CONTRACT_COMPOSE_PATH);
      const targetPath = join(tempDir, "deploy", "target-compose.yml");
      rmSync(composePath);
      writeFileSync(targetPath, DEFAULT_COMPOSE_YAML);
      symlinkSync(targetPath, composePath);

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when Compose image does not match grant image pin", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-bad-compose-image-"));
    try {
      const badComposeYaml = DEFAULT_COMPOSE_YAML.replace(
        "ghcr.io/georgekgk2/life-commerce@sha256:d1a7c65d58a3b1244f04d273c1921e7a278b932b8274265086e98be49ba76bb3",
        "ghcr.io/georgekgk2/life-commerce:latest",
      );
      setupFixture(tempDir, { composeYaml: badComposeYaml });

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when Compose mode is not public-demo or fixtures flags are missing", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-bad-compose-mode-"));
    try {
      const badComposeYaml = DEFAULT_COMPOSE_YAML.replace(
        "LIFE_RUNTIME_ENV: public-demo",
        "LIFE_RUNTIME_ENV: production",
      );
      setupFixture(tempDir, { composeYaml: badComposeYaml });

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("still strictly forbids other arbitrary scripts and workflows even with valid grant", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-other-scripts-"));
    try {
      setupFixture(tempDir);

      // Add an unauthorized script
      writeFileSync(
        join(tempDir, "scripts", "unauthorized-remote.sh"),
        '#!/usr/bin/env bash\nssh root@evil.com "rm -rf /"\n',
      );

      // Add a forbidden workflow
      mkdirSync(join(tempDir, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(tempDir, ".github", "workflows", "deploy.yml"),
        "name: Deploy\non: push\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n",
      );

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      // The authorized runner itself is NOT flagged:
      expect(
        scanResult.violations.some((v) => v.path === CONTRACT_RUNNER_PATH),
      ).toBe(false);
      // But the unauthorized script IS flagged:
      expect(
        scanResult.violations.some(
          (v) =>
            v.path === "scripts/unauthorized-remote.sh" &&
            v.rule === "P0-UNAUTHORIZED-SCRIPT",
        ),
      ).toBe(true);
      expect(
        scanResult.violations.some(
          (v) =>
            v.path === "scripts/unauthorized-remote.sh" &&
            v.rule === "P0-NO-REMOTE-COMMANDS",
        ),
      ).toBe(true);
      // And the deploy workflow IS flagged:
      expect(
        scanResult.violations.some((v) => v.rule === "P0-NO-DEPLOY-WORKFLOW"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails grant when policy status is CONTAINED (Phase P0)", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-p0-fail-"));
    try {
      setupFixture(tempDir, {
        status: "CONTAINED",
        gates: {
          ...CONTRACT_P2_GATES,
          allow_ghcr_image_push: false,
        },
      });

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails grant when mandatory global gates are opened or missing", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-gates-fail-"));
    try {
      // Globally open allow_ssh_execution
      setupFixture(tempDir, {
        gates: {
          ...CONTRACT_P2_GATES,
          allow_ssh_execution: true,
        },
      });

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      const scanResult = scanDeploymentContainment(tempDir);
      expect(scanResult.valid).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(true);
      expect(
        scanResult.violations.some((v) => v.rule === "P0-GATE-LOCKED"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("throws when deployment policy does not contain scoped_demo_update", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "demo-auth-no-grant-"));
    try {
      setupFixture(tempDir, { includeGrant: false });

      expect(() => readDemoUpdateAuthorization(tempDir)).toThrow();

      // When grant is omitted, standard containment scanning applies (no P2-DEMO-SCOPE violation)
      const scanResult = scanDeploymentContainment(tempDir);
      // Since runner has ssh, it will be flagged under normal containment
      expect(
        scanResult.violations.some((v) => v.rule === "P2-DEMO-SCOPE"),
      ).toBe(false);
      expect(
        scanResult.violations.some((v) => v.rule === "P0-UNAUTHORIZED-SCRIPT"),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
