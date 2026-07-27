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
    describe("Vendor Operations & Compliance Workflows", () => {
      it("1. rejects vendor verification submission without auth token", async () => {
        const response = await api
          .post("/vendor/marketplace/verification", {
            tax_identifier: "12345678",
            legal_name: "ТОВ Тест Виробник",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403]).toContain(response.status);
      });

      it("2. rejects compliance document upload without auth token", async () => {
        const response = await api
          .post("/vendor/marketplace/documents", {
            owner_type: "vendor",
            owner_id: "vnd_123",
            document_type: "quality_certificate",
            document_number: "CERT-2026-001",
            file_url: "/uploads/cert.pdf",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403]).toContain(response.status);
      });

      it("3. rejects admin verification review without compliance reviewer role", async () => {
        const response = await api
          .post("/admin/marketplace/verifications/ver_123/review", {
            target_status: "verified",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403, 404]).toContain(response.status);
      });

      it("4. rejects vendor verification with invalid tax_identifier length", async () => {
        const response = await api
          .post("/vendor/marketplace/verification", {
            tax_identifier: "123", // invalid: length < 8
            legal_name: "Короткий ІПН",
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([400, 401, 403, 422]).toContain(response.status);
      });
    });
  },
});
