import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  // Solver HiGHS memakai berkas .wasm: jangan di-bundle, dan sertakan di output serverless (Vercel).
  serverExternalPackages: ["highs"],
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/highs/build/*.wasm"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
