import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { load as loadYaml } from "js-yaml";
import { z } from "zod";

export const DEMO_UPDATE_ID = "DEMO-UPDATE-d3b5afec" as const;
export const DEMO_UPDATE_ENVIRONMENT = "public-demo" as const;
export const DEMO_UPDATE_HOST = "34.139.21.224" as const;
export const DEMO_UPDATE_SSH_USER = "medgemma-user" as const;
export const DEMO_UPDATE_PUBLIC_ORIGIN = "https://life-mp.pp.ua" as const;
export const DEMO_UPDATE_SOURCE_COMMIT =
  "d3b5afec16a043fcb9192bfbbc8c882628c8b831" as const;
export const DEMO_UPDATE_RELEASE_RUN_ID = 36925554797 as const;
export const DEMO_UPDATE_COMPOSE_PATH =
  "deploy/docker-compose.prod.yml" as const;
export const DEMO_UPDATE_PROJECT_NAME = "life-mp" as const;
export const DEMO_UPDATE_HOST_DEPLOY_DIRECTORY =
  "/opt/life-mp/current/deploy" as const;
export const DEMO_UPDATE_HOST_BACKUP_DIRECTORY =
  "/var/backups/life-mp/demo-d3b5afec" as const;

export const DEMO_UPDATE_COMMERCE_IMAGE =
  "ghcr.io/georgekgk2/life-commerce@sha256:d1a7c65d58a3b1244f04d273c1921e7a278b932b8274265086e98be49ba76bb3" as const;
export const DEMO_UPDATE_STOREFRONT_IMAGE =
  "ghcr.io/georgekgk2/life-storefront@sha256:545473fc7cb3d5a53a7f21a4ddf7db1d4cbe4a2f5c5fcb689bb88fdd69f1c076" as const;

export const DEMO_UPDATE_RUNNER_PATH =
  "scripts/promote-public-demo.mjs" as const;
export const DEMO_UPDATE_REMOTE_SCRIPT_PATH =
  "infra/scripts/promote-public-demo.sh" as const;

export const DEMO_UPDATE_OPERATIONS = [
  "discovery",
  "promote",
  "verify",
  "rollback",
] as const;

export const DemoUpdateAuthorizationSchema = z
  .object({
    id: z.literal(DEMO_UPDATE_ID),
    environment: z.literal(DEMO_UPDATE_ENVIRONMENT),
    host: z.literal(DEMO_UPDATE_HOST),
    ssh_user: z.literal(DEMO_UPDATE_SSH_USER),
    public_origin: z.literal(DEMO_UPDATE_PUBLIC_ORIGIN),
    source_commit: z.literal(DEMO_UPDATE_SOURCE_COMMIT),
    release_run_id: z.literal(DEMO_UPDATE_RELEASE_RUN_ID),
    compose_path: z.literal(DEMO_UPDATE_COMPOSE_PATH),
    project_name: z.literal(DEMO_UPDATE_PROJECT_NAME),
    host_deploy_directory: z.literal(DEMO_UPDATE_HOST_DEPLOY_DIRECTORY),
    host_backup_directory: z.literal(DEMO_UPDATE_HOST_BACKUP_DIRECTORY),
    images: z
      .object({
        commerce: z.literal(DEMO_UPDATE_COMMERCE_IMAGE),
        storefront: z.literal(DEMO_UPDATE_STOREFRONT_IMAGE),
      })
      .strict(),
    operations: z.tuple([
      z.literal("discovery"),
      z.literal("promote"),
      z.literal("verify"),
      z.literal("rollback"),
    ]),
    runner: z
      .object({
        path: z.literal(DEMO_UPDATE_RUNNER_PATH),
        sha256: z
          .string()
          .regex(
            /^[0-9a-f]{64}$/,
            "runner.sha256 must be a 64-character lowercase hex SHA-256 hash",
          ),
      })
      .strict(),
    remote_script: z
      .object({
        path: z.literal(DEMO_UPDATE_REMOTE_SCRIPT_PATH),
        sha256: z
          .string()
          .regex(
            /^[0-9a-f]{64}$/,
            "remote_script.sha256 must be a 64-character lowercase hex SHA-256 hash",
          ),
      })
      .strict(),
  })
  .strict();

export type DemoUpdateAuthorization = z.infer<
  typeof DemoUpdateAuthorizationSchema
>;

export const REQUIRED_P2_POLICY_GATES: Readonly<Record<string, boolean>> =
  Object.freeze({
    allow_remote_deployment: false,
    allow_ssh_execution: false,
    allow_ghcr_image_push: true,
    allow_production_dns_tls: false,
    allow_live_payment_gateway: false,
    allow_live_shipping_api: false,
    allow_live_fiscalization: false,
  });

