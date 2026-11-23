import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  output: process.env.NEXT_STATIC_EXPORT === "1" ? "export" : undefined,
  trailingSlash: true,
};

export default nextConfig;
