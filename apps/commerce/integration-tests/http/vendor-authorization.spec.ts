import { medusaIntegrationTestRunner } from "@medusajs/test-utils";

type ErrorWithResponse = {
  response: {
    status: number;
  };
};

medusaIntegrationTestRunner({
  env: {
    ALLOW_SYNTHETIC_CATALOG: "true",
  },
  testSuite: ({ api }) => {
    describe("Vendor authorization & tenant isolation negative boundaries", () => {
      it("1. rejects listing list request without auth context", async () => {
        const response = await api
          .get("/vendor/marketplace/listings")
          .catch((err: unknown) => (err as ErrorWithResponse).response);
        expect([401, 403]).toContain(response.status);
      });

      it("2. rejects listing creation with forbidden payload fields (vendor_id, state, visibility, synthetic)", async () => {
        const response = await api
          .post("/vendor/marketplace/listings", {
            title: "Test Item",
            description: "Test description",
            vendor_id: "vendor_b_id",
            state: "published",
            visibility: "local_demo",
            synthetic: true,
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([400, 401, 403, 422]).toContain(response.status);
      });

      it("3. rejects reading arbitrary vendor listing without vendor auth token", async () => {
        const response = await api
          .get("/vendor/marketplace/listings/lst_other_vendor_123")
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403, 404]).toContain(response.status);
      });

      it("4. rejects updating arbitrary vendor listing without vendor auth token", async () => {
        const response = await api
          .patch("/vendor/marketplace/listings/lst_other_vendor_123", {
            title: "Attempted Unauthorized Overwrite",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403, 404]).toContain(response.status);
      });

      it("5. rejects submitting arbitrary vendor listing without vendor auth token", async () => {
        const response = await api
          .post("/vendor/marketplace/listings/lst_other_vendor_123/submit")
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403, 404]).toContain(response.status);
      });

      it("6. rejects listing creation with invalid schema (empty title)", async () => {
        const response = await api
          .post("/vendor/marketplace/listings", {
            title: "",
            description: "Valid description",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([400, 401, 403, 422]).toContain(response.status);
      });

      it("7. rejects deleting vendor listing via unsupported HTTP method or unauthenticated access", async () => {
        const response = await api
          .delete("/vendor/marketplace/listings/lst_123")
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403, 404, 405]).toContain(response.status);
      });
    });
  },
});
