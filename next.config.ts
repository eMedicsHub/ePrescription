import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mlc-ai/web-llm"],
  turbopack: {},
};

export default nextConfig;
