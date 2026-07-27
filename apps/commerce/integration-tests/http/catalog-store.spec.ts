import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";
import seedCatalogProviderCore from "../../src/scripts/seed-catalog-provider-core";

type ErrorWithResponse = {
  response: {
    status: number;
    data: {
      message: string;
    };
  };
};

type ApiKeyRecord = {
  id: string;
  token: string;
};

type ApiKeyServiceType = {
  listApiKeys(filters: Record<string, unknown>): Promise<ApiKeyRecord[]>;
};

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    ALLOW_SYNTHETIC_CATALOG: "true",
  },
  testSuite: ({ api, getContainer }) => {
    let publishableToken = "";

    beforeAll(async () => {
      const container = getContainer();
      await seedCatalogProviderCore({ container } as never);

      const apiKeyService = container.resolve(
        Modules.API_KEY,
      ) as unknown as ApiKeyServiceType;
      const keys = await apiKeyService.listApiKeys({ type: "publishable" });
      if (keys.length > 0) {
        publishableToken = keys[0].token;
      }
    });

    describe("GET /store/catalog, Contract Integrity & Store Allowlist lockdown", () => {
      it("returns synthetic published catalog when ALLOW_SYNTHETIC_CATALOG=true", async () => {
        const response = await api.get("/store/catalog", {
          headers: {
            "x-publishable-api-key": publishableToken,
          },
        });
        expect(response.status).toEqual(200);
        expect(response.data).toHaveProperty("source", "medusa");
        expect(Array.isArray(response.data.categories)).toBe(true);
        expect(Array.isArray(response.data.products)).toBe(true);
        expect(response.data.products.length).toBeGreaterThan(0);
      });

      it("strictly prevents internal data leakage in GET /store/catalog public response DTO", async () => {
        const response = await api.get("/store/catalog", {
          headers: {
            "x-publishable-api-key": publishableToken,
          },
        });
        expect(response.status).toEqual(200);

        const allowedProductKeys = new Set([
          "id",
          "slug",
          "categorySlug",
          "name",
          "description",
          "priceUah",
          "provider",
          "isSynthetic",
          "verifiedVendorBadge",
          "certifiedProductBadge",
          "organicProductBadge",
        ]);

        const forbiddenInternalKeys = [
          "vendor_id",
          "state",
          "visibility",
          "moderation_decisions",
          "audit_events",
          "vendor_members",
          "rationale",
          "documents",
          "verifications",
          "tax_identifier",
          "legal_name",
          "legal_address",
          "reviewer_comment",
          "notes",
          "file_url",
          "document_number",
          "created_at",
          "updated_at",
          "deleted_at",
        ];

        for (const product of response.data.products) {
          const productKeys = Object.keys(product);

          // 1. Assert only public DTO keys are present
          for (const key of productKeys) {
            expect(allowedProductKeys.has(key)).toBe(true);
          }

          // 2. Explicitly assert no internal forbidden fields are leaked
          for (const forbiddenKey of forbiddenInternalKeys) {
            expect(product).not.toHaveProperty(forbiddenKey);
          }

          // 3. Provider nested contract integrity check
          expect(product.provider).toBeDefined();
          const providerKeys = Object.keys(product.provider);
          expect(providerKeys.sort()).toEqual(["handle", "name"].sort());
          expect(product.provider).not.toHaveProperty("id");
          expect(product.provider).not.toHaveProperty("legal_name");
          expect(product.provider).not.toHaveProperty("tax_identifier");
        }
      });

      it("returns 404 for native Medusa store products endpoint", async () => {
        const response = await api
          .get("/store/products", {
            headers: {
              "x-publishable-api-key": publishableToken,
            },
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);
        expect(response.status).toEqual(404);
        expect(response.data.message).toContain("Native Store APIs");
      });

      it("returns 404 for native Medusa store product-categories endpoint", async () => {
        const response = await api
          .get("/store/product-categories", {
            headers: {
              "x-publishable-api-key": publishableToken,
            },
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);
        expect(response.status).toEqual(404);
      });

      it("returns 404 for native Medusa store cart endpoint", async () => {
        const response = await api
          .post(
            "/store/carts",
            {},
            {
              headers: {
                "x-publishable-api-key": publishableToken,
              },
            },
          )
          .catch((err: unknown) => (err as ErrorWithResponse).response);
        expect(response.status).toEqual(404);
      });
    });
  },
});
