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
    delete process.env["LIFE_E2E"];

    const result = await getCatalogSnapshot();
    expect(result.kind).toBe("unavailable");
    if (result.kind === "unavailable") {
      expect(result.reason).toBe("missing_configuration");
    }
  });

  it("fails closed when production receives LIFE_E2E without synthetic permission", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
      CATALOG_SOURCE: "fixtures",
      LIFE_E2E: "true",
    };
    delete process.env["ALLOW_SYNTHETIC_CATALOG"];

    const result = await getCatalogSnapshot();
    expect(result.kind).toBe("unavailable");
    if (result.kind === "unavailable") {
      expect(result.reason).toBe("missing_configuration");
    }
  });

  it("allows fixtures only for an explicit test runtime in a production build", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
      LIFE_RUNTIME_ENV: "test",
      CATALOG_SOURCE: "fixtures",
      ALLOW_SYNTHETIC_CATALOG: "true",
      LIFE_E2E: "true",
    };

    const result = await getCatalogSnapshot();

    expect(result.kind).toBe("ready");
    if (result.kind === "ready") {
      expect(result.snapshot.source).toBe("fixtures");
      expect(result.snapshot.products.length).toBe(12);
    }
  });

  it("fails closed when a production build is mislabeled as development runtime", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
      LIFE_RUNTIME_ENV: "development",
      CATALOG_SOURCE: "fixtures",
      ALLOW_SYNTHETIC_CATALOG: "true",
      LIFE_E2E: "true",
    };

    const result = await getCatalogSnapshot();

    expect(result).toEqual({
      kind: "unavailable",
      source: "medusa",
      reason: "missing_configuration",
    });
  });

  it("fails closed when production E2E flags target the Medusa source", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
      CATALOG_SOURCE: "medusa",
      MEDUSA_BACKEND_URL: "http://127.0.0.1:9000",
      ALLOW_SYNTHETIC_CATALOG: "true",
      LIFE_E2E: "true",
    };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCatalogSnapshot();
    expect(result.kind).toBe("unavailable");
    if (result.kind === "unavailable") {
      expect(result.reason).toBe("missing_configuration");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed for production fixtures even with both explicit E2E switches", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
      CATALOG_SOURCE: "fixtures",
      ALLOW_SYNTHETIC_CATALOG: "true",
      LIFE_E2E: "true",
    };

    const result = await getCatalogSnapshot();

    expect(result).toEqual({
      kind: "unavailable",
      source: "medusa",
      reason: "missing_configuration",
    });
  });

  it("fails closed when the explicit runtime is production", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
      LIFE_RUNTIME_ENV: "production",
      CATALOG_SOURCE: "fixtures",
      ALLOW_SYNTHETIC_CATALOG: "true",
      LIFE_E2E: "true",
    };

    const result = await getCatalogSnapshot();

    expect(result).toEqual({
      kind: "unavailable",
      source: "medusa",
      reason: "missing_configuration",
    });
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

  describe("public-demo catalog mode contract", () => {
    it("returns ready snapshot from fixtures when all public-demo flags are active", async () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        LIFE_RUNTIME_ENV: "public-demo",
        CATALOG_SOURCE: "fixtures",
        ALLOW_PUBLIC_DEMO_CATALOG: "true",
      };

      const result = await getCatalogSnapshot();
      expect(result.kind).toBe("ready");
      if (result.kind === "ready") {
        expect(result.snapshot.source).toBe("fixtures");
        expect(result.snapshot.categories.length).toBe(6);
        expect(result.snapshot.products.length).toBe(12);
        expect(result.snapshot.products.every((p) => p.isSynthetic)).toBe(true);
      }
    });

    it("fails closed in standard production even when CATALOG_SOURCE=fixtures", async () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        CATALOG_SOURCE: "fixtures",
      };
      delete process.env["LIFE_RUNTIME_ENV"];
      delete process.env["ALLOW_PUBLIC_DEMO_CATALOG"];

      const result = await getCatalogSnapshot();
      expect(result).toEqual({
        kind: "unavailable",
        source: "medusa",
        reason: "missing_configuration",
      });
    });

    it("fails closed in public-demo when ALLOW_PUBLIC_DEMO_CATALOG is missing or false", async () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        LIFE_RUNTIME_ENV: "public-demo",
        CATALOG_SOURCE: "fixtures",
      };
      delete process.env["ALLOW_PUBLIC_DEMO_CATALOG"];

      const result = await getCatalogSnapshot();
      expect(result).toEqual({
        kind: "unavailable",
        source: "medusa",
        reason: "missing_configuration",
      });
    });

    it("fails closed in public-demo when CATALOG_SOURCE is unset/defaulted without explicit configuration", async () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        LIFE_RUNTIME_ENV: "public-demo",
        ALLOW_PUBLIC_DEMO_CATALOG: "true",
      };
      delete process.env["CATALOG_SOURCE"];

      const result = await getCatalogSnapshot();
      expect(result).toEqual({
        kind: "unavailable",
        source: "medusa",
        reason: "missing_configuration",
      });
    });

    it("does not call Medusa backend in public-demo mode", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      process.env = {
        ...process.env,
        NODE_ENV: "production",
        LIFE_RUNTIME_ENV: "public-demo",
        CATALOG_SOURCE: "fixtures",
        ALLOW_PUBLIC_DEMO_CATALOG: "true",
        MEDUSA_BACKEND_URL: "http://127.0.0.1:9000",
      };

      const result = await getCatalogSnapshot();
      expect(result.kind).toBe("ready");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("does not fall back to fixtures when CATALOG_SOURCE=medusa in public-demo", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      process.env = {
        ...process.env,
        NODE_ENV: "production",
        LIFE_RUNTIME_ENV: "public-demo",
        CATALOG_SOURCE: "medusa",
        ALLOW_PUBLIC_DEMO_CATALOG: "true",
      };

      const result = await getCatalogSnapshot();
      expect(result).toEqual({
        kind: "unavailable",
        source: "medusa",
        reason: "missing_configuration",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("does not activate public-demo branch when NODE_ENV=development", async () => {
      process.env = {
        ...process.env,
        NODE_ENV: "development",
        LIFE_RUNTIME_ENV: "public-demo",
        CATALOG_SOURCE: "fixtures",
        ALLOW_PUBLIC_DEMO_CATALOG: "true",
      };
      delete process.env["ALLOW_SYNTHETIC_CATALOG"];

      const result = await getCatalogSnapshot();
      expect(result).toEqual({
        kind: "unavailable",
        source: "medusa",
        reason: "missing_configuration",
      });
    });

    it("does not activate public-demo branch when NODE_ENV=test", async () => {
      process.env = {
        ...process.env,
        NODE_ENV: "test",
        LIFE_RUNTIME_ENV: "public-demo",
        CATALOG_SOURCE: "fixtures",
        ALLOW_PUBLIC_DEMO_CATALOG: "true",
      };
      delete process.env["ALLOW_SYNTHETIC_CATALOG"];

      const result = await getCatalogSnapshot();
      expect(result).toEqual({
        kind: "unavailable",
        source: "medusa",
        reason: "missing_configuration",
      });
    });

    it("does not activate public-demo branch when NODE_ENV is unset", async () => {
      process.env = {
        ...process.env,
        LIFE_RUNTIME_ENV: "public-demo",
        CATALOG_SOURCE: "fixtures",
        ALLOW_PUBLIC_DEMO_CATALOG: "true",
      };
      delete (process.env as Record<string, string | undefined>)["NODE_ENV"];
      delete process.env["ALLOW_SYNTHETIC_CATALOG"];

      const result = await getCatalogSnapshot();
      expect(result).toEqual({
        kind: "unavailable",
        source: "medusa",
        reason: "missing_configuration",
      });
    });
  });
});
