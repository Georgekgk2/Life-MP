import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
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

/**
 * SECURITY NOTICE & BOUNDARY SPECIFICATION:
 * This deployment containment scanner is a repository-local static defense-in-depth preflight control.
 * It verifies repository invariants, files, and scripts against Phase P0 containment policy constraints.
 * It DOES NOT constitute an autonomous security boundary or sovereign authorization.
 * Sovereign containment and authorization rely upon:
 * 1. Protected branch enforcement (disallowing unreviewed merges);
 * 2. Independent peer review and explicit operator authorization (reviewDecision);
 * 3. Isolated, trusted CI runners (GitHub-hosted ubuntu-latest).
 *
 * NOTE ON ALLOWLISTED SCRIPTS:
 * The allowlist of approved repository scripts (`PERMITTED_SCRIPT_PATHS`) permits approved script paths
 * in the repository to pass the containment gate. It enforces containment against remote deployment
 * commands (SSH, rsync, Docker contexts), but does not isolate arbitrary outbound network calls
 * (e.g. external generative APIs in generate-marketplace-images.mjs) or local child processes.
 */

export const MANDATORY_POLICY_GATES = [
  "allow_remote_deployment",
  "allow_ssh_execution",
  "allow_ghcr_image_push",
  "allow_production_dns_tls",
  "allow_live_payment_gateway",
  "allow_live_shipping_api",
  "allow_live_fiscalization",
] as const;

export const PERMITTED_SCRIPT_PATHS: readonly string[] = Object.freeze([
  "scripts/check-docs.mjs",
  "scripts/generate-marketplace-images.mjs",
  "scripts/generate-pwa-icons.mjs",
  "scripts/test-fresh-state-repro.sh",
  "scripts/verify-deployment-containment.mjs",
  "scripts/with-commerce-migration-test-env.sh",
  "scripts/with-commerce-test-env.sh",
  "scripts/with-local-commerce-env.sh",
]);

// Private module-scoped set for fast O(1) lookups; not exported to prevent runtime prototype/slot mutations
const PERMITTED_SCRIPTS_LOOKUP: ReadonlySet<string> = new Set<string>(
  PERMITTED_SCRIPT_PATHS,
);

export function isPermittedScript(relPath: string): boolean {
  return PERMITTED_SCRIPTS_LOOKUP.has(relPath);
}

export function getPermittedScripts(): readonly string[] {
  return [...PERMITTED_SCRIPT_PATHS];
}