const ComposeProjectionSchema = z
  .object({
    services: z
      .object({
        commerce: z
          .object({
            image: z.literal(DEMO_UPDATE_COMMERCE_IMAGE),
          })
          .passthrough(),
        storefront: z
          .object({
            image: z.literal(DEMO_UPDATE_STOREFRONT_IMAGE),
            environment: z
              .object({
                LIFE_RUNTIME_ENV: z.literal("public-demo"),
                CATALOG_SOURCE: z.literal("fixtures"),
                ALLOW_PUBLIC_DEMO_CATALOG: z.literal("true"),
                ALLOW_SYNTHETIC_CATALOG: z.literal("false"),
              })
              .passthrough(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

function checkedFile(rootDir: string, relPath: string): string {
  if (
    relPath.startsWith("/") ||
    relPath.startsWith("\\") ||
    relPath.split(/[/\\]/).includes("..")
  ) {
    throw new Error(`Path "${relPath}" contains illegal traversal patterns.`);
  }

  const segments = relPath.split(/[/\\]+/).filter(Boolean);
  let current = rootDir;
  for (const segment of segments) {
    current = join(current, segment);
    let st;
    try {
      st = lstatSync(current);
    } catch (err) {
      throw new Error(
        `Path "${relPath}" cannot be accessed at "${current}": ${String(err)}`,
        { cause: err },
      );
    }
    if (st.isSymbolicLink()) {
      throw new Error(
        `Path "${relPath}" contains symbolic link at "${current}". Symbolic links are strictly forbidden.`,
      );
    }
  }

  const finalStat = lstatSync(current);
  if (!finalStat.isFile()) {
    throw new Error(`Path "${relPath}" is not a regular file.`);
  }

  const canonicalTarget = realpathSync(current);
  const canonicalRoot = realpathSync(rootDir);
  if (
    !canonicalTarget.startsWith(canonicalRoot + "/") &&
    canonicalTarget !== canonicalRoot
  ) {
    throw new Error(
      `Path "${relPath}" canonical target escapes root directory.`,
    );
  }

  return canonicalTarget;
}

export function readDemoUpdateAuthorization(
  rootDir: string,
): DemoUpdateAuthorization {
  if (typeof rootDir !== "string" || rootDir.trim().length === 0) {
    throw new Error(
      "Invalid root directory path provided to authorization helper.",
    );
  }

  const policyCanonical = checkedFile(rootDir, "infra/deployment-policy.json");
  let policyRaw: string;
  try {
    policyRaw = readFileSync(policyCanonical, "utf-8");
  } catch (err) {
    throw new Error(`Failed to read deployment policy file: ${String(err)}`, {
      cause: err,
    });
  }

  let policyObj: unknown;
  try {
    policyObj = JSON.parse(policyRaw);
  } catch (err) {
    throw new Error(`Failed to parse deployment policy JSON: ${String(err)}`, {
      cause: err,
    });
  }

  if (!policyObj || typeof policyObj !== "object" || Array.isArray(policyObj)) {
    throw new Error("Deployment policy JSON must be an object.");
  }

  const policyRecord = policyObj as Record<string, unknown>;

  if (
    !("scoped_demo_update" in policyRecord) ||
    policyRecord["scoped_demo_update"] === undefined
  ) {
    throw new Error('Deployment policy does not define "scoped_demo_update".');
  }

  const grant = DemoUpdateAuthorizationSchema.parse(
    policyRecord["scoped_demo_update"],
  );

  const status = policyRecord["status"];
  if (status !== "CONTAINED_PHASE_P2") {
    throw new Error(
      `Scoped demo update authorization rejected: status must be "CONTAINED_PHASE_P2", but got "${String(status)}".`,
    );
  }

  const gates = policyRecord["gates"];
  if (!gates || typeof gates !== "object" || Array.isArray(gates)) {
    throw new Error("Deployment policy gates are missing or invalid.");
  }
  const gatesRecord = gates as Record<string, unknown>;

  for (const [gateName, expectedValue] of Object.entries(
    REQUIRED_P2_POLICY_GATES,
  )) {
    if (gatesRecord[gateName] !== expectedValue) {
      throw new Error(
        `Policy gate "${gateName}" must be ${expectedValue}, but got ${String(gatesRecord[gateName])}.`,
      );
    }
  }

  for (const [gateName, gateValue] of Object.entries(gatesRecord)) {
    if (gateName === "allow_ghcr_image_push") continue;
    if (gateValue !== false) {
      throw new Error(`Global gate "${gateName}" must remain locked (false).`);
    }
  }

  // Verify runner script hash
  const runnerCanonical = checkedFile(rootDir, grant.runner.path);
  const runnerHash = createHash("sha256")
    .update(readFileSync(runnerCanonical))
    .digest("hex");
  if (runnerHash.toLowerCase() !== grant.runner.sha256.toLowerCase()) {
    throw new Error(
      `Artifact SHA256 mismatch for "${grant.runner.path}": expected ${grant.runner.sha256}, got ${runnerHash}.`,
    );
  }

  // Verify remote payload script hash
  const remoteCanonical = checkedFile(rootDir, grant.remote_script.path);
  const remoteHash = createHash("sha256")
    .update(readFileSync(remoteCanonical))
    .digest("hex");
  if (remoteHash.toLowerCase() !== grant.remote_script.sha256.toLowerCase()) {
    throw new Error(
      `Artifact SHA256 mismatch for "${grant.remote_script.path}": expected ${grant.remote_script.sha256}, got ${remoteHash}.`,
    );
  }

  // Verify Compose binding and fixtures flags
  const composeCanonical = checkedFile(rootDir, grant.compose_path);
  let composeDoc: unknown;
  try {
    composeDoc = loadYaml(readFileSync(composeCanonical, "utf-8"));
  } catch (err) {
    throw new Error(`Failed to parse Compose YAML: ${String(err)}`, {
      cause: err,
    });
  }
  ComposeProjectionSchema.parse(composeDoc);

  return grant;
}
