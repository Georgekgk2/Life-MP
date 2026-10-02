#!/usr/bin/env node
// Operator-only, merged-main preflight; not a sovereign authorization boundary.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readDemoUpdateAuthorization } from "../packages/config/dist/demo-update-authorization.js";
import { scanDeploymentContainment } from "../packages/config/dist/deployment-containment.js";
import { assertDemoReleaseProvenance } from "../packages/config/dist/demo-release-provenance.js";
import { demoUpdateSshOptions } from "../packages/config/dist/demo-update-transport.js";

const { z } = createRequire(
  new URL("../packages/config/package.json", import.meta.url),
)("zod");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function run(binary, args, capture = false) {
  const result = spawnSync(binary, args, {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${binary} failed (${result.status ?? result.signal})`);
  return result.stdout?.trim() ?? "";
}
function quote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

try {
  const args = z
    .union([
      z.tuple([z.enum(["discovery", "verify", "rollback"])]),
      z.tuple([z.literal("promote"), z.string().min(1)]),
    ])
    .parse(process.argv.slice(2));
  const operation = args[0];
  const authorization = readDemoUpdateAuthorization(root);
  const containment = scanDeploymentContainment(root);
  if (!containment.valid) {
    throw new Error(
      `Containment denied: ${containment.violations.map((v) => v.rule).join(", ")}`,
    );
  }
  if (run("git", ["status", "--porcelain", "--untracked-files=all"], true)) {
    throw new Error(
      "Use a clean merged-main checkout; no remote operation was started.",
    );
  }
  const origin = run("git", ["remote", "get-url", "origin"], true);
  if (
    !/^(https:\/\/github\.com\/Georgekgk2\/Life-MP(?:\.git)?|git@github\.com:Georgekgk2\/Life-MP(?:\.git)?)$/.test(
      origin,
    )
  ) {
    throw new Error("Origin must be Georgekgk2/Life-MP on GitHub.");
  }
  run("git", ["fetch", "origin", "main"]);
  if (
    run("git", ["rev-parse", "HEAD"], true) !==
    run("git", ["rev-parse", "FETCH_HEAD"], true)
  ) {
    throw new Error(
      "The executable scope must be merged into main; checkout the fetched main commit first.",
    );
  }

  if (operation === "promote") {
    const issuer = "https://token.actions.githubusercontent.com";
    const identity =
      "https://github.com/Georgekgk2/Life-MP/.github/workflows/release-images.yml@refs/heads/main";
    const type = "https://slsa.dev/provenance/v1";
    const manifest = z
      .object({
        sourceCommit: z.literal(authorization.source_commit),
        provenance: z.object({
          attestationType: z.literal(type),
          certificateIssuer: z.literal(issuer),
          certificateIdentity: z.literal(identity),
        }),
        images: z.object({
          commerce: z.object({
            repository: z.literal("ghcr.io/georgekgk2/life-commerce"),
            digest: z.string(),
          }),
          storefront: z.object({
            repository: z.literal("ghcr.io/georgekgk2/life-storefront"),
            digest: z.string(),
          }),
        }),
      })
      .parse(JSON.parse(readFileSync(resolve(args[1]), "utf8")));
    for (const service of ["commerce", "storefront"]) {
      const image = manifest.images[service];
      if (
        `${image.repository}@${image.digest}` !== authorization.images[service]
      ) {
        throw new Error(
          `Manifest ${service} digest does not match the scoped grant.`,
        );
      }
    }
    z.object({
      headSha: z.literal(authorization.source_commit),
      headBranch: z.literal("main"),
      event: z.literal("push"),
      status: z.literal("completed"),
      conclusion: z.literal("success"),
    }).parse(
      JSON.parse(
        run(
          "gh",
          [
            "run",
            "view",
            String(authorization.release_run_id),
            "--repo",
            "Georgekgk2/Life-MP",
            "--json",
            "headSha,headBranch,event,status,conclusion",
          ],
          true,
        ),
      ),
    );
    for (const image of Object.values(authorization.images)) {
      const output = run(
        "cosign",
        [
          "verify-attestation",
          "--type",
          type,
          "--certificate-oidc-issuer",
          issuer,
          "--certificate-identity",
          identity,
          image,
        ],
        true,
      );
      assertDemoReleaseProvenance(output, image, authorization.source_commit);
    }
  }

  const payload = readFileSync(
    resolve(root, authorization.remote_script.path),
    "utf8",
  );
  const compose = readFileSync(
    resolve(root, authorization.compose_path),
  ).toString("base64");
  const command = `bash -Eeuo pipefail -c ${quote(payload)} -- ${quote(operation)} ${quote(compose)}`;
  run("ssh", [
    ...demoUpdateSshOptions(
      authorization,
      operation === "promote" && Boolean(process.stdin.isTTY),
    ),
    command,
  ]);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Demo operation denied.",
  );
  process.exitCode = 1;
}
