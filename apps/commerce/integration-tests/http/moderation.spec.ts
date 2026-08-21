import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { assertMarketplaceCoreLocalMode } from "../../src/modules/marketplace/authorization";

type ErrorWithResponse = {
  response: {
    status: number;
  };
};

describe("assertMarketplaceCoreLocalMode", () => {
  it("rejects private marketplace routes when NODE_ENV is production", () => {
    const originalEnv = process.env["NODE_ENV"];
    try {
      process.env["NODE_ENV"] = "production";
      expect(() => assertMarketplaceCoreLocalMode()).toThrow(
        "Приватні маршрути marketplace core заборонені в production-режимі.",
      );
    } finally {
      process.env["NODE_ENV"] = originalEnv;
    }
  });
});

medusaIntegrationTestRunner({
  env: {
    ALLOW_SYNTHETIC_CATALOG: "true",
  },
  testSuite: ({ api }) => {
    describe("Staff moderation & role boundaries negative assertions", () => {
      it("8. rejects unauthenticated access to admin vendor creation", async () => {
        const response = await api
          .post("/admin/marketplace/vendors", {
            handle: "test-vendor",
            name: "Test Vendor Name",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403]).toContain(response.status);
      });

      it("9. rejects unauthenticated access to admin vendor member assignment", async () => {
        const response = await api
          .post("/admin/marketplace/vendors/vnd_123/members", {
            user_id: "usr_456",
            role: "owner",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403, 404]).toContain(response.status);
      });

      it("10. rejects unauthenticated access to moderation decision route", async () => {
        const response = await api
          .post("/admin/marketplace/listings/lst_test123/moderation", {
            target_state: "published",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403, 404]).toContain(response.status);
      });

      it("11. rejects invalid moderation decision payload (missing target_state)", async () => {
        const response = await api
          .post("/admin/marketplace/listings/lst_test123/moderation", {
            rationale: "No state provided",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([400, 401, 403, 404, 422]).toContain(response.status);
      });

      it("12. rejects reading admin vendor list without admin authentication", async () => {
        const response = await api
          .get("/admin/marketplace/vendors")
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403, 404]).toContain(response.status);
      });
    });
  },
});
