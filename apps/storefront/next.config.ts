import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const storefrontDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(storefrontDirectory, "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: repositoryRoot,
  },
};

export default nextConfig;
