import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (embedded dev DB) and postgres.js ship native/wasm bits that
  // don't survive webpack bundling — run them as real Node dependencies.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
