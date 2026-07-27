import { describe, expect, it } from "vitest";
import { assertSyntheticSeedAllowed } from "../src/scripts/seed-guard";

describe("assertSyntheticSeedAllowed", () => {
  it("refuses production synthetic seed before write", () => {
    expect(() =>
      assertSyntheticSeedAllowed({
        nodeEnv: "production",
        allowSyntheticCatalog: true,
      }),
    ).toThrow(
      "[seed-guard] Synthetic catalog seeding is strictly forbidden in production mode.",
    );
  });

  it("refuses development seed without ALLOW_SYNTHETIC_CATALOG=true", () => {
    expect(() =>
      assertSyntheticSeedAllowed({
        nodeEnv: "development",
        allowSyntheticCatalog: "false",
      }),
    ).toThrow(
      "[seed-guard] Synthetic seed requires ALLOW_SYNTHETIC_CATALOG=true environment flag.",
    );
  });

  it("allows synthetic seed in development mode with ALLOW_SYNTHETIC_CATALOG=true", () => {
    expect(() =>
      assertSyntheticSeedAllowed({
        nodeEnv: "development",
        allowSyntheticCatalog: "true",
      }),
    ).not.toThrow();
  });

  it("allows synthetic seed in test mode with ALLOW_SYNTHETIC_CATALOG=true", () => {
    expect(() =>
      assertSyntheticSeedAllowed({
        nodeEnv: "test",
        allowSyntheticCatalog: true,
      }),
    ).not.toThrow();
  });
});
