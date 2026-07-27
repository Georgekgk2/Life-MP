export type SeedGuardOptions = {
  nodeEnv?: string | undefined;
  allowSyntheticCatalog?: string | boolean | undefined;
};

export function assertSyntheticSeedAllowed(options: SeedGuardOptions): void {
  const env = options.nodeEnv ?? process.env["NODE_ENV"];
  const allowSynthetic =
    String(
      options.allowSyntheticCatalog ?? process.env["ALLOW_SYNTHETIC_CATALOG"],
    ) === "true";

  if (env === "production") {
    throw new Error(
      "[seed-guard] Synthetic catalog seeding is strictly forbidden in production mode.",
    );
  }

  if (env !== "development" && env !== "test") {
    throw new Error(
      `[seed-guard] Synthetic seed allowed only in 'development' or 'test' mode, got '${env}'.`,
    );
  }

  if (!allowSynthetic) {
    throw new Error(
      "[seed-guard] Synthetic seed requires ALLOW_SYNTHETIC_CATALOG=true environment flag.",
    );
  }
}
