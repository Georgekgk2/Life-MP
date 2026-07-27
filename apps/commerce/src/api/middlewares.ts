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
