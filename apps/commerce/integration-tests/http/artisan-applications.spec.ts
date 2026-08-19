import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";
import seedCatalogProviderCore from "../../src/scripts/seed-catalog-provider-core";
import { MARKETPLACE_MODULE } from "../../src/modules/marketplace/constants";
import jwt from "jsonwebtoken";

type ErrorWithResponse = {
  response: {
    status: number;
    data: {
      message?: string;
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
    let adminToken = "";
    let publishableToken = "";

    beforeAll(async () => {
      const container = getContainer();
      await seedCatalogProviderCore({ container } as never);

      // 1. Get publishable token
      const apiKeyService = container.resolve(
        Modules.API_KEY,
      ) as unknown as ApiKeyServiceType;
      const keys = await apiKeyService.listApiKeys({ type: "publishable" });
      if (keys.length > 0) {
        publishableToken = keys[0].token;
      }
      // 2. Create admin user and compliance_reviewer role
      const userModule = container.resolve(Modules.USER) as unknown as {
        createUsers: (data: Record<string, unknown>) => Promise<{ id: string }>;
      };
      const adminUser = await userModule.createUsers({
        email: "reviewer_artisan@life.ua",
      });

      const marketplaceService = container.resolve(MARKETPLACE_MODULE) as {
        createStaffRoleAssignments: (
          data: Record<string, unknown>,
        ) => Promise<unknown>;
      };

      await marketplaceService.createStaffRoleAssignments({
        user_id: adminUser.id,
        role: "compliance_reviewer",
      });

      const jwtSecret =
        process.env.JWT_SECRET || "local_jwt_secret_change_me_in_production";
      adminToken = jwt.sign(
        {
          actor_id: adminUser.id,
          actor_type: "user",
          auth_identity_id: "auth_identity_reviewer_artisan",
        },
        jwtSecret,
      );
    });

    describe("Artisan Applications Workflow & API Endpoints", () => {
      it("1. accepts and persists a valid public artisan application (POST /store/artisan-applications)", async () => {
        const payload = {
          name: "Іван Гончар",
          workshop_name: "Опішнянська Кераміка",
          category: "pottery",
          description:
            "Традиційне опішнянське гончарство з натуральним ліпленням та авторським розписом ангобами.",
          email: "ivan@opishnia-craft.ua",
          phone: "+380 50 123 45 67",
          portfolio_url: "https://instagram.com/opishnia_craft",
          accepted_terms: true,
        };

        const response = await api.post(
          "/store/artisan-applications",
          payload,
          {
            headers: {
              "x-publishable-api-key": publishableToken,
            },
          },
        );

        expect(response.status).toBe(201);
        expect(response.data.artisan_application).toBeDefined();
        expect(response.data.artisan_application.name).toBe("Іван Гончар");
        expect(response.data.artisan_application.workshop_name).toBe(
          "Опішнянська Кераміка",
        );
        expect(response.data.artisan_application.status).toBe("pending");
        expect(response.data.artisan_application.id).toBeDefined();
      });

      it("2. rejects public artisan application with invalid data (short description)", async () => {
        const payload = {
          name: "Іван Гончар",
          workshop_name: "Опішнянська Кераміка",
          category: "pottery",
          description: "Коротко", // under 20 chars
          email: "ivan@opishnia-craft.ua",
          phone: "+380 50 123 45 67",
          accepted_terms: true,
        };

        const response = await api
          .post("/store/artisan-applications", payload, {
            headers: {
              "x-publishable-api-key": publishableToken,
            },
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect(response.status).toBe(400);
      });

      it("3. rejects public artisan application without accepting terms", async () => {
        const payload = {
          name: "Іван Гончар",
          workshop_name: "Опішнянська Кераміка",
          category: "pottery",
          description:
            "Традиційне опішнянське гончарство з натуральним ліпленням та авторським розписом ангобами.",
          email: "ivan@opishnia-craft.ua",
          phone: "+380 50 123 45 67",
          accepted_terms: false,
        };

        const response = await api
          .post("/store/artisan-applications", payload, {
            headers: {
              "x-publishable-api-key": publishableToken,
            },
          })
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect(response.status).toBe(400);
      });

      it("4. rejects admin list endpoint without authentication token", async () => {
        const response = await api
          .get("/admin/marketplace/artisan-applications")
          .catch((err: unknown) => (err as ErrorWithResponse).response);

        expect([401, 403]).toContain(response.status);
      });

      it("5. lists artisan applications for authenticated compliance reviewer (GET /admin/marketplace/artisan-applications)", async () => {
        // Create an application first in this transaction
        const marketplaceService = getContainer().resolve(
          MARKETPLACE_MODULE,
        ) as {
          createArtisanApplications: (
            data: Record<string, unknown>,
          ) => Promise<{ id: string; name: string }>;
        };

        await marketplaceService.createArtisanApplications({
          name: "Іван Гончар",
          workshop_name: "Опішнянська Кераміка",
          category: "pottery",
          description: "Опис для тесту списку модерації заявок.",
          email: "ivan_list@opishnia.ua",
          phone: "+380 50 123 45 67",
          status: "pending",
        });

        const response = await api.get(
          "/admin/marketplace/artisan-applications",
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          },
        );

        expect(response.status).toBe(200);
        expect(response.data.artisan_applications).toBeDefined();
        expect(Array.isArray(response.data.artisan_applications)).toBe(true);
        expect(response.data.count).toBeGreaterThanOrEqual(1);

        const found = response.data.artisan_applications.find(
          (app: { name: string }) => app.name === "Іван Гончар",
        );
        expect(found).toBeDefined();
      });

      it("6. retrieves single application details (GET /admin/marketplace/artisan-applications/:id)", async () => {
        const marketplaceService = getContainer().resolve(
          MARKETPLACE_MODULE,
        ) as {
          createArtisanApplications: (
            data: Record<string, unknown>,
          ) => Promise<{ id: string; email: string }>;
        };

        const created = await marketplaceService.createArtisanApplications({
          name: "Іван Гончар",
          workshop_name: "Опішнянська Кераміка",
          category: "pottery",
          description: "Опис для тесту перегляду деталей заявки.",
          email: "ivan_detail@opishnia.ua",
          phone: "+380 50 123 45 67",
          status: "pending",
        });

        const response = await api.get(
          `/admin/marketplace/artisan-applications/${created.id}`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          },
        );

        expect(response.status).toBe(200);
        expect(response.data.artisan_application).toBeDefined();
        expect(response.data.artisan_application.id).toBe(created.id);
        expect(response.data.artisan_application.email).toBe(
          "ivan_detail@opishnia.ua",
        );
      });

      it("7. reviews and approves an application (POST /admin/marketplace/artisan-applications/:id/review)", async () => {
        const marketplaceService = getContainer().resolve(
          MARKETPLACE_MODULE,
        ) as {
          createArtisanApplications: (
            data: Record<string, unknown>,
          ) => Promise<{ id: string }>;
        };

        const created = await marketplaceService.createArtisanApplications({
          name: "Іван Гончар",
          workshop_name: "Опішнянська Кераміка",
          category: "pottery",
          description: "Опис для тесту схвалення модератором.",
          email: "ivan_review@opishnia.ua",
          phone: "+380 50 123 45 67",
          status: "pending",
        });

        const reviewPayload = {
          status: "approved",
          reviewer_notes:
            "Майстерня відповідає стандартам локальності та автентичності. Схвалено до розміщення.",
        };

        const response = await api.post(
          `/admin/marketplace/artisan-applications/${created.id}/review`,
          reviewPayload,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          },
        );

        expect(response.status).toBe(200);
        expect(response.data.artisan_application).toBeDefined();
        expect(response.data.artisan_application.status).toBe("approved");
        expect(response.data.artisan_application.reviewer_notes).toContain(
          "Схвалено до розміщення",
        );
        expect(response.data.artisan_application.reviewed_at).toBeDefined();
      });
    });
  },
});
