const { loadEnv } = require("@medusajs/framework/utils");

loadEnv("test", process.cwd());

let testMatch = ["<rootDir>/integration-tests/http/**/*.spec.ts"];

if (process.env.TEST_TYPE === "integration:modules") {
  testMatch = ["<rootDir>/src/modules/**/__tests__/**/*.spec.ts"];
} else if (process.env.TEST_TYPE === "integration:migrations") {
  testMatch = ["<rootDir>/integration-tests/migrations/**/*.spec.ts"];
}

module.exports = {
  testTimeout: 60000,
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true,
          },
          transform: {
            decoratorMetadata: true,
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testEnvironment: "node",
  testMatch,
  setupFiles: ["<rootDir>/integration-tests/setup.cjs"],
  moduleFileExtensions: ["js", "ts", "json"],
  transformIgnorePatterns: ["/node_modules/"],
};
