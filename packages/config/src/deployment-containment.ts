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

export const PERMITTED_GHCR_REPOSITORIES: readonly string[] = Object.freeze([
  "ghcr.io/georgekgk2/life-commerce",
  "ghcr.io/georgekgk2/life-storefront",
]);

export const MANDATORY_POLICY_GATES: readonly string[] = Object.freeze([
  "allow_remote_deployment",
  "allow_ssh_execution",
  "allow_ghcr_image_push",
  "allow_production_dns_tls",
  "allow_live_payment_gateway",
  "allow_live_shipping_api",
  "allow_live_fiscalization",
]);

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

const freezePattern = (pattern: RegExp): Readonly<RegExp> =>
  Object.freeze(pattern);

export const FORBIDDEN_REMOTE_COMMAND_PATTERNS: readonly Readonly<RegExp>[] =
  Object.freeze([
    freezePattern(/\b(ssh|rsync|scp|sftp)(\.exe)?\b/i),
    freezePattern(/\bdocker\s+(-H|--host|--context)\b/i),
    freezePattern(/\bdocker\s+context\b/i),
    freezePattern(
      /\b(execFile|execFileSync|spawn|spawnSync)\s*\(\s*["'](ssh|rsync|scp|sftp|docker)["']/i,
    ),
    freezePattern(
      /\b(exec|execSync)\s*\(\s*["'`][^"'`]*\b(ssh|rsync|scp|sftp|docker)\b/i,
    ),
  ]);

export const FORBIDDEN_SCRIPT_FILENAMES: readonly string[] = Object.freeze([
  "deploy_prod.sh",
  "remote-setup.sh",
  "rollback.sh",
  "deploy-colocated-prod.sh",
]);

function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parts = dateStr.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d || y < 2020 || m < 1 || m > 12 || d < 1 || d > 31)
    return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() + 1 === m &&
    date.getUTCDate() === d
  );
}

export function scanDeploymentContainment(
  rootDir: string,
): DeploymentContainmentResult {
  const violations: DeploymentContainmentViolation[] = [];

  // 1. Validate infra/deployment-policy.json
  let policyStatus = "CONTAINED";
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
      const isValidStatus =
        parsed.status === "CONTAINED" || parsed.status === "CONTAINED_PHASE_P2";
      if (!isValidStatus) {
        violations.push({
          rule: "P0-POLICY-STATUS",
          path: "infra/deployment-policy.json",
          message: `Expected status to be "CONTAINED" or "CONTAINED_PHASE_P2", got "${parsed.status}".`,
        });
      } else {
        policyStatus = parsed.status;
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

        if (parsed.status === "CONTAINED") {
          // In Phase P0, all gates must be locked (false)
          for (const [gateName, gateValue] of Object.entries(parsed.gates)) {
            if (gateValue !== false) {
              violations.push({
                rule: "P0-GATE-LOCKED",
                path: "infra/deployment-policy.json",
                message: `In Phase P0 ("CONTAINED"), gate "${gateName}" must be false, but got ${gateValue}.`,
              });
            }
          }
        } else if (parsed.status === "CONTAINED_PHASE_P2") {
          // In Phase P2, allow_ghcr_image_push must be true
          if (parsed.gates["allow_ghcr_image_push"] !== true) {
            violations.push({
              rule: "P2-GATE-STATE",
              path: "infra/deployment-policy.json",
              message: `In Phase P2 ("CONTAINED_PHASE_P2"), gate "allow_ghcr_image_push" must be true, but got ${parsed.gates["allow_ghcr_image_push"]}.`,
            });
          }
          // All other gates must remain locked (false)
          for (const [gateName, gateValue] of Object.entries(parsed.gates)) {
            if (gateName === "allow_ghcr_image_push") continue;
            if (gateValue !== false) {
              violations.push({
                rule: "P0-GATE-LOCKED",
                path: "infra/deployment-policy.json",
                message: `In Phase P2 ("CONTAINED_PHASE_P2"), gate "${gateName}" must remain false, but got ${gateValue}.`,
              });
            }
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
        const fullPath = join(workflowsDir, file);
        const relPath = `.github/workflows/${file}`;
        const content = readFileSync(fullPath, "utf-8");

        if (content.includes("appleboy/ssh-action")) {
          violations.push({
            rule: "P0-NO-SSH-ACTION",
            path: relPath,
            message: `Forbidden appleboy/ssh-action found in ${relPath}.`,
          });
        }
        if (content.includes("docker/build-push-action")) {
          violations.push({
            rule: "P0-NO-BUILD-PUSH-ACTION",
            path: relPath,
            message: `Forbidden docker/build-push-action found in ${relPath}.`,
          });
        }
        if (
          content.includes("DEPLOY_HOST") ||
          content.includes("DEPLOY_USER") ||
          content.includes("DEPLOY_SSH_KEY")
        ) {
          violations.push({
            rule: "P0-NO-DEPLOY-SECRETS",
            path: relPath,
            message: `Forbidden deployment secret reference found in ${relPath}.`,
          });
        }
        if (content.includes("skip_tests:")) {
          violations.push({
            rule: "P0-NO-SKIP-TESTS",
            path: relPath,
            message: `Forbidden skip_tests input found in ${relPath}.`,
          });
        }
        if (content.includes("pull_request_target")) {
          violations.push({
            rule: "P0-NO-PR-TARGET",
            path: relPath,
            message: `Forbidden pull_request_target trigger found in ${relPath}.`,
          });
        }

        const hasPackagesWrite = /packages:\s*write/.test(content);

        if (policyStatus === "CONTAINED") {
          if (hasPackagesWrite) {
            violations.push({
              rule: "P0-NO-PACKAGES-WRITE",
              path: relPath,
              message: `Forbidden "packages: write" permission found in ${relPath} in Phase P0.`,
            });
          }
        } else if (policyStatus === "CONTAINED_PHASE_P2") {
          if (file === "release-images.yml") {
            const lines = content.split("\n");
            let inTopLevelPermissions = false;
            let inJobs = false;
            let currentJob = "";
            let inJobPermissions = false;

            for (const line of lines) {
              if (/^permissions:\s*$/.test(line)) {
                inTopLevelPermissions = true;
              } else if (/^[a-zA-Z0-9_-]+:/.test(line) && !/^\s+/.test(line)) {
                inTopLevelPermissions = false;
              }
              if (
                inTopLevelPermissions &&
                /(packages|attestations|id-token):\s*write/.test(line)
              ) {
                violations.push({
                  rule: "P2-TOPLEVEL-WRITE-PERMISSIONS",
                  path: relPath,
                  message: `Top-level write permission is forbidden in ${relPath}. Permissions must be scoped strictly to the publish job.`,
                });
                break;
              }

              if (/^jobs:\s*$/.test(line)) {
                inJobs = true;
                continue;
              }
              if (inJobs && /^ {2}([a-zA-Z0-9_-]+):\s*$/.test(line)) {
                const match = line.match(/^ {2}([a-zA-Z0-9_-]+):\s*$/);
                currentJob = match && match[1] ? match[1] : "";
                inJobPermissions = false;
                continue;
              }
              if (inJobs && /^ {4}permissions:\s*$/.test(line)) {
                inJobPermissions = true;
                continue;
              } else if (inJobs && /^ {4}[a-zA-Z0-9_-]+:/.test(line)) {
                inJobPermissions = false;
              }

              if (
                inJobs &&
                inJobPermissions &&
                /(packages|attestations|id-token):\s*write/.test(line)
              ) {
                if (currentJob !== "publish") {
                  violations.push({
                    rule: "P2-JOB-FORBIDDEN-WRITE-PERMISSIONS",
                    path: relPath,
                    message: `Job "${currentJob}" in ${relPath} is not permitted to have write permissions. Only job "publish" may have write permissions in Phase P2.`,
                  });
                }
              }
            }

            if (
              content.includes("workflow_dispatch") ||
              content.includes("schedule:") ||
              content.includes("pull_request:") ||
              /pull_request\s*:/i.test(content)
            ) {
              violations.push({
                rule: "P2-FORBIDDEN-TRIGGER",
                path: relPath,
                message: `Workflow ${relPath} contains unapproved trigger. In Phase P2, triggers must be restricted strictly to push on main.`,
              });
            }

            const usesMatches = content.matchAll(/uses:\s*([^\s#]+)/g);
            for (const match of usesMatches) {
              const actionRef = match[1];
              if (
                !actionRef ||
                actionRef.startsWith("./") ||
                actionRef.startsWith("docker://")
              )
                continue;
              const isPinnedSha =
                /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*@[0-9a-f]{40}$/i.test(
                  actionRef,
                );
              if (!isPinnedSha) {
                violations.push({
                  rule: "P2-MUTABLE-ACTION-REF",
                  path: relPath,
                  message: `Action reference "${actionRef}" in ${relPath} is not pinned to an immutable 40-character commit SHA.`,
                });
              }
            }

            if (!content.includes("ghcr.io/georgekgk2/life-commerce")) {
              violations.push({
                rule: "P2-MISSING-EXPECTED-IMAGE-PUSH",
                path: relPath,
                message: `Workflow ${relPath} is missing required push for "ghcr.io/georgekgk2/life-commerce".`,
              });
            }
            if (!content.includes("ghcr.io/georgekgk2/life-storefront")) {
              violations.push({
                rule: "P2-MISSING-EXPECTED-IMAGE-PUSH",
                path: relPath,
                message: `Workflow ${relPath} is missing required push for "ghcr.io/georgekgk2/life-storefront".`,
              });
            }

            const repoMatches = content.matchAll(
              /ghcr\.io\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/g,
            );
            for (const match of repoMatches) {
              const repo = match[0];
              if (
                !(PERMITTED_GHCR_REPOSITORIES as readonly string[]).includes(
                  repo,
                )
              ) {
                violations.push({
                  rule: "P2-UNAUTHORIZED-IMAGE-REPO",
                  path: relPath,
                  message: `Unauthorized GHCR image repository "${repo}" in ${relPath}. Only approved repositories are permitted.`,
                });
              }
            }
          } else {
            // Any other workflow file must NOT contain packages: write
            if (hasPackagesWrite) {
              violations.push({
                rule: "P0-UNAUTHORIZED-PUBLISH-WORKFLOW",
                path: relPath,
                message: `Forbidden "packages: write" permission found in unauthorized workflow ${relPath}. Only .github/workflows/release-images.yml may publish in Phase P2.`,
              });
            }
          }
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

  // 5. Scan .trivyignore for structured metadata and non-expired entries
  const trivyignorePath = join(rootDir, ".trivyignore");
  if (existsSync(trivyignorePath)) {
    const content = readFileSync(trivyignorePath, "utf-8");
    const lines = content.split("\n");
    const todayStr = new Date().toISOString().slice(0, 10);

    let lastComment = "";

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i] ?? "";
      const trimmed = rawLine.trim();

      if (!trimmed) {
        lastComment = "";
        continue;
      }

      if (trimmed.startsWith("#")) {
        lastComment = trimmed;
        continue;
      }

      // Active suppression line
      const cveMatch = trimmed.match(
        /^(CVE-\d{4}-\d+)(?:\s+exp:(\d{4}-\d{2}-\d{2}))?$/i,
      );
      if (!cveMatch || !cveMatch[1]) {
        violations.push({
          rule: "P0-TRIVYIGNORE-INVALID-SYNTAX",
          path: ".trivyignore",
          message: `Invalid syntax in .trivyignore at line ${i + 1}: "${trimmed}". Expected "CVE-YYYY-XXXXX" or "CVE-YYYY-XXXXX exp:YYYY-MM-DD".`,
        });
        lastComment = "";
        continue;
      }

      const cveId = cveMatch[1];
      const inlineExp = cveMatch[2] ?? null;

      let itemExpires = inlineExp;
      let itemReason: string | null = null;
      let itemOwner: string | null = null;

      if (lastComment) {
        const commentExpMatch = lastComment.match(
          /expires:\s*(\d{4}-\d{2}-\d{2})/i,
        );
        if (commentExpMatch && commentExpMatch[1])
          itemExpires = commentExpMatch[1];
        const commentReasonMatch = lastComment.match(/reason:\s*([^|]+)/i);
        if (commentReasonMatch && commentReasonMatch[1])
          itemReason = commentReasonMatch[1].trim();
        const commentOwnerMatch = lastComment.match(/owner:\s*([^|]+)/i);
        if (commentOwnerMatch && commentOwnerMatch[1])
          itemOwner = commentOwnerMatch[1].trim();
      }

      if (!itemExpires || !itemReason || !itemOwner) {
        violations.push({
          rule: "P0-TRIVYIGNORE-UNANNOTATED",
          path: ".trivyignore",
          message: `Suppression entry "${cveId}" at line ${i + 1} is missing mandatory metadata (reason, owner, expires).`,
        });
      } else if (!isValidCalendarDate(itemExpires)) {
        violations.push({
          rule: "P0-TRIVYIGNORE-INVALID-DATE",
          path: ".trivyignore",
          message: `Suppression entry "${cveId}" at line ${i + 1} has invalid calendar expiration date "${itemExpires}".`,
        });
      } else if (itemExpires < todayStr) {
        violations.push({
          rule: "P0-TRIVYIGNORE-EXPIRED",
          path: ".trivyignore",
          message: `Suppression entry "${cveId}" at line ${i + 1} has expired on ${itemExpires}.`,
        });
      }

      lastComment = ""; // Strictly reset after consuming for this entry!
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
