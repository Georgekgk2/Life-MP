import { defineMiddlewares, authenticate } from "@medusajs/medusa";
import { assertMarketplaceCoreLocalMode } from "../modules/marketplace/authorization";

export default defineMiddlewares({
  routes: [
    {
      matcher: "/vendor/marketplace/*",
      middlewares: [
        authenticate("vendor", ["session", "bearer"], {
          allowUnregistered: false,
        }),
        (_req, _res, next) => {
          assertMarketplaceCoreLocalMode();
          next();
        },
      ],
    },
    {
      matcher: "/admin/marketplace/*",
      middlewares: [
        authenticate("user", ["session", "bearer"], {
          allowUnregistered: false,
        }),
        (_req, _res, next) => {
          assertMarketplaceCoreLocalMode();
          next();
        },
      ],
    },
    {
      matcher: "/store/*",
      middlewares: [
        (req, res, next) => {
          // Bypasses Medusa native publishable key DB lookup by defining publishableKey directly
          (
            req as unknown as { publishableKey: Record<string, unknown> }
          ).publishableKey = {
            id: "pk_synthetic_catalog",
            sales_channel_ids: [],
          };

          const rawUrl = req.originalUrl || req.path || req.url || "";
          const targetPath = rawUrl.split("?")[0];

          if (
            req.method === "GET" &&
            (targetPath === "/store/catalog" ||
              targetPath === "/catalog" ||
              targetPath.endsWith("/catalog"))
          ) {
            return next();
          }

          return res.status(404).json({
            type: "not_found",
            message:
              "Native Store APIs (products, categories, cart, checkout) are disabled per launch scope boundaries.",
          });
        },
      ],
    },
  ],
});
