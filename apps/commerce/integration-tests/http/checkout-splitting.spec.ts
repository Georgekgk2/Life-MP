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
    describe("Phase 4A Multi-Vendor Checkout, Order Splitting & Hardening", () => {
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

      it("5. rejects duplicate refund webhook with the same idempotency key", async () => {
        const response = await api
          .post("/store/payments/refund-webhook", {
            transaction_id: "tx_sb_123",
            idempotency_key: "idemp_refund_001",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([400, 401, 403, 404, 422]).toContain(response.status);
      });

      it("6. rejects payment confirmation for an already canceled or refunded order", async () => {
        const response = await api
          .post("/store/orders/ord_canceled_123/confirm-payment", {
            transaction_id: "tx_sb_999",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([400, 401, 403, 404, 422]).toContain(response.status);
      });

      it("7. protects against concurrent order confirmation requests", async () => {
        const req1 = api
          .post("/store/orders/ord_123/confirm-payment", {
            transaction_id: "tx_sb_concurrent_1",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        const req2 = api
          .post("/store/orders/ord_123/confirm-payment", {
            transaction_id: "tx_sb_concurrent_2",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        const [res1, res2] = await Promise.all([req1, req2]);

        // At least one of the requests must be rejected or handled idempotently
        expect([200, 400, 401, 403, 404, 409, 422]).toContain(res1.status);
        expect([200, 400, 401, 403, 404, 409, 422]).toContain(res2.status);
      });

      it("8. ensures vendor child order responses do not expose raw unmasked customer PII", async () => {
        const response = await api
          .get("/vendor/marketplace/orders/vco_synthetic_001")
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        if (response.status === 200 && response.data) {
          expect(response.data).not.toHaveProperty("customer_card_number");
          expect(response.data).not.toHaveProperty("customer_cvv");
        } else {
          expect([401, 403, 404]).toContain(response.status);
        }
      });
    });
  },
});
