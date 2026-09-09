import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";
import seedCatalogProviderCore from "../../src/scripts/seed-catalog-provider-core";
import { MARKETPLACE_MODULE } from "../../src/modules/marketplace/constants";
import type {
  CustomerOrderReaderService,
  SyntheticOrderCreateInput,
} from "../../src/modules/marketplace/customer-orders";
import jwt from "jsonwebtoken";

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

type CustomerRecord = {
  id: string;
};

type CustomerServiceType = {
  listCustomers(filters: Record<string, unknown>): Promise<CustomerRecord[]>;
  createCustomers(data: Record<string, unknown>): Promise<CustomerRecord>;
};

type MarketplaceOrderService = CustomerOrderReaderService & {
  createSyntheticOrder(
    input: SyntheticOrderCreateInput,
  ): Promise<Record<string, unknown>>;
};

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    ALLOW_SYNTHETIC_CATALOG: "true",
    ALLOW_SYNTHETIC_REVIEWS: "true",
    ALLOW_SYNTHETIC_ORDERS: "true",
  },
  testSuite: ({ api, getContainer }) => {
    let publishableToken = "";
    let customerId = "";
    let customerToken = "";
    let otherCustomerToken = "";
    let marketplaceService: MarketplaceOrderService;
    let rollbackLine: {
      catalogListingId?: string;
      productId: string;
      vendorId: string;
      productName: string;
      unitPriceUah: number;
    } | null = null;

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

      marketplaceService = getContainer().resolve(
        MARKETPLACE_MODULE,
      ) as unknown as MarketplaceOrderService;

      const customerService = getContainer().resolve(
        Modules.CUSTOMER,
      ) as unknown as CustomerServiceType;
      const fixtureCustomers = await customerService.listCustomers({
        email: "customer.fixture@life.ua",
      });
      const fixtureCustomer = fixtureCustomers[0];
      if (!fixtureCustomer) {
        throw new Error(
          "Customer fixture was not created by the catalog seed.",
        );
      }
      const otherCustomers = await customerService.listCustomers({
        email: "customer.other.fixture@life.ua",
      });
      const otherCustomer =
        otherCustomers[0] ||
        (await customerService.createCustomers({
          first_name: "Тест",
          last_name: "Інший",
          email: "customer.other.fixture@life.ua",
          has_account: true,
        }));
      const jwtSecret =
        process.env.JWT_SECRET || "local_jwt_secret_change_me_in_production";
      const signCustomerToken = (customerId: string) =>
        jwt.sign(
          {
            actor_id: customerId,
            actor_type: "customer",
            auth_identity_id: `auth_identity_${customerId}`,
          },
          jwtSecret,
        );
      customerId = fixtureCustomer.id;
      customerToken = signCustomerToken(fixtureCustomer.id);
      otherCustomerToken = signCustomerToken(otherCustomer.id);
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
          "imageSrc",
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
        expect(response.data.message).toContain("Стандартні Store API");
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

      it("exposes only the public approved-review projection", async () => {
        const response = await api.get(
          "/store/catalog/products/product-1/reviews",
          {
            headers: {
              "x-publishable-api-key": publishableToken,
            },
          },
        );

        expect(response.status).toEqual(200);
        expect(response.data).toEqual({
          reviews: [],
          summary: {
            averageRating: null,
            totalReviews: 0,
            ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          },
        });
      });

      it("requires customer authentication for customer order history", async () => {
        const response = await api
          .get("/store/customer/orders", {
            headers: {
              "x-publishable-api-key": publishableToken,
            },
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403]).toContain(response.status);
      });

      it("reads the seeded delivered order only for its authenticated customer", async () => {
        const response = await api.get("/store/customer/orders", {
          headers: {
            "x-publishable-api-key": publishableToken,
            authorization: `Bearer ${customerToken}`,
          },
        });

        expect(response.status).toBe(200);
        const seededOrder = response.data.orders.find(
          (order: { orderNumber: string }) =>
            order.orderNumber === "SYN-CUSTOMER-FIXTURE-DELIVERED-1",
        );
        expect(seededOrder).toEqual(
          expect.objectContaining({
            orderNumber: "SYN-CUSTOMER-FIXTURE-DELIVERED-1",
            shipments: expect.arrayContaining([
              expect.objectContaining({
                fulfillmentStatus: "delivered",
                lines: expect.arrayContaining([
                  expect.objectContaining({
                    reviewEligibility: { eligible: true },
                  }),
                ]),
              }),
            ]),
          }),
        );
        expect(seededOrder.shipments).toHaveLength(2);
        const vendorIds = new Set(
          seededOrder.shipments.map(
            (shipment: { vendor: { id: string } }) => shipment.vendor.id,
          ),
        );
        expect(vendorIds.size).toBe(2);
      });

      it("creates a server-priced multi-vendor synthetic order for the authenticated customer", async () => {
        const catalogResponse = await api.get("/store/catalog", {
          headers: {
            "x-publishable-api-key": publishableToken,
          },
        });
        const products = catalogResponse.data.products as Array<{
          id: string;
          priceUah: number;
          provider: { handle: string };
        }>;
        const productsByProvider = new Map<string, (typeof products)[number]>();
        for (const product of products) {
          if (!productsByProvider.has(product.provider.handle)) {
            productsByProvider.set(product.provider.handle, product);
          }
        }
        const orderProducts = [...productsByProvider.values()].slice(0, 2);
        expect(orderProducts).toHaveLength(2);

        const response = await api.post(
          "/store/customer/orders",
          {
            items: orderProducts.map((product) => ({
              catalog_listing_id: product.id,
              quantity: 1,
            })),
          },
          {
            headers: {
              "x-publishable-api-key": publishableToken,
              authorization: `Bearer ${customerToken}`,
            },
          },
        );

        expect(response.status).toBe(201);
        expect(response.data.order).toEqual(
          expect.objectContaining({
            mode: "synthetic",
            paymentStatus: "not_applicable",
            payoutStatus: "not_applicable",
            shipments: expect.any(Array),
          }),
        );
        expect(response.data.order.shipments).toHaveLength(2);
        expect(response.data.order.totalUah).toBe(
          orderProducts.reduce((sum, product) => sum + product.priceUah, 0),
        );
        const firstLine = response.data.order.shipments[0]?.lines[0];
        expect(firstLine).toEqual(
          expect.objectContaining({
            catalogListingId: expect.any(String),
            productId: expect.any(String),
            vendorId: expect.any(String),
            productName: expect.any(String),
            unitPriceUah: expect.any(Number),
          }),
        );
        rollbackLine = firstLine;
      });

      it("rolls back parent and child writes when a later vendor FK fails", async () => {
        expect(rollbackLine).not.toBeNull();
        const validLine = rollbackLine as NonNullable<typeof rollbackLine>;
        const orderNumber = "SYN-HTTP-ROLLBACK-1";
        const input: SyntheticOrderCreateInput = {
          customerId,
          orderNumber,
          items: [
            {
              ...validLine,
              quantity: 1,
            },
            {
              ...validLine,
              productId: "rollback-invalid-product",
              vendorId: "vendor-does-not-exist",
              quantity: 1,
            },
          ],
        };

        await expect(
          marketplaceService.createSyntheticOrder(input),
        ).rejects.toThrow();
        expect(
          await marketplaceService.listParentOrders({
            order_number: orderNumber,
          }),
        ).toEqual([]);
      });

      it("does not expose the seeded order to another authenticated customer", async () => {
        const response = await api.get("/store/customer/orders", {
          headers: {
            "x-publishable-api-key": publishableToken,
            authorization: `Bearer ${otherCustomerToken}`,
          },
        });

        expect(response.status).toBe(200);
        expect(response.data.orders).toEqual([]);
      });

      it("requires customer authentication for synthetic order creation", async () => {
        const response = await api
          .post(
            "/store/customer/orders",
            {
              items: [{ catalog_listing_id: "listing-1", quantity: 1 }],
            },
            {
              headers: {
                "x-publishable-api-key": publishableToken,
              },
            },
          )
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403]).toContain(response.status);
      });

      it("requires customer authentication for review submission", async () => {
        const response = await api
          .post(
            "/store/customer/order-lines/order-line-1/review",
            { rating: 5, body: "Гарний виріб" },
            {
              headers: {
                "x-publishable-api-key": publishableToken,
              },
            },
          )
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403]).toContain(response.status);
      });
    });
  },
});
