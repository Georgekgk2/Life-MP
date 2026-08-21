const fs = require("fs");
const path = require("path");
// Medusa's database-template restore intentionally terminates the app's
// pooled connections between tests; Knex logs that expected reset as an
// error even though the runner reconnects and all requests still execute.
if (process.env.NODE_ENV === "test") {
  const originalConsoleLog = console.log;
  console.log = function (...args) {
    if (
      args.length === 1 &&
      args[0] === "Connection Error: Connection ended unexpectedly"
    ) {
      return;
    }
    return originalConsoleLog.apply(this, args);
  };
}

// Fix V8 cross-realm Map/Set prototype receiver mismatch in Jest VM modules
const NativeMapSet = Map.prototype.set;
Map.prototype.set = function (key, value) {
  try {
    return NativeMapSet.call(this, key, value);
  } catch (err) {
    if (err && err.message && err.message.includes("incompatible receiver")) {
      const proto = Object.getPrototypeOf(this);
      if (proto) {
        const desc = Object.getOwnPropertyDescriptor(proto, "set");
        if (
          desc &&
          typeof desc.value === "function" &&
          desc.value !== Map.prototype.set
        ) {
          return desc.value.call(this, key, value);
        }
      }
    }
    throw err;
  }
};

const NativeMapGet = Map.prototype.get;
Map.prototype.get = function (key) {
  try {
    return NativeMapGet.call(this, key);
  } catch (err) {
    if (err && err.message && err.message.includes("incompatible receiver")) {
      const proto = Object.getPrototypeOf(this);
      if (proto) {
        const desc = Object.getOwnPropertyDescriptor(proto, "get");
        if (
          desc &&
          typeof desc.value === "function" &&
          desc.value !== Map.prototype.get
        ) {
          return desc.value.call(this, key);
        }
      }
    }
    throw err;
  }
};

const NativeMapHas = Map.prototype.has;
Map.prototype.has = function (key) {
  try {
    return NativeMapHas.call(this, key);
  } catch (err) {
    if (err && err.message && err.message.includes("incompatible receiver")) {
      const proto = Object.getPrototypeOf(this);
      if (proto) {
        const desc = Object.getOwnPropertyDescriptor(proto, "has");
        if (
          desc &&
          typeof desc.value === "function" &&
          desc.value !== Map.prototype.has
        ) {
          return desc.value.call(this, key);
        }
      }
    }
    throw err;
  }
};

function loadEnvFile(envName) {
  const rootDir = path.resolve(__dirname, "../../..");
  const envFile = path.join(rootDir, `.env.${envName}`);
  const envExample = path.join(rootDir, ".env.example");
  const targetFile = fs.existsSync(envFile) ? envFile : envExample;

  if (fs.existsSync(targetFile)) {
    const content = fs.readFileSync(targetFile, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFile("test");

const dbUrlStr =
  process.env.TEST_RUNNER_DATABASE_URL ||
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL;
if (dbUrlStr) {
  try {
    const url = new URL(dbUrlStr);
    process.env.DB_HOST = "localhost";
    process.env.DB_PORT = url.port || "54329";
    process.env.DB_USERNAME = url.username || "life_medusa_test";
    process.env.DB_PASSWORD = url.password || "life_medusa_test_password";
    process.env.DB_NAME = url.pathname.replace(/^\//, "") || "life_medusa_test";
    process.env.DB_WAITINGROOM_DATABASE = "postgres";
  } catch (_e) {
    // fallback
  }
}
