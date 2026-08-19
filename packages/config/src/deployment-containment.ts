import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type DeploymentContainmentViolation = Readonly<{
  rule: string;
  path: string;
  message: string;
}>;

export type DeploymentContainmentResult = Readonly<{
  valid: boolean;
  violations: readonly DeploymentContainmentViolation[];
}>;

export type DeploymentPolicyFile = Readonly<{
  version: string;
  policy_name: string;
  status: string;
  gates: Record<string, boolean>;
}>;

export function scanDeploymentContainment(
  rootDir: string,
): DeploymentContainmentResult {
  const violations: DeploymentContainmentViolation[] = [];

  // 1. Validate infra/deployment-policy.json
  const policyPath = join(rootDir, "infra", "deployment-policy.json");
  if (!existsSync(policyPath)) {
    violations.push({
      rule: "P0-POLICY-EXISTS",
      path: "infra/deployment-policy.json",
      message:
        "Deployment policy file infra/deployment-policy.json is missing.",
    });
  } else {
    try {
      const raw = readFileSync(policyPath, "utf-8");
      const parsed = JSON.parse(raw) as DeploymentPolicyFile;
      if (parsed.status !== "CONTAINED") {
        violations.push({
          rule: "P0-POLICY-STATUS",
          path: "infra/deployment-policy.json",
          message: `Expected status to be "CONTAINED", got "${parsed.status}".`,
        });
      }
      if (!parsed.gates || typeof parsed.gates !== "object") {
        violations.push({
          rule: "P0-POLICY-GATES",
          path: "infra/deployment-policy.json",
          message: "Gates object is missing or invalid in deployment policy.",
        });
      } else {
        for (const [gateName, gateValue] of Object.entries(parsed.gates)) {
          if (gateValue !== false) {
            violations.push({
              rule: "P0-GATE-LOCKED",
              path: "infra/deployment-policy.json",
              message: `Gate "${gateName}" must be false, but got ${gateValue}.`,
            });
          }
        }
      }
    } catch (err) {
      violations.push({
        rule: "P0-POLICY-JSON",
        path: "infra/deployment-policy.json",
        message: `Failed to parse deployment policy JSON: ${String(err)}`,
      });
    }
  }

  // 2. Scan .github/workflows for active deployment actions or forbidden deploy workflows
  const workflowsDir = join(rootDir, ".github", "workflows");
  if (existsSync(workflowsDir)) {
    const files = readdirSync(workflowsDir);
    for (const file of files) {
      if (
        file === "deploy.yml" ||
        file === "deploy.yaml" ||
        file === "release.yml" ||
        file === "release.yaml"
      ) {
        violations.push({
          rule: "P0-NO-DEPLOY-WORKFLOW",
          path: `.github/workflows/${file}`,
          message: `Active deploy workflow .github/workflows/${file} must not exist in contained state.`,
        });
      }

      if (file.endsWith(".yml") || file.endsWith(".yaml")) {
        const content = readFileSync(join(workflowsDir, file), "utf-8");
        if (content.includes("appleboy/ssh-action")) {
          violations.push({
            rule: "P0-NO-SSH-ACTION",
            path: `.github/workflows/${file}`,
            message: `Forbidden appleboy/ssh-action found in .github/workflows/${file}.`,
          });
        }
        if (content.includes("docker/build-push-action")) {
          violations.push({
            rule: "P0-NO-BUILD-PUSH-ACTION",
            path: `.github/workflows/${file}`,
            message: `Forbidden docker/build-push-action found in .github/workflows/${file}.`,
          });
        }
        if (content.includes("packages: write")) {
          violations.push({
            rule: "P0-NO-PACKAGES-WRITE",
            path: `.github/workflows/${file}`,
            message: `Forbidden "packages: write" permission found in .github/workflows/${file}.`,
          });
        }
        if (
          content.includes("DEPLOY_HOST") ||
          content.includes("DEPLOY_USER") ||
          content.includes("DEPLOY_SSH_KEY")
        ) {
          violations.push({
            rule: "P0-NO-DEPLOY-SECRETS",
            path: `.github/workflows/${file}`,
            message: `Forbidden deployment secret reference found in .github/workflows/${file}.`,
          });
        }
        if (content.includes("skip_tests:")) {
          violations.push({
            rule: "P0-NO-SKIP-TESTS",
            path: `.github/workflows/${file}`,
            message: `Forbidden skip_tests input found in .github/workflows/${file}.`,
          });
        }
      }
    }
  }

  // 3. Scan Makefile for fail-closed deploy targets
  const makefilePath = join(rootDir, "Makefile");
  if (existsSync(makefilePath)) {
    const makeContent = readFileSync(makefilePath, "utf-8");
    if (makeContent.includes("gh workflow run deploy.yml")) {
      violations.push({
        rule: "P0-MAKEFILE-NO-GH-DISPATCH",
        path: "Makefile",
        message: 'Makefile must not contain "gh workflow run deploy.yml".',
      });
    }
  }

  // 4. Scan scripts/deploy for forbidden remote execution scripts
  const scriptsDeployDir = join(rootDir, "scripts", "deploy");
  if (existsSync(scriptsDeployDir)) {
    const scriptFiles = readdirSync(scriptsDeployDir);
    for (const file of scriptFiles) {
      if (
        file === "remote-setup.sh" ||
        file === "rollback.sh" ||
        file === "deploy-colocated-prod.sh"
      ) {
        violations.push({
          rule: "P0-NO-REMOTE-SCRIPTS",
          path: `scripts/deploy/${file}`,
          message: `Forbidden remote execution script scripts/deploy/${file} must not exist.`,
        });
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
