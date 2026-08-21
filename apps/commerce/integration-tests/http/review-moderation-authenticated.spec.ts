import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";
import seedCatalogProviderCore from "../../src/scripts/seed-catalog-provider-core";
import { MARKETPLACE_MODULE } from "../../src/modules/marketplace/constants";
import jwt from "jsonwebtoken";

type ErrorWithResponse = {
  response: {
    status: number;
    data?: Record<string, unknown>;
  };
};

type CustomerRecord = { id: string };

type MarketplaceReviewService = {
  listParentOrders: (
    filters: Record<string, unknown>,
  ) => Promise<Array<Record<string, unknown>>>;
  listOrderLines: (
    filters: Record<string, unknown>,
  ) => Promise<Array<Record<string, unknown>>>;
};

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    ALLOW_SYNTHETIC_CATALOG: "true",
    ALLOW_SYNTHETIC_ORDERS: "true",
    ALLOW_SYNTHETIC_REVIEWS: "true",
  },
  testSuite: ({ api, getContainer }) => {
    let customerToken = "";
    let reviewerToken = "";
    let publishableToken = "";
    let orderLineId = "";
    let productId = "";

    const authHeaders = (token: string) => ({
      Authorization: `Bearer ${token}`,
    });

    beforeAll(async () => {
      const container = getContainer();
      await seedCatalogProviderCore({ container } as never);

      const customerService = container.resolve(Modules.CUSTOMER) as unknown as {
        listCustomers: (
          filters: Record<string, unknown>,
        ) => Promise<CustomerRecord[]>;
      };
      const [customer] = await customerService.listCustomers({
        email: "customer.fixture@life.ua",
      });
      if (!customer) {
        throw new Error("Customer fixture was not created by the catalog seed.");
      }

      const marketplaceService = container.resolve(
        MARKETPLACE_MODULE,
      ) as unknown as MarketplaceReviewService;
      const [parentOrder] = await marketplaceService.listParentOrders({
        order_number: "SYN-CUSTOMER-FIXTURE-DELIVERED-1",
        customer_id: customer.id,
      });
      if (!parentOrder?.["id"]) {
        throw new Error("Delivered customer fixture order was not created.");
      }

      const [orderLine] = await marketplaceService.listOrderLines({
        parent_order_id: parentOrder["id"],
      });
      if (!orderLine?.["id"] || !orderLine["product_id"]) {
        throw new Error("Delivered customer fixture order line was not created.");
      }
      orderLineId = orderLine["id"] as string;
      productId = orderLine["product_id"] as string;

      const jwtSecret =
        process.env.JWT_SECRET || "local_jwt_secret_change_me_in_production";
      customerToken = jwt.sign(
        {
          actor_id: customer.id,
          actor_type: "customer",
          auth_identity_id: `auth_identity_${customer.id}`,
        },
        jwtSecret,
      );
      reviewerToken = jwt.sign(
        {
          actor_id: "user_compliance_reviewer_fixture",
          actor_type: "user",
          auth_identity_id: "auth_identity_compliance_reviewer_fixture",
        },
        jwtSecret,
      );

      const apiKeyService = container.resolve(Modules.API_KEY) as unknown as {
        listApiKeys: (
          filters: Record<string, unknown>,
        ) => Promise<Array<{ token: string }>>;
      };
      const [publishableKey] = await apiKeyService.listApiKeys({
        type: "publishable",
      });
      if (!publishableKey) {
        throw new Error("Publishable API key fixture was not created.");
      }
      publishableToken = publishableKey.token;
    });

    it("submits an authenticated customer review and approves it via compliance moderation", async () => {
      const submitResponse = await api.post(
        `/store/customer/order-lines/${orderLineId}/review`,
        {
          rating: 5,
          body: "Дуже якісний виріб, повністю відповідає опису.",
          display_name: "Олена",
        },
        {
          headers: {
            ...authHeaders(customerToken),
            "x-publishable-api-key": publishableToken,
          },
        },
      );

      expect(submitResponse.status).toBe(201);
      expect(submitResponse.data.review).toEqual(
        expect.objectContaining({
          status: "pending",
          message: expect.stringContaining("на перевірку"),
        }),
      );
      const reviewId = submitResponse.data.review.id as string;
      expect(reviewId).toEqual(expect.any(String));

      const pendingResponse = await api.get(
        "/admin/marketplace/reviews?status=pending",
        { headers: authHeaders(reviewerToken) },
      );
      expect(pendingResponse.status).toBe(200);
      expect(pendingResponse.data.reviews).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: reviewId,
            product_id: productId,
            status: "pending",
            mode: "synthetic",
          }),
        ]),
      );

      const moderationResponse = await api.post(
        `/admin/marketplace/reviews/${reviewId}/moderation`,
        {
          target_status: "approved",
          rationale: "Відгук відповідає правилам публікації та має достатнє пояснення.",
        },
        {
          headers: {
            ...authHeaders(reviewerToken),
            "x-correlation-id": "review-moderation-authenticated-test",
          },
        },
      );

      expect(moderationResponse.status).toBe(200);
      expect(moderationResponse.data.review).toEqual(
        expect.objectContaining({
          id: reviewId,
          status: "approved",
          moderator_id: "user_compliance_reviewer_fixture",
          moderation_rationale:
            "Відгук відповідає правилам публікації та має достатнє пояснення.",
        }),
      );

      const publicResponse = await api.get(
        `/store/catalog/products/${productId}/reviews`,
        { headers: { "x-publishable-api-key": publishableToken } },
      );
      expect(publicResponse.status).toBe(200);
      expect(publicResponse.data).toEqual(
        expect.objectContaining({
          summary: expect.objectContaining({
            averageRating: 5,
            totalReviews: 1,
            ratingBreakdown: expect.objectContaining({ 5: 1 }),
          }),
          reviews: expect.arrayContaining([
            expect.objectContaining({
              id: reviewId,
              productId,
              displayName: "Олена",
              rating: 5,
              body: "Дуже якісний виріб, повністю відповідає опису.",
              verifiedPurchase: true,
              status: "approved",
            }),
          ]),
        }),
      );
    });

    it("does not allow a customer token to access staff review moderation", async () => {
      const response = await api
        .get("/admin/marketplace/reviews", {
          headers: authHeaders(customerToken),
        })
        .catch((err: unknown) => (err as ErrorWithResponse).response);

      expect([401, 403]).toContain(response.status);
    });
  },
});
