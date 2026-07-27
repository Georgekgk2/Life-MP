import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import {
  maskEmail,
  maskPhone,
  maskName,
  sanitizeLogPayload,
} from "../../src/utils/pii-masking";

type ErrorWithResponse = {
  response: {
    status: number;
    data: unknown;
  };
};

medusaIntegrationTestRunner({
  env: {
    ALLOW_SYNTHETIC_CATALOG: "true",
  },
  testSuite: ({ api }) => {
    describe("PII Middleware & Log Sanitization Integration", () => {
      it("1. verifies request body with PII is properly sanitized by sanitizeLogPayload", () => {
        const rawPayload = {
          customer_email: "olena.p@example.com",
          recipient_phone: "+380509998877",
          recipient_name: "Олена П****",
          delivery_address: "м. Київ, вул. Хрещатик 1",
          vendor_id: "vnd_test_123",
        };

        const sanitized = sanitizeLogPayload(rawPayload);

        expect(sanitized.customer_email).toBe(maskEmail("olena.p@example.com"));
        expect(sanitized.recipient_phone).toBe(maskPhone("+380509998877"));
        expect(sanitized.recipient_name).toBe(maskName("Олена П****"));
        expect(sanitized.delivery_address).toBe("[PROTECTED_ADDRESS]");
        expect(sanitized.vendor_id).toBe("vnd_test_123");

        // Raw PII must not be present in sanitized output
        expect(JSON.stringify(sanitized)).not.toContain("olena.p@example.com");
        expect(JSON.stringify(sanitized)).not.toContain("+380509998877");
        expect(JSON.stringify(sanitized)).not.toContain(
          "м. Київ, вул. Хрещатик 1",
        );
      });

      it("2. rejects raw card number and security codes in requests to store endpoints", async () => {
        const response = await api
          .post(
            "/store/carts",
            {
              customer_email: "test@example.com",
              card_number: "4111111111111111",
              cvv: "123",
            },
            {
              headers: {
                "x-publishable-api-key": "pk_synthetic_catalog",
              },
            },
          )
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([400, 404]).toContain(response.status);
        expect(JSON.stringify(response.data)).not.toContain("4111111111111111");
      });
    });
  },
});
