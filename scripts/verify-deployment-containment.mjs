#!/usr/bin/env node
/**
 * SECURITY NOTICE:
 * This script is a repository-local defense-in-depth preflight check.
 * It verifies Phase P0 and Phase P2 containment policy invariants.
 * It DOES NOT constitute sovereign security authorization.
 * Sovereign enforcement relies on branch protection, independent peer review, and isolated CI runners.
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { scanDeploymentContainment } from "../packages/config/dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

const result = scanDeploymentContainment(rootDir);

if (!result.valid) {
  console.error(
    "❌ DEPLOYMENT CONTAINMENT CHECK FAILED (Containment Gate):",
  );
  for (const v of result.violations) {
    console.error(`  [${v.rule}] ${v.path}: ${v.message}`);
  }
  process.exit(1);
}

console.log(
  "✅ Deployment containment check passed: All capability gates conform to containment policy.",
);
process.exit(0);
