import { defineMiddlewares, authenticate } from "@medusajs/medusa";
import { assertMarketplaceCoreLocalMode } from "../modules/marketplace/authorization.js";
import { sanitizeLogPayload } from "../utils/pii-masking.js";

export default defineMiddlewares({
  routes: [
    {
      matcher: "/vendor/marketplace/*",
      middlewares: [
        authenticate("vendor", ["session", "bearer"], {
          allowUnregistered: false,
        }),
        (req, _res, next) => {
          assertMarketplaceCoreLocalMode();
          if (req.body && typeof req.body === "object") {
            (req as unknown as { sanitizedLogBody: unknown }).sanitizedLogBody =
              sanitizeLogPayload(req.body as Record<string, unknown>);
          }
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
        (req, _res, next) => {
          assertMarketplaceCoreLocalMode();
          if (req.body && typeof req.body === "object") {
            (req as unknown as { sanitizedLogBody: unknown }).sanitizedLogBody =
              sanitizeLogPayload(req.body as Record<string, unknown>);
          }
          next();
        },
      ],
    },
    {
      matcher: "/store/customer/*",
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnregistered: false,
        }),
        (req, _res, next) => {
          assertMarketplaceCoreLocalMode();
          if (req.body && typeof req.body === "object") {
            (req as unknown as { sanitizedLogBody: unknown }).sanitizedLogBody =
              sanitizeLogPayload(req.body as Record<string, unknown>);
          }
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

          if (req.body && typeof req.body === "object") {
            (req as unknown as { sanitizedLogBody: unknown }).sanitizedLogBody =
              sanitizeLogPayload(req.body as Record<string, unknown>);
          }

          const rawUrl = req.originalUrl || req.path || req.url || "";
          const targetPath = rawUrl.split("?")[0];

          const isCatalogGet =
            req.method === "GET" &&
            (targetPath === "/store/catalog" ||
              targetPath === "/catalog" ||
              targetPath.endsWith("/catalog"));

          const isArtisanApplicationPost =
            req.method === "POST" &&
            (targetPath === "/store/artisan-applications" ||
              targetPath === "/artisan-applications" ||
              targetPath.endsWith("/artisan-applications"));

          const isCustomerOrderOrReviewRoute =
            targetPath === "/store/customer/orders" ||
            targetPath.startsWith("/store/customer/orders/") ||
            targetPath.startsWith("/store/customer/order-lines/");

          const isPublicProductReviewsGet =
            req.method === "GET" &&
            /^\/store\/catalog\/products\/[^/]+\/reviews$/.test(targetPath);

          if (
            isCatalogGet ||
            isArtisanApplicationPost ||
            isCustomerOrderOrReviewRoute ||
            isPublicProductReviewsGet
          ) {
            return next();
          }

          return res.status(404).json({
            type: "not_found",
            message:
              "Стандартні Store API (товари, категорії, кошик, оформлення) вимкнено відповідно до меж запуску.",
          });
        },
      ],
    },
  ],
});
