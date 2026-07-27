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
    describe("Phase 4A Multi-Vendor Checkout & Order Splitting", () => {
      it("1. rejects payment webhook processing without valid idempotency key", async () => {
        const response = await api
          .post("/store/payments/webhook", {
            transaction_id: "tx_sb_123",
            status: "success",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([400, 401, 403, 404, 422]).toContain(response.status);
      });

      it("2. rejects direct creation of parent order without valid cart session", async () => {
        const response = await api
          .post("/store/orders", {
            cart_id: "invalid_cart_id",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([400, 401, 403, 404, 422]).toContain(response.status);
      });

      it("3. rejects reading arbitrary vendor child order without vendor authorization", async () => {
        const response = await api
          .get("/vendor/marketplace/orders/vco_123")
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403, 404]).toContain(response.status);
      });

      it("4. rejects reading vendor payables without vendor authentication", async () => {
        const response = await api
          .get("/vendor/marketplace/payables")
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403]).toContain(response.status);
      });
    });
  },
});
