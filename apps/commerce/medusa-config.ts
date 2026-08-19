import { defineConfig, loadEnv } from "@medusajs/framework/utils"

export const MARKETPLACE_MODULE = "marketplace"

loadEnv(process.env["NODE_ENV"] || "development", process.cwd())

const isProduction = process.env["NODE_ENV"] === "production"

function getRequiredEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue
  if (!value) {
    throw new Error(
      `[medusa-config] Missing required environment variable: ${key}`
    )
  }
  if (isProduction) {
    const forbiddenSentinels = [
      "supersecret",
      "secret",
      "change-me",
      "local_jwt_secret",
      "local_cookie_secret",
    ]
    if (forbiddenSentinels.some((s) => value.toLowerCase().includes(s))) {
      throw new Error(
        `[medusa-config] Production mode rejects local sentinel value for ${key}`
      )
    }
  }
  return value
}

export default defineConfig({
  projectConfig: {
    databaseUrl: getRequiredEnv(
      "DATABASE_URL",
      "postgresql://life_medusa_dev:life_medusa_dev_password@127.0.0.1:54329/life_medusa_dev"
    ),
    redisUrl: getRequiredEnv("REDIS_URL", "redis://127.0.0.1:56379"),
    http: {
      jwtSecret: getRequiredEnv(
        "JWT_SECRET",
        "local_jwt_secret_change_me_in_production"
      ),
      cookieSecret: getRequiredEnv(
        "COOKIE_SECRET",
        "local_cookie_secret_change_me_in_production"
      ),
      storeCors:
        process.env["STORE_CORS"] ||
        "http://localhost:3000,http://127.0.0.1:3100",
      adminCors:
        process.env["ADMIN_CORS"] ||
        "http://localhost:7001,http://127.0.0.1:7001",
      authCors:
        process.env["AUTH_CORS"] ||
        "http://localhost:3000,http://127.0.0.1:3100,http://127.0.0.1:7001",
    },
  },
  admin: {
    disable:
      process.env["MEDUSA_DISABLE_ADMIN"] === "true" ||
      process.env["DISABLE_MEDUSA_ADMIN"] === "true",
  },
  modules: [
    {
      resolve: "./src/modules/marketplace",
    },
  ],
})