export const FORBIDDEN_REMOTE_COMMAND_PATTERNS = [
  /\b(ssh|rsync|scp|sftp)(\.exe)?\b/i,
  /\bdocker\s+(-H|--host|--context)\b/i,
  /\bdocker\s+context\b/i,
  /\b(execFile|execFileSync|spawn|spawnSync)\s*\(\s*["'](ssh|rsync|scp|sftp|docker)["']/i,
  /\b(exec|execSync)\s*\(\s*["'`][^"'`]*\b(ssh|rsync|scp|sftp|docker)\b/i,
] as const;

export const FORBIDDEN_SCRIPT_FILENAMES = [
  "deploy_prod.sh",
  "remote-setup.sh",
  "rollback.sh",
  "deploy-colocated-prod.sh",
] as const;

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
        // Enforce mandatory policy gates schema
        for (const mandatoryGate of MANDATORY_POLICY_GATES) {
          if (!(mandatoryGate in parsed.gates)) {
            violations.push({
              rule: "P0-GATE-MISSING",
              path: "infra/deployment-policy.json",
              message: `Mandatory gate "${mandatoryGate}" is missing from deployment policy.`,
            });
          }
        }

        // Enforce all gates must be locked (false)
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

  // 4. Scan scripts directory and subdirectories for forbidden remote deployment scripts or remote commands
  const scriptsDir = join(rootDir, "scripts");
  let scriptsStat;
  try {
    scriptsStat = lstatSync(scriptsDir);
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code !== "ENOENT"
    ) {
      violations.push({
        rule: "P0-CANONICAL-PATH-ERROR",
        path: "scripts",
        message: `Failed to stat scripts path: ${String(err)}`,
      });
    }
  }

  if (scriptsStat) {
    if (scriptsStat.isSymbolicLink()) {
      violations.push({
        rule: "P0-FORBIDDEN-SYMLINK",
        path: "scripts",
        message: `The scripts path "scripts" is a symbolic link. Symbolic links are strictly forbidden for the scripts root to prevent directory traversal and allowlist bypass.`,
      });
    } else if (!scriptsStat.isDirectory()) {
      violations.push({
        rule: "P0-NON-REGULAR-FILE",
        path: "scripts",
        message: `The scripts path "scripts" is not a directory. In contained state, scripts must be a standard directory.`,
      });
    } else {
      let canScanScriptsDir = true;
      try {
        const canonicalScriptsDir = realpathSync(scriptsDir);
        const canonicalRootDir = realpathSync(rootDir);
        const expectedScriptsDir = join(canonicalRootDir, "scripts");
        if (canonicalScriptsDir !== expectedScriptsDir) {
          violations.push({
            rule: "P0-PATH-TRAVERSAL",
            path: "scripts",
            message: `The scripts directory canonical path "${canonicalScriptsDir}" does not match expected path "${expectedScriptsDir}".`,
          });
          canScanScriptsDir = false;
        }
      } catch (err) {
        violations.push({
          rule: "P0-CANONICAL-PATH-ERROR",
          path: "scripts",
          message: `Failed to resolve canonical path for scripts directory: ${String(err)}`,
        });
        canScanScriptsDir = false;
      }

      if (canScanScriptsDir) {
        const scanDir = (dir: string) => {
          const entries = readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            const relPath = fullPath
              .substring(rootDir.length + 1)
              .replace(/\\/g, "/");

            if (entry.isSymbolicLink()) {
              violations.push({
                rule: "P0-FORBIDDEN-SYMLINK",
                path: relPath,
                message: `Symbolic link "${relPath}" detected in scripts directory. Symbolic links are strictly forbidden in contained state to prevent path traversal and allowlist bypass.`,
              });
              continue;
            }

            if (entry.isDirectory()) {
              try {
                const canonicalSubDir = realpathSync(fullPath);
                const normalizedScriptsDir = realpathSync(scriptsDir);
                if (!canonicalSubDir.startsWith(normalizedScriptsDir + "/")) {
                  violations.push({
                    rule: "P0-PATH-TRAVERSAL",
                    path: relPath,
                    message: `Path traversal detected: subdirectory "${relPath}" resolves outside of scripts directory to "${canonicalSubDir}".`,
                  });
                  continue;
                }
              } catch (err) {
                violations.push({
                  rule: "P0-CANONICAL-PATH-ERROR",
                  path: relPath,
                  message: `Failed to resolve canonical path for subdirectory "${relPath}": ${String(err)}`,
                });
                continue;
              }
              scanDir(fullPath);
            } else if (entry.isFile()) {
              // Verify canonical path to prevent path traversal
              try {
                const canonicalPath = realpathSync(fullPath);
                const normalizedScriptsDir = realpathSync(scriptsDir);
                if (!canonicalPath.startsWith(normalizedScriptsDir)) {
                  violations.push({
                    rule: "P0-PATH-TRAVERSAL",
                    path: relPath,
                    message: `Path traversal detected: "${relPath}" resolves outside of scripts directory to "${canonicalPath}".`,
                  });
                  continue;
                }
              } catch (err) {
                violations.push({
                  rule: "P0-CANONICAL-PATH-ERROR",
                  path: relPath,
                  message: `Failed to resolve canonical path for "${relPath}": ${String(err)}`,
                });
                continue;
              }

              const lowerName = entry.name.toLowerCase();

              // Check against permitted local scripts allowlist
              if (!isPermittedScript(relPath)) {
                violations.push({
                  rule: "P0-UNAUTHORIZED-SCRIPT",
                  path: relPath,
                  message: `Unauthorized script "${relPath}" detected in scripts directory. In contained state, only approved repository scripts are permitted.`,
                });
              }

              // Check filename patterns for explicit deployment/remote intent
              const isForbiddenFilename =
                (FORBIDDEN_SCRIPT_FILENAMES as readonly string[]).includes(
                  entry.name,
                ) ||
                lowerName.startsWith("deploy") ||
                lowerName.startsWith("remote") ||
                lowerName.startsWith("rollback") ||
                lowerName.startsWith("release");

              if (isForbiddenFilename) {
                violations.push({
                  rule: "P0-NO-REMOTE-SCRIPTS",
                  path: relPath,
                  message: `Forbidden remote execution script "${relPath}" must not exist in contained state.`,
                });
              }

              // Check script content for remote execution commands
              try {
                const content = readFileSync(fullPath, "utf-8");
                for (const pattern of FORBIDDEN_REMOTE_COMMAND_PATTERNS) {
                  if (pattern.test(content)) {
                    violations.push({
                      rule: "P0-NO-REMOTE-COMMANDS",
                      path: relPath,
                      message: `Forbidden remote execution command pattern (${pattern.toString()}) detected in "${relPath}".`,
                    });
                    break;
                  }
                }
              } catch (err) {
                violations.push({
                  rule: "P0-SCRIPT-READ-ERROR",
                  path: relPath,
                  message: `Failed to read script file "${relPath}": ${String(err)}`,
                });
              }
            } else {
              violations.push({
                rule: "P0-NON-REGULAR-FILE",
                path: relPath,
                message: `Non-regular file entry "${relPath}" detected in scripts directory. Only standard regular files are permitted.`,
              });
            }
          }
        };
        scanDir(scriptsDir);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
