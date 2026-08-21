import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  getCatalogSnapshot,
  getCatalogProductsBySlugs,
} from "../src/catalog/server";

describe("storefront src/catalog/server.ts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns ready snapshot from fixtures by default or when CATALOG_SOURCE=fixtures", async () => {
    process.env["CATALOG_SOURCE"] = "fixtures";
    const result = await getCatalogSnapshot();

    expect(result.kind).toBe("ready");
    if (result.kind === "ready") {
      expect(result.snapshot.source).toBe("fixtures");
      expect(result.snapshot.categories.length).toBe(6);
      expect(result.snapshot.products.length).toBe(12);
      expect(result.snapshot.products.every((p) => p.isSynthetic)).toBe(true);
    }
  });
  it("fails closed in production even when synthetic catalog mode is explicit", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
      CATALOG_SOURCE: "fixtures",
      ALLOW_SYNTHETIC_CATALOG: "true",
    };

    const result = await getCatalogSnapshot();
    expect(result.kind).toBe("unavailable");
    if (result.kind === "unavailable") {
      expect(result.reason).toBe("missing_configuration");
    }
  });

  it("returns unavailable when CATALOG_SOURCE=medusa and MEDUSA_BACKEND_URL is missing", async () => {
    process.env["CATALOG_SOURCE"] = "medusa";
    delete process.env["MEDUSA_BACKEND_URL"];

    const result = await getCatalogSnapshot();
    expect(result.kind).toBe("unavailable");
    if (result.kind === "unavailable") {
      expect(result.reason).toBe("missing_configuration");
    }
  });
  it("does not read Medusa without explicit synthetic catalog mode", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "test",
      CATALOG_SOURCE: "medusa",
      MEDUSA_BACKEND_URL: "http://127.0.0.1:9000",
    };
    delete process.env["ALLOW_SYNTHETIC_CATALOG"];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCatalogSnapshot();

    expect(result).toEqual({
      kind: "unavailable",
      source: "medusa",
      reason: "missing_configuration",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("returns unavailable when Medusa endpoint responds with non-200 or invalid payload without falling back to fixtures", async () => {
    process.env["CATALOG_SOURCE"] = "medusa";
    process.env["ALLOW_SYNTHETIC_CATALOG"] = "true";
    process.env["MEDUSA_BACKEND_URL"] = "http://127.0.0.1:9000";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCatalogSnapshot();
    expect(result.kind).toBe("unavailable");
    if (result.kind === "unavailable") {
      expect(result.reason).toBe("upstream_error");
    }
  });

  it("filters catalog products by slugs cleanly", async () => {
    process.env["CATALOG_SOURCE"] = "fixtures";
    const slugs = ["futbolka-svitlo", "shoper-razom"];
    const result = await getCatalogProductsBySlugs(slugs);

    expect(result.kind).toBe("ready");
    if (result.kind === "ready") {
      expect(result.snapshot.products.length).toBe(2);
      expect(result.snapshot.products.map((p) => p.slug)).toEqual(
        expect.arrayContaining(slugs),
      );
    }
  });
});
