import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import seedCatalogProviderCore from "../../src/scripts/seed-catalog-provider-core";
import { MARKETPLACE_MODULE } from "../../src/modules/marketplace/constants";
import jwt from "jsonwebtoken";

type ErrorWithResponse = {
  response: {
    status: number;
    data?: Record<string, unknown>;
  };
};

type VendorRecord = {
  id: string;
  handle: string;
};

type ListingRecord = {
  id: string;
  vendor_id: string;
  state: string;
  visibility: string;
  synthetic: boolean;
};

type MarketplaceServiceType = {
  listVendors(filters: Record<string, unknown>): Promise<VendorRecord[]>;
  listCatalogListings(
    filters: Record<string, unknown>,
  ): Promise<ListingRecord[]>;
};

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    ALLOW_SYNTHETIC_CATALOG: "true",
  },
  testSuite: ({ api, getContainer }) => {
    let vendorA: VendorRecord;
    let vendorB: VendorRecord;
    let listingA: ListingRecord;
    let listingB: ListingRecord;
    let vendorAToken = "";
    let vendorBToken = "";

    const authHeaders = (token: string) => ({
      Authorization: `Bearer ${token}`,
    });

    const createVendorToken = (authIdentityId: string) =>
      jwt.sign(
        {
          actor_id: `actor_${authIdentityId}`,
          actor_type: "vendor",
          auth_identity_id: authIdentityId,
        },
        process.env.JWT_SECRET || "local_jwt_secret_change_me_in_production",
      );

    const createDraftListing = async (token: string, title: string) => {
      const response = await api.post(
        "/vendor/marketplace/listings",
        {
          title,
          description: "Опис тестового виробу для authenticated vendor flow.",
        },
        { headers: authHeaders(token) },
      );
      expect(response.status).toBe(201);
      return response.data.listing as ListingRecord;
    };

    beforeAll(async () => {
      const container = getContainer();
      await seedCatalogProviderCore({ container } as never);

      const marketplaceService = container.resolve(
        MARKETPLACE_MODULE,
      ) as unknown as MarketplaceServiceType;
      [vendorA] = await marketplaceService.listVendors({
        handle: "etno-studio",
      });
      [vendorB] = await marketplaceService.listVendors({
        handle: "polissia-craft",
      });

      [listingA] = await marketplaceService.listCatalogListings({
        vendor_id: vendorA.id,
      });
      [listingB] = await marketplaceService.listCatalogListings({
        vendor_id: vendorB.id,
      });

      vendorAToken = createVendorToken("auth_identity_vendor_a_owner");
      vendorBToken = createVendorToken("auth_identity_vendor_b_owner");
    });

    describe("Authenticated vendor tenant isolation", () => {
      it("lists only listings owned by the authenticated vendor", async () => {
        const response = await api.get("/vendor/marketplace/listings", {
          headers: authHeaders(vendorAToken),
        });

        expect(response.status).toBe(200);
        expect(response.data.listings.length).toBeGreaterThan(0);
        expect(
          response.data.listings.every(
            (listing: ListingRecord) => listing.vendor_id === vendorA.id,
          ),
        ).toBe(true);
        expect(
          response.data.listings.some(
            (listing: ListingRecord) => listing.vendor_id === vendorB.id,
          ),
        ).toBe(false);
      });

      it("rejects cross-tenant listing reads, updates, and submits", async () => {
        const readResponse = await api
          .get(`/vendor/marketplace/listings/${listingB.id}`, {
            headers: authHeaders(vendorAToken),
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);
        const updateResponse = await api
          .patch(
            `/vendor/marketplace/listings/${listingB.id}`,
            { title: "Спроба змінити чужий виріб" },
            { headers: authHeaders(vendorAToken) },
          )
          .catch((err: unknown) => (err as ErrorWithResponse).response);
        const submitResponse = await api
          .post(
            `/vendor/marketplace/listings/${listingB.id}/submit`,
            {},
            { headers: authHeaders(vendorAToken) },
          )
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect(readResponse.status).toBe(404);
        expect(updateResponse.status).toBe(404);
        expect(submitResponse.status).toBe(404);
      });

      it("creates and submits a draft under the authenticated vendor tenant", async () => {
        const created = await createDraftListing(
          vendorAToken,
          `Authenticated vendor ${Date.now()}`,
        );

        expect(created.vendor_id).toBe(vendorA.id);
        expect(created.state).toBe("draft");
        expect(created.visibility).toBe("internal");
        expect(created.synthetic).toBe(false);

        const submittedResponse = await api.post(
          `/vendor/marketplace/listings/${created.id}/submit`,
          {},
          { headers: authHeaders(vendorAToken) },
        );

        expect(submittedResponse.status).toBe(200);
        expect(submittedResponse.data.listing).toMatchObject({
          id: created.id,
          vendor_id: vendorA.id,
          state: "review",
        });
      });

      it("does not accept a client-supplied vendor identity during creation", async () => {
        const response = await api
          .post(
            "/vendor/marketplace/listings",
            {
              title: "Чужий vendor identity",
              description: "Це поле не повинно бути прийнято сервером.",
              vendor_id: vendorB.id,
            },
            { headers: authHeaders(vendorAToken) },
          )
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([400, 422]).toContain(response.status);
      });
    });
  },
});
